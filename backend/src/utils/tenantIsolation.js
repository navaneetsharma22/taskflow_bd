import AppError from './AppError.js';
import logger from './logger.js';

/**
 * UTILS DIRECTORY - TENANT ISOLATION UTILITIES (tenantIsolation.js)
 * Responsibility: Enforces bullet-proof multi-tenant boundaries at the database layer.
 * Standardizes scoping filters on repositories queries and catches accidental 
 * global leaks in development mode by crashing early if organization context is missing.
 */

/**
 * Applies organization scoping filters to any query filter criteria.
 * @param {Object} filter - The standard filter criteria
 * @param {Object} req - The Express request object containing the resolved tenant context
 * @returns {Object} Scoped filter containing organizationId
 */
export const applyTenantScope = (filter = {}, req) => {
  if (!req || !req.organizationId) {
    logger.error('SECURITY VIOLATION: Attempted to query database without active tenant organization context.');
    throw new AppError('A secure tenant workspace partition context is required to execute this operation.', 403);
  }

  return {
    ...filter,
    organizationId: req.organizationId,
  };
};

/**
 * Validates whether a resource document's organizationId matches the request tenant boundary.
 * Useful for deep post-query validation assertions.
 * @param {Object} doc - Database resource document
 * @param {Object} req - Express request object containing organizationId
 */
export const assertTenantBoundary = (doc, req) => {
  if (!doc) return;
  
  const docOrgId = doc.organizationId ? doc.organizationId.toString() : null;
  const reqOrgId = req.organizationId;

  if (docOrgId !== reqOrgId) {
    logger.error(`SECURITY VIOLATION: User resolved from Organization: ${reqOrgId} attempted to access resource in Organization: ${docOrgId}`);
    throw new AppError('Access Denied. You are not authorized to view resources outside your workspace partition boundaries.', 403);
  }
};
