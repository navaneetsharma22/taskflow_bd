import mongodb from './mongodb.js';

/**
 * DATABASE DIRECTORY - ENTRYPOINT (index.js)
 * Responsibility: Re-exports optimized singleton interfaces from mongodb.js.
 * Preserves backwards compatibility for system starters while utilizing the
 * robust, production-ready Singleton MongoDBManager.
 */

const connectDatabase = async () => {
  return mongodb.connect();
};

const disconnectDatabase = async () => {
  return mongodb.disconnect();
};

export { connectDatabase, disconnectDatabase, mongodb };
