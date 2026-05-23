import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import logger from '../utils/logger.js';
import config from '../config/index.js';

/**
 * QUEUE SYSTEM MODULE - CORE MANAGER (manager.js)
 * Responsibility: Manages BullMQ Redis queues, worker lifecycles,
 * isolated execution pools, retries backoff, and failed job trackings.
 * Features an intelligent Local Mock Fallback to ensure operations continue
 * if Redis is not locally active in the host environment.
 */
class QueueSystemManager {
  constructor() {
    this.redisUrl = config.redis.url;
    this.redisConnection = null;
    this.isMockActive = false;
    this.queues = {};
    this.workers = {};
    this.failedJobsRegistry = []; // Live administrative tracking list for failed jobs
    this.maxFailedJobsSize = 1000; // Cap registry to prevent unbounded memory growth

    this.initializeConnection();
  }

  /**
   * Initializes connection to the Redis server with dynamic mock fallbacks
   */
  initializeConnection() {
    try {
      logger.info(`[TaskFlow Queues]: Wires connection to Redis: ${this.redisUrl}`);
      
      this.redisConnection = new Redis(this.redisUrl, {
        maxRetriesPerRequest: null, // Essential setting for BullMQ compliance
        enableReadyCheck: false,
        connectTimeout: 5000,
      });

      this.redisConnection.on('error', (err) => {
        if (!this.isMockActive) {
          logger.warn(`[TaskFlow Queues]: Redis Connection dropped: ${err.message}. Activating Local In-Memory Mock Queue Fallback.`);
          this.isMockActive = true;
        }
      });

      this.redisConnection.on('connect', () => {
        logger.info('⚡ [TaskFlow Queues]: Successfully connected to Redis Server.');
        this.isMockActive = false;
      });

    } catch (err) {
      logger.error(`[TaskFlow Queues]: Failed to bind Redis Client. Error: ${err.message}`);
      this.isMockActive = true;
    }
  }

  /**
   * Registers a new isolated queue and assigns its processing Worker.
   */
  registerQueue(queueName, processorFn) {
    if (this.isMockActive) {
      logger.info(`[TaskFlow Queues]: Registered Mock In-Memory Queue: [${queueName}]`);
      this.queues[queueName] = {
        add: async (jobName, data, options = {}) => {
          this.addMockJob(queueName, jobName, data, options, processorFn);
        }
      };
      return;
    }

    try {
      // 1. Establish BullMQ Queue
      const queue = new Queue(queueName, {
        connection: this.redisConnection,
        defaultJobOptions: {
          attempts: 3, // Retry attempts bounds
          backoff: {
            type: 'exponential', // Exponential backoff retries
            delay: 2000, // delay multiplier (2s, 4s, 8s...)
          },
          removeOnComplete: { count: 100 }, // Clean up completed tracking logs
          removeOnFail: { count: 500 },
        }
      });

      // 2. Establish Isolated Processor Worker
      const worker = new Worker(queueName, async (job) => {
        logger.info(`[Queue Worker]: Isolated Worker starting Job [${job.id}] inside Queue [${queueName}]`);
        return processorFn(job.data);
      }, {
        connection: this.redisConnection,
        concurrency: 5, // Concurrent job processes per worker
      });

      // 3. Setup Failed Job Tracking Event Listeners
      queue.on('error', (err) => {
        if (!this.isMockActive) {
          logger.warn(`[TaskFlow Queues]: Queue [${queueName}] connection warning: ${err.message}. Mock fallback active.`);
          this.isMockActive = true;
        }
      });

      worker.on('error', (err) => {
        if (!this.isMockActive) {
          logger.warn(`[TaskFlow Queues]: Worker [${queueName}] connection warning: ${err.message}. Mock fallback active.`);
          this.isMockActive = true;
        }
      });

      worker.on('failed', (job, err) => {
        const failureLog = {
          jobId: job ? job.id : 'unknown',
          queueName,
          jobName: job ? job.name : 'unknown',
          data: job ? job.data : {},
          failedReason: err.message,
          timestamp: new Date(),
          stack: err.stack,
        };

        this.failedJobsRegistry.push(failureLog);
        // Cap the registry to prevent unbounded memory growth
        if (this.failedJobsRegistry.length > this.maxFailedJobsSize) {
          this.failedJobsRegistry = this.failedJobsRegistry.slice(-this.maxFailedJobsSize);
        }
        logger.error(`🚨 [Queue Worker Alert]: Job [${failureLog.jobId}] failed inside Queue [${queueName}]! Reason: ${err.message}`);
      });

      worker.on('completed', (job) => {
        logger.info(`[Queue Worker]: Job [${job.id}] completed successfully inside Queue [${queueName}]`);
      });

      this.queues[queueName] = queue;
      this.workers[queueName] = worker;

      logger.info(`⚡ [TaskFlow Queues]: Isolated Queue & Worker registered successfully: [${queueName}]`);
    } catch (err) {
      logger.error(`[TaskFlow Queues]: Failed to register Queue [${queueName}]. Falling back to Mock: ${err.message}`);
      this.isMockActive = true;
      this.registerQueue(queueName, processorFn);
    }
  }

