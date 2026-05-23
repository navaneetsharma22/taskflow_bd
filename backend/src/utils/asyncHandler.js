/**
 * UTILS DIRECTORY - ASYNCHANDLER COMPONENT
 * Responsibility: Higher-order function utility that catches asynchronous errors 
 * in route handlers and forwards them to the global Express error handling middleware.
 * Eliminates redundant try-catch blocks in Express controllers.
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

export default asyncHandler;
