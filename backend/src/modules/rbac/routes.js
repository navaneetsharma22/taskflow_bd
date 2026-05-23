import express from 'express';
import validate from '../../validators/validate.js';
import * as rbacController from './controller.js';
import { protect } from '../auth/middleware.js';
import { checkPermission } from './middleware.js';
import { resolveTenant } from '../organizations/middleware.js';
import {
  validateCreateRole,
  validateUpdateRole,
  validateAssignRole,
} from './validator.js';

/**
 * RBAC MODULE - ENDPOINTS ROUTER (routes.js)
 * Responsibility: Outlines routes endpoints for Role Configuration Management
 * and Role Assignments, binding Joi validators and dynamic permission guards.
 */

const router = express.Router();

// Apply core authentication and tenant workspace resolution filters across all routes
router.use(protect);
router.use(resolveTenant);

// 1. Assign Role to User (Requires MANAGE_ORGANIZATION administrative permission)
router.post('/assign', checkPermission('MANAGE_ORGANIZATION'), validate(validateAssignRole), rbacController.assignRoleToUser);

// 2. Custom Role management
router.route('/')
  .get(rbacController.listRoles) // All authenticated workspace members can see roles
  .post(checkPermission('MANAGE_ORGANIZATION'), validate(validateCreateRole), rbacController.createCustomRole);

router.route('/:id')
  .put(checkPermission('MANAGE_ORGANIZATION'), validate(validateUpdateRole), rbacController.updateCustomRole)
  .delete(checkPermission('MANAGE_ORGANIZATION'), rbacController.deleteCustomRole);

export default router;
