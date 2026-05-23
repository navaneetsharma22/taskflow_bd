/**
 * UTILS DIRECTORY - APPERROR COMPONENT
 * Responsibility: Centralized custom error utility class.
 * Allows defining HTTP status codes and identifying if an error is operational (expected runtime error)
 * vs a programmer/system crash error.
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
