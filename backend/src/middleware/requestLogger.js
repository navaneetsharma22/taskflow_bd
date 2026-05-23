import crypto from 'crypto';
import logger from '../utils/logger.js';

/**
 * MIDDLEWARE DIRECTORY - HTTP REQUEST LOGGER
 * Responsibility: Intercepts all incoming HTTP calls and logs the HTTP Verb,
 * Target Endpoint, remote IP address, and unique request correlation ID
 * for precise log tracing in production environments.
 */

const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Generate unique request correlation ID for distributed log tracing
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  // Hook response completion to log duration and response status code
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http(
      `[HTTP] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms) - IP: ${req.ip} - ReqID: ${requestId}`
    );
  });

  next();
};

export default requestLogger;

