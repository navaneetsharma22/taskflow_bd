import rbacService from './service.js';
import AppError from '../../utils/AppError.js';
import asyncHandler from '../../utils/asyncHandler.js';

/**
 * RBAC MODULE - SECURE ENFORCEMENT MIDDLEWARES (middleware.js)
 * Responsibility: Outlines Express filters intercepting requests to enforce:
 *   1. Dynamic Permission checks (database-driven privilege lookups).
 *   2. Tenant-Isolated overrides (evaluating boundaries based on req.organizationId).
 *   3. Dynamic permissions caching context inside request threads.
 */

/**
 * Checks if the current authenticated user belongs to allowed role structures.
 * (Facilitates quick static checks)
 */
export const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Access denied. Authentication context is missing.', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('Access denied. You do not hold required administrative privileges.', 403));
    }

    next();
  };
};

/**
 * Enterprise Dynamic Permission Guard Middleware
 * Resolves permissions dynamically from mapped DB records under active Tenant context.
 * 
 * Example Usage inside routes:
 * router.delete('/projects/:id', protect, checkPermission('DELETE_PROJECT'), projectController.delete);
 */
export const checkPermission = (requiredPermission) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user || !req.organizationId) {
      throw new AppError('Access denied. Security context partition is missing.', 401);
    }

    const { role } = req.user;
    const tenantId = req.organizationId;

    // Dynamic Permission Loading: Queries mapped role permissions in current tenant scope
    const loadedPermissions = await rbacService.loadPermissions(role, tenantId);

    // Attach loaded permissions to request context for telemetry and view logic integration
    req.user.permissions = loadedPermissions;

    const hasPrivilege = loadedPermissions.includes(requiredPermission.toUpperCase());
    if (!hasPrivilege) {
      throw new AppError(`Access denied. Your role [${role}] lacks required permission: '${requiredPermission}'.`, 403);
    }

    next();
  });
};

/**
 * Feature Access Middleware
 * Evaluates access bounds for dynamic system features. 
 * Maps directly into permission sets, enabling clean feature-toggling controls.
 */
export const checkFeatureAccess = (requiredFeaturePermission) => {
  return checkPermission(requiredFeaturePermission);
};
