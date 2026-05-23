import mongoose from 'mongoose';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * DATABASE DIRECTORY - MONGO CONNECTION LAYER (mongodb.js)
 * Responsibility: Implements an enterprise-grade Singleton connection manager
 * for MongoDB using Mongoose. Includes exponential backoff retry mechanisms,
 * comprehensive socket telemetry listeners, production performance optimizations,
 * and elegant graceful teardown hook listeners (SIGINT/SIGTERM).
 */

class MongoDBManager {
  constructor() {
    this.connection = null;
    this.retryCount = 0;
    this.maxRetries = 5;
    this.baseDelayMs = 2000; // 2 seconds base retry delay
    this.isShuttingDown = false;
  }

  /**
   * Initializes the MongoDB Singleton instance using optimized production configurations.
   */
  async connect() {
    if (this.connection) {
      logger.warn('MongoDB: Connection already exists. Returning Singleton instance.');
      return this.connection;
    }

    const { uri } = config.db;

    // Production Performance Optimizations
    const mongooseOptions = {
      maxPoolSize: 10,                 // Maintains up to 10 parallel socket channels
      minPoolSize: 2,                  // Keeps at least 2 persistent connections open
      socketTimeoutMS: 45000,          // Terminates dead sockets after 45 seconds
      serverSelectionTimeoutMS: 5000,  // Fails fast (5s) if cluster is unreachable
      heartbeatFrequencyMS: 10000,     // Regularly monitor node health
      autoIndex: config.env === 'development', // Auto build schemas indexes in dev; disable in prod for performance
    };

    // Configure Mongoose standards
    mongoose.set('strictQuery', true);

    this._setupEventListeners();

    return this._connectWithRetry(uri, mongooseOptions);
  }

  /**
   * Internal recursive handler executing exponential backoff retries.
   */
  async _connectWithRetry(uri, options) {
    try {
      this.connection = await mongoose.connect(uri, options);
      this.retryCount = 0; // Reset retries on successful connection
      return this.connection;
    } catch (error) {
      if (this.isShuttingDown) return;

      this.retryCount++;
      logger.error(`MongoDB: Connection attempt [${this.retryCount}/${this.maxRetries}] failed. Error: ${error.message}`);

      if (this.retryCount >= this.maxRetries) {
        logger.error('MongoDB: Maximum connection retry threshold reached. Crashing bootstrap process.');
        process.exit(1);
      }

      // Calculate exponential backoff: delay = baseDelay * (2 ^ attempt)
      const delay = this.baseDelayMs * Math.pow(2, this.retryCount - 1);
      logger.info(`MongoDB: Scheduling connection retry in ${delay}ms...`);
      
      await new Promise((resolve) => setTimeout(resolve, delay));
      return this._connectWithRetry(uri, options);
    }
  }

  /**
   * Registers telemetric event listeners on the database instance.
   */
  _setupEventListeners() {
    mongoose.connection.on('connecting', () => {
      logger.info('MongoDB: Establishing persistence connection channel...');
    });

    mongoose.connection.on('connected', () => {
      logger.info('MongoDB: Persistent connection successfully created.');
    });

    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB: Connection socket error event: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      if (!this.isShuttingDown) {
        logger.warn('MongoDB: Connection disconnected unexpectedly. Attempting automatic reconnection...');
      } else {
        logger.info('MongoDB: Connection disconnected via graceful shutdown.');
      }
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB: Successfully reestablished connection.');
    });

    mongoose.connection.on('close', () => {
      logger.warn('MongoDB: Connection closed.');
    });
  }

  /**
   * Gracefully shuts down the Mongoose socket connectionpool.
   */
  async disconnect() {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    logger.warn('MongoDB: Initiating graceful teardown of connection pool...');
    try {
      await mongoose.disconnect();
      this.connection = null;
      logger.info('MongoDB: Connection pool closed successfully.');
    } catch (error) {
      logger.error(`MongoDB: Error encountered during disconnection: ${error.message}`);
      throw error;
    }
  }

  /**
   * Hooks process signals to ensure direct graceful teardown.
   */
  handleProcessSignals() {
    const shutdownSignals = ['SIGINT', 'SIGTERM'];

    shutdownSignals.forEach((signal) => {
      process.on(signal, async () => {
        logger.warn(`MongoDB: Process received [${signal}]. Initiating connection lifecycle teardown...`);
        try {
          await this.disconnect();
          logger.info(`MongoDB: Graceful cleanup for [${signal}] finalized.`);
          // Let the parent process exit standard code
        } catch (err) {
          logger.error('MongoDB: Failures occurred during signal teardown.');
          process.exit(1);
        }
      });
    });
  }
}

// Export singleton instance
const mongodb = new MongoDBManager();
export default mongodb;
