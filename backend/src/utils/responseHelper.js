/**
 * UTILS DIRECTORY - RESPONSE HELPERS (responseHelper.js)
 * Responsibility: Standardizes HTTP response structures across all TaskFlow APIs.
 * Guarantees a unified JSON structure (success, message, data, meta) to simplify
 * consumption by front-end clients and API integrators.
 */

/**
 * Standard Success API Response
 * @param {Object} res - Express response object
 * @param {string} message - Descriptive success message
 * @param {Object|Array} data - Payload data object or array
 * @param {number} statusCode - HTTP response code (default 200)
 */
export const successResponse = (res, message, data = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta: {}, // Unified payload matching requirements
  });
};

/**
 * Standardized Error API Response
 * @param {Object} res - Express response object
 * @param {string} message - Descriptive error message
 * @param {number} statusCode - HTTP response code (default 500)
 * @param {Object|Array|null} errors - Array or object of error details (e.g., fields validation)
 */
export const errorResponse = (res, message, statusCode = 500, errors = null) => {
  const payload = {
    success: false,
    message,
    data: {},
    meta: {},
  };

  if (errors) {
    payload.errors = errors;
  }

  return res.status(statusCode).json(payload);
};

/**
 * Standardized Pagination API Response
 * @param {Object} res - Express response object
 * @param {string} message - Descriptive success message
 * @param {Array} data - Paginated list of resources
 * @param {number} page - Current requested page number
 * @param {number} limit - Number of elements per page
 * @param {number} total - Total records in database
 * @param {number} statusCode - HTTP status code (default 200)
 */
export const paginationResponse = (res, message, data, page, limit, total, statusCode = 200) => {
  const currentPage = parseInt(page, 10) || 1;
  const currentLimit = parseInt(limit, 10) || 10;
  const totalRecords = parseInt(total, 10) || 0;
  const totalPages = Math.ceil(totalRecords / currentLimit) || 1;

  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta: {
      currentPage,
      limit: currentLimit,
      totalRecords,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
    },
  });
};