  /**
   * Helper: Adds and processes a job using the simulated Local In-Memory Fallback engine
   */
  async addMockJob(queueName, jobName, data, options, processorFn) {
    const jobId = Math.random().toString(36).substring(7);
    logger.info(`[Mock Queue]: Job [${jobId}] added to Queue [${queueName}] (Mock Async Execution)`);

    const maxAttempts = options.attempts || 3;
    let attempt = 0;
    let success = false;

    // Execute job asynchronously outside the active caller thread
    const executeAttempt = async () => {
      attempt++;
      try {
        logger.info(`[Mock Worker]: Attempt ${attempt}/${maxAttempts} for Job [${jobId}] inside Queue [${queueName}]`);
        await processorFn(data);
        success = true;
        logger.info(`[Mock Worker]: Job [${jobId}] completed successfully inside Queue [${queueName}]`);
      } catch (err) {
        logger.error(`[Mock Worker]: Attempt ${attempt} failed for Job [${jobId}]. Error: ${err.message}`);
        
        if (attempt < maxAttempts) {
          const delay = Math.pow(2, attempt) * 1000; // Simulate exponential backoff delay
          logger.info(`[Mock Worker]: Retrying Job [${jobId}] in ${delay}ms...`);
          setTimeout(executeAttempt, delay);
        } else {
          // Record to failed registry
          const failureLog = {
            jobId,
            queueName,
            jobName,
            data,
            failedReason: err.message,
            timestamp: new Date(),
            stack: err.stack,
          };
          this.failedJobsRegistry.push(failureLog);
        // Cap the registry to prevent unbounded memory growth
        if (this.failedJobsRegistry.length > this.maxFailedJobsSize) {
          this.failedJobsRegistry = this.failedJobsRegistry.slice(-this.maxFailedJobsSize);
        }
          logger.error(`🚨 [Mock Worker Alert]: Job [${jobId}] completely failed after ${maxAttempts} attempts inside Queue [${queueName}]!`);
        }
      }
    };

    // Trigger non-blocking async execution
    setTimeout(executeAttempt, 50);
  }

  /**
   * Retrieves failed job logs registry for administration view
   */
  getFailedJobs() {
    return this.failedJobsRegistry;
  }

  /**
   * Clears registry logs
   */
  clearFailedJobsRegistry() {
    this.failedJobsRegistry = [];
  }

  /**
   * Gracefully shuts down workers, queues, and connections
   */
  async close() {
    logger.info('[TaskFlow Queues]: Initiating graceful shutdown of queues and workers...');
    
    // Close all workers
    const workerPromises = Object.entries(this.workers).map(async ([name, worker]) => {
      try {
        await worker.close();
        logger.info(`[TaskFlow Queues]: Worker for queue [${name}] closed successfully.`);
      } catch (err) {
        logger.error(`[TaskFlow Queues]: Error closing worker for queue [${name}]: ${err.message}`);
      }
    });
    await Promise.all(workerPromises);

    // Close all queues
    const queuePromises = Object.entries(this.queues).map(async ([name, queue]) => {
      // Mock queues don't have .close method
      if (queue && typeof queue.close === 'function') {
        try {
          await queue.close();
          logger.info(`[TaskFlow Queues]: Queue [${name}] closed successfully.`);
        } catch (err) {
          logger.error(`[TaskFlow Queues]: Error closing queue [${name}]: ${err.message}`);
        }
      }
    });
    await Promise.all(queuePromises);

    // Close primary redis connection
    if (this.redisConnection) {
      try {
        await this.redisConnection.quit();
        logger.info('[TaskFlow Queues]: Redis queue connection closed gracefully.');
      } catch (err) {
        logger.error(`[TaskFlow Queues]: Error closing Redis connection: ${err.message}`);
      }
    }
  }
}

export default new QueueSystemManager();
