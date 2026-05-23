import organizationService from './service.js';
import AppError from '../../utils/AppError.js';
import asyncHandler from '../../utils/asyncHandler.js';

/**
 * ORGANIZATIONS MODULE - TENANT PIPELINE MIDDLEWARES (middleware.js)
 * Responsibility: Implements dynamic tenant resolving and feature flag checking.
 * Binds active organization documents to request scopes and enforces strict
 * workspace status validations (ACTIVE, SUSPENDED, TRIAL_EXPIRED).
 */

/**
 * Tenant Resolver Middleware
 * Automatically extracts the active tenant workspace using the X-Tenant-Code header
 * or falling back to the authenticated user's organization partition scope.
 */
export const resolveTenant = asyncHandler(async (req, res, next) => {
  let tenantCode = req.headers['x-tenant-code'];

  // Fallback: If no code is explicitly sent in headers, attempt to resolve from user authentication scope
  if (!tenantCode && req.user && req.organizationId) {
    const org = await organizationService.getOrganizationById(req.organizationId);
    req.tenant = org;
    return next();
  }

  if (!tenantCode) {
    // If not authenticated and no header provided, allow routing to next (e.g. public endpoints)
    return next();
  }

  // Resolve using provided header code
  const org = await organizationService.validateOrganizationCode(tenantCode);
  
  // Establish Tenant Scope Context
  req.tenant = org;
  req.organizationId = org._id.toString();

  next();
});

/**
 * Tenant Isolation Guard Middleware
 * Rejects requests if no tenant workspace context has been resolved.
 */
export const enforceTenantContext = (req, res, next) => {
  if (!req.tenant || !req.organizationId) {
    return next(new AppError('Multi-tenant context is required. Please supply a valid [X-Tenant-Code] header.', 400));
  }
  next();
};

/**
 * Organization Feature Flag Guard
 * Restricts access to specific endpoints unless the tenant has the designated feature toggled on.
 * 
 * Example:
 * router.post('/ai/sprint-summary', protect, checkFeatureFlag('hasAIEnabled'), aiController.summarize);
 */
export const checkFeatureFlag = (flagName) => {
  return (req, res, next) => {
    if (!req.tenant) {
      return next(new AppError('Tenant workspace partition context is required to evaluate features.', 400));
    }

    const isFeatureEnabled = req.tenant.featureFlags && req.tenant.featureFlags[flagName] === true;
    if (!isFeatureEnabled) {
      return next(
        new AppError(`Feature [${flagName}] is not enabled for your organization's subscription tier.`, 403)
      );
    }

    next();
  };
};
