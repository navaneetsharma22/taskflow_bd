import config from '../config/index.js';
import logger from '../utils/logger.js';
import { errorResponse } from '../utils/responseHelper.js';

/**
 * MIDDLEWARE DIRECTORY - GLOBAL ERROR INTERCEPTOR (errorMiddleware.js)
 * Responsibility: Intercepts all failed execution promises or thrown errors,
 * formats them based on the runtime environment, handles database specific and JWT errors,
 * and structures consistent JSON responses via the standard errorResponse helper.
 */

const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Internal Server Error';

  // Log detailed telemetry information regarding the error
  logger.error(`Error Intercepted: [${req.method}] ${req.originalUrl} - ${err.message}`, err);

  if (config.env === 'development') {
    // Development Mode: Expose maximum debugging details and call stacks
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      data: {},
      meta: {},
      error: err,
      stack: err.stack,
    });
  }

  // ==========================================
  // Production Mode: Standardized Safe Outputs
  // ==========================================

  // 1. Mongoose Database Cast Error (e.g. invalid MongoDB Object ID)
  if (err.name === 'CastError') {
    return errorResponse(
      res, 
      `Invalid query identifier for field '${err.path}': "${err.value}".`, 
      400
    );
  }

  // 2. MongoDB Duplicate Entry Error (Conflict - 409)
  if (err.code === 11000) {
    const duplicateField = Object.keys(err.keyValue)[0];
    const duplicateValue = err.keyValue[duplicateField];
    return errorResponse(
      res, 
      `Conflict detected: The value '${duplicateValue}' for field '${duplicateField}' already exists.`, 
      409,
      { [duplicateField]: 'Value must be unique.' }
    );
  }

  // 3. Mongoose Validation Constraints Errors (Bad Request - 400)
  if (err.name === 'ValidationError') {
    const structuredErrors = {};
    Object.values(err.errors).forEach((el) => {
      structuredErrors[el.path] = el.message;
    });
    return errorResponse(
      res, 
      'Input parameters failed database schema constraints validations.', 
      400, 
      structuredErrors
    );
  }

  // 4. JWT Authentication Signature Invalid (Unauthorized - 401)
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(
      res, 
      'Authentication signature validation failed. Access token is invalid.', 
      401
    );
  }

  // 5. JWT Authentication Expiry (Unauthorized - 401)
  if (err.name === 'TokenExpiredError') {
    return errorResponse(
      res, 
      'Authentication session has expired. Please request a new token.', 
      401
    );
  }

  // 6. Custom Anticipated Operational Errors (AppError)
  if (err.isOperational) {
    return errorResponse(
      res, 
      err.message, 
      err.statusCode, 
      err.errors
    );
  }

  // 7. Unhandled Programmer/Platform Server Failures
  return errorResponse(
    res, 
    'A critical system processing error occurred. Please try again later.', 
    500
  );
};

export default globalErrorHandler;
