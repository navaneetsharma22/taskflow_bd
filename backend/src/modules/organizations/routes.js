import express from 'express';
import validate from '../../validators/validate.js';
import * as orgController from './controller.js';
import { protect, restrictTo } from '../auth/middleware.js';
import { checkPermission } from '../rbac/middleware.js';
import { resolveTenant } from './middleware.js';
import {
  validateUpdateSettings,
  validateUpdateFeatureFlags,
} from './validator.js';
import { ROLES } from '../../constants/index.js';

/**
 * ORGANIZATIONS MODULE - ENDPOINTS ROUTER (routes.js)
 * Responsibility: Outlines routes endpoints for Tenant workspace configurations,
 * binding security guards, tenant resolvers, and payloads validators.
 */

const router = express.Router();

// Apply core authentication and tenant workspace resolution filters across all routes
router.use(protect);
router.use(resolveTenant);

// 1. Settings management (Requires MANAGE_ORGANIZATION permission)
router.route('/settings')
  .get(checkPermission('MANAGE_ORGANIZATION'), orgController.getSettings)
  .put(checkPermission('MANAGE_ORGANIZATION'), validate(validateUpdateSettings), orgController.updateSettings);

// 2. Feature Flags management
router.route('/features')
  .get(orgController.getFeatureFlags) // All authenticated members can check active flags
  .put(restrictTo(ROLES.SUPER_ADMIN), validate(validateUpdateFeatureFlags), orgController.updateFeatureFlags); // Only Super Admin modifies flags

export default router;
