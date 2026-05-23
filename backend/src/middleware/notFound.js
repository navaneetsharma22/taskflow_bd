import AppError from '../utils/AppError.js';

/**
 * MIDDLEWARE DIRECTORY - 404 PATH NOT FOUND HANDLER
 * Responsibility: Catches requests directed to endpoints/routes that do not exist,
 * wrapping them in an operational 404 AppError and passing them to the global error middleware.
 */
const notFoundHandler = (req, res, next) => {
  next(new AppError(`Requested resource [${req.method}] ${req.originalUrl} was not found on this server.`, 404));
};

export default notFoundHandler;
