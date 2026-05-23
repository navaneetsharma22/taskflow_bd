/**
 * UTILS DIRECTORY - APPERROR COMPONENT (AppError.js)
 * Responsibility: Centralized custom error utility class.
 * Allows defining HTTP status codes and optional arrays of validation failures.
 * Distinguishes operational (expected runtime issues) from programmer/system crashes.
 */
class AppError extends Error {
  /**
   * AppError Constructor
   * @param {string} message - Descriptive error message
   * @param {number} statusCode - HTTP status code
   * @param {Array|Object|null} errors - Details of specific errors (like field validation)
   */
  constructor(message, statusCode, errors = null) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
