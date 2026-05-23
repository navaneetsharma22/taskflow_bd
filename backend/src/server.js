import app from './app.js';
import config from './config/index.js';
import { connectDatabase, disconnectDatabase } from './database/index.js';
import rbacService from './modules/rbac/service.js';
import logger from './utils/logger.js';
import { initSocket } from './socket/index.js';
import cacheManager from './utils/cache.js';
import queueSystemManager from './queues/manager.js';

/**
 * SRC DIRECTORY - SERVER STARTUP & ENTRY POINT (server.js)
 * Responsibility: Starts the HTTP server, handles DB initializations, 
 * registers system lifecycle processes (uncaught exceptions, unhandled rejections),
 * seeds default dynamic RBAC rules, and implements seamless graceful shutdowns.
 */

// ==========================================
// 1. Uncaught Exception Handler
// ==========================================
process.on('uncaughtException', (err) => {
  logger.error('CRITICAL: Uncaught Exception intercepted! Shutting down system immediately...');
  logger.error(err.stack || err.message);
  
  // Terminate processing to avoid unstable memory states
  process.exit(1);
});

// Initialize MongoDB Connection first
let server;

const startServer = async () => {
  try {
    // Establish persistence channel before listening for traffic
    await connectDatabase();

    // Auto seed default system privileges and roles mappings
    await rbacService.seedDefaultRbacData();

    const PORT = config.port;

    server = app.listen(PORT, () => {
      logger.info(`⚡ [TaskFlow Server]: Running on port ${PORT} in [${config.env}] environment`);
    });

    // Initialize WebSockets infrastructure attached to HTTP server instance
    initSocket(server);

  } catch (err) {
    logger.error(`CRITICAL: Server initialization failed: ${err.message}`);
    process.exit(1);
  }
};

startServer();

// ==========================================
// 2. Unhandled Promise Rejections
// ==========================================
process.on('unhandledRejection', (err) => {
  logger.error('CRITICAL: Unhandled Promise Rejection intercepted! Initiating graceful shutdown...');
  logger.error(err.stack || err.message);

  if (server) {
    server.close(async () => {
      try {
        await disconnectDatabase();
        await cacheManager.close();
        await queueSystemManager.close();
      } catch (shutdownErr) {
        logger.error(`CRITICAL: Error during unhandled promise rejection shutdown: ${shutdownErr.message}`);
      } finally {
        process.exit(1);
      }
    });
  } else {
    process.exit(1);
  }
});

// ==========================================
// 3. Graceful Shutdown Framework
// ==========================================
const handleGracefulShutdown = (signal) => {
  logger.warn(`SYSTEM EVENT: Received [${signal}] signal. Terminating server traffic gracefully...`);

  if (server) {
    server.close(async () => {
      try {
        logger.info('HTTP: Outgoing requests processed. Closing database connection...');
        await disconnectDatabase();
        
        logger.info('SYSTEM: Closing Redis cache manager connection...');
        await cacheManager.close();

        logger.info('SYSTEM: Closing BullMQ queue connections...');
        await queueSystemManager.close();

        logger.info('SYSTEM: Graceful shutdown cycle complete. Bye!');
        process.exit(0);
      } catch (err) {
        logger.error(`CRITICAL: Error during graceful shutdown execution: ${err.message}`);
        process.exit(1);
      }
    });

    // Forcefully shut down if processes hang past safety threshold
    setTimeout(() => {
      logger.error('CRITICAL: Shutdown timed out. Enforcing immediate termination!');
      process.exit(1);
    }, 15000); // 15 seconds grace period
  } else {
    process.exit(0);
  }
};

// Catch termination signals
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
