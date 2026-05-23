import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * MIDDLEWARE DIRECTORY - GLOBAL ERROR HANDLER
 * Responsibility: Catches all unhandled errors thrown inside Express controllers/routes,
 * formats them, and returns standardized JSON responses.
 * Protects server details in production by hiding stack traces and raw error messages.
 */

const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log all errors for transparency
  logger.error(`Error intercepted: [${req.method}] ${req.originalUrl} - ${err.message}`);

  if (config.env === 'development') {
    // Send full details including stack trace in development mode
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  } else {
    // Production Mode: Send clean messages without exposing system architecture
    
    // Mongoose Cast Error (e.g. invalid ObjectId format)
    if (err.name === 'CastError') {
      return res.status(400).json({
        status: 'fail',
        message: `Invalid format for field '${err.path}': ${err.value}.`,
      });
    }

    // Mongoose Duplicate Key Error (e.g. email already exists)
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(409).json({
        status: 'fail',
        message: `Duplicate resource error: '${field}' must be unique.`,
      });
    }

    // Mongoose Validation Error (Schema constraint violations)
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map((el) => el.message);
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid input parameters.',
        errors,
      });
    }

    // JWT Malformed or Expired
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'fail',
        message: 'Authentication failed. Signature is invalid.',
      });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'fail',
        message: 'Authentication session expired. Please re-authenticate.',
      });
    }

    // Operational errors that are anticipated and handled inside controllers
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }

    // Programmer/System errors: Do not leak details to users
    res.status(500).json({
      status: 'error',
      message: 'A critical processing issue occurred. Please try again later.',
    });
  }
};

export default globalErrorHandler;
