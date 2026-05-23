import logger from '../utils/logger.js';

/**
 * MIDDLEWARE DIRECTORY - HTTP REQUEST LOGGER
 * Responsibility: Intercepts all incoming HTTP calls and logs the HTTP Verb,
 * Target Endpoint, and remote IP address.
 */

const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Hook response completion to log duration and response status code
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http(
      `[HTTP] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms) - IP: ${req.ip}`
    );
  });

  next();
};

export default requestLogger;
