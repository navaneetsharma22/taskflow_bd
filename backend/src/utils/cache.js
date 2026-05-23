import Redis from 'ioredis';
import config from '../config/index.js';
import logger from './logger.js';

/**
 * CACHE SYSTEM MODULE - CACHE MANAGER (cache.js)
 * Responsibility: Manages Redis-backed key-value caching layers.
 * Implements standard GET, SET, DEL, and dynamic pattern purges.
 * Features an intelligent Local Mock Fallback Map (supporting TTL expirations)
 * to ensure caching operations remain functional if Redis is not active.
 */
class CacheManager {
  constructor() {
    this.redisUrl = config.redis.url;
    this.redisClient = null;
    this.isMockActive = false;
    
    // Local In-Memory TTL Cache Storage Map
    this.mockStore = new Map();

    this.initialize();

    // Periodic cleanup of expired mock cache entries to prevent memory leaks
    this._cleanupInterval = setInterval(() => this._cleanExpiredEntries(), 60000);
  }

  /**
   * Removes expired entries from the in-memory mock store
   */
  _cleanExpiredEntries() {
    if (!this.isMockActive || this.mockStore.size === 0) return;
    const now = Date.now();
    let purged = 0;
    for (const [key, item] of this.mockStore) {
      if (item.expiry && now > item.expiry) {
        this.mockStore.delete(key);
        purged++;
      }
    }
    if (purged > 0) {
      logger.debug(`[TaskFlow Cache]: Cleaned ${purged} expired mock cache entries.`);
    }
  }

  /**
   * Initializes Redis client and listens for drop events to activate fallbacks
   */
  initialize() {
    try {
      this.redisClient = new Redis(this.redisUrl, {
        connectTimeout: 3000,
        maxRetriesPerRequest: 1,
      });

      this.redisClient.on('error', (err) => {
        if (!this.isMockActive) {
          logger.warn(`[TaskFlow Cache]: Redis Connection failed: ${err.message}. Activating Local In-Memory Cache Fallback.`);
          this.isMockActive = true;
        }
      });

      this.redisClient.on('connect', () => {
        logger.info('⚡ [TaskFlow Cache]: Connected successfully to Redis Caching Server.');
        this.isMockActive = false;
      });

    } catch (err) {
      logger.error(`[TaskFlow Cache]: Redis Caching Client initialization failed: ${err.message}`);
      this.isMockActive = true;
    }
  }

  /**
   * Retrieves a parsed JSON value by key
   */
  async get(key) {
    if (this.isMockActive) {
      const item = this.mockStore.get(key);
      if (!item) return null;

      // Check for item TTL expiry
      if (item.expiry && Date.now() > item.expiry) {
        this.mockStore.delete(key);
        return null;
      }
      return item.value;
    }

    try {
      const data = await this.redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      logger.error(`[TaskFlow Cache]: GET key [${key}] failed: ${err.message}`);
      return null;
    }
  }

  /**
   * Stores a JSON value matching a target key with a designated TTL (seconds)
   */
  async set(key, value, ttlSeconds = 300) {
    if (this.isMockActive) {
      const expiry = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : null;
      this.mockStore.set(key, { value, expiry });
      return true;
    }

    try {
      const dataString = JSON.stringify(value);
      if (ttlSeconds) {
        await this.redisClient.setex(key, ttlSeconds, dataString);
      } else {
        await this.redisClient.set(key, dataString);
      }
      return true;
    } catch (err) {
      logger.error(`[TaskFlow Cache]: SET key [${key}] failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Deletes a single key from cache
   */
  async del(key) {
    if (this.isMockActive) {
      return this.mockStore.delete(key);
    }

    try {
      await this.redisClient.del(key);
      return true;
    } catch (err) {
      logger.error(`[TaskFlow Cache]: DEL key [${key}] failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Dynamically purges all keys matching a specific pattern (e.g. "tenant:orgId:dashboard:*")
   */
  async purgePattern(pattern) {
    logger.info(`[TaskFlow Cache]: Purging cache keys matching pattern: [${pattern}]`);
    
    if (this.isMockActive) {
      const escapedPattern = pattern.replace(/\*/g, '.*');
      const regex = new RegExp(`^${escapedPattern}$`);
      
      let purgeCount = 0;
      for (const key of this.mockStore.keys()) {
        if (regex.test(key)) {
          this.mockStore.delete(key);
          purgeCount++;
        }
      }
      logger.info(`[Mock Cache]: Successfully purged ${purgeCount} matching keys.`);
      return true;
    }

    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
        }
      } while (cursor !== '0');
      
      return true;
    } catch (err) {
      logger.error(`[TaskFlow Cache]: Pattern Purge failed for [${pattern}]. Error: ${err.message}`);
      return false;
    }
  }

  /**
   * Flushes/clears all stored keys entirely
   */
  async flushAll() {
    if (this.isMockActive) {
      this.mockStore.clear();
      logger.info('[Mock Cache]: Successfully flushed all in-memory keys.');
      return true;
    }

    try {
      await this.redisClient.flushall();
      logger.info('⚡ [TaskFlow Cache]: Successfully flushed all Redis database keys.');
      return true;
    } catch (err) {
      logger.error(`[TaskFlow Cache]: FlushAll execution failed. Error: ${err.message}`);
      return false;
    }
  }

  /**
   * Gracefully shuts down the cache manager client
   */
  async close() {
    clearInterval(this._cleanupInterval);
    if (this.redisClient) {
      try {
        await this.redisClient.quit();
        logger.info('[TaskFlow Cache]: Redis client connection closed gracefully.');
      } catch (err) {
        logger.error(`[TaskFlow Cache]: Error closing Redis connection: ${err.message}`);
      }
    }
  }
}

export default new CacheManager();
