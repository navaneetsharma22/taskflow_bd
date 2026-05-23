import mongoose from 'mongoose';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * DATABASE DIRECTORY - DATABASE CONNECTION MANAGER
 * Responsibility: Manages connection to MongoDB via Mongoose.
 * Handles lifecycle events (connecting, connected, error, disconnected) and provides
 * graceful connection teardowns.
 */

const connectDatabase = async () => {
  const { uri, options } = config.db;

  // Set Mongoose configurations
  mongoose.set('strictQuery', true);

  // Connection Event Handlers
  mongoose.connection.on('connecting', () => {
    logger.info('MongoDB: Attempting connection...');
  });

  mongoose.connection.on('connected', () => {
    logger.info('MongoDB: Connection established successfully.');
  });

  mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB: Connection error details: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB: Connection disconnected.');
  });

  try {
    await mongoose.connect(uri, options);
  } catch (error) {
    logger.error(`MongoDB: Initial connection failure: ${error.message}`);
    // Let the main server starter handle crashes or retries
    throw error;
  }
};

const disconnectDatabase = async () => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB: Disconnected successfully during teardown.');
  } catch (error) {
    logger.error(`MongoDB: Error while disconnecting: ${error.message}`);
  }
};

export { connectDatabase, disconnectDatabase };
