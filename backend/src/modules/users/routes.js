import express from 'express';
import validate from '../../validators/validate.js';
import * as userController from './controller.js';
import { protect } from '../auth/middleware.js';
import { checkPermission } from '../rbac/middleware.js';
import { resolveTenant } from '../organizations/middleware.js';
import {
  validateCreateUser,
  validateUpdateUser,
  validateImportCSV,
} from './validator.js';

/**
 * USERS MODULE - ENDPOINTS ROUTER (routes.js)
 * Responsibility: Outlines routes endpoints for User profiles,
 * binding security guards, tenant resolvers, and payload Joi validators.
 */

const router = express.Router();

// Apply core authentication and tenant workspace resolution filters across all routes
router.use(protect);
router.use(resolveTenant);

// 1. Profile Lists & Creations
router.route('/')
  .get(userController.listUsers) // View team list inside tenant workspace
  .post(checkPermission('IMPORT_EMPLOYEES'), validate(validateCreateUser), userController.createUserProfile); // Add individual member

// 2. CSV Bulk Imports
router.post('/import-csv', checkPermission('IMPORT_EMPLOYEES'), validate(validateImportCSV), userController.importUsersBulk);

// 3. User Details Configurations & Status Transitions
router.route('/:id')
  .get(userController.getUserProfile)
  .put(validate(validateUpdateUser), userController.updateUserProfile);

router.post('/:id/disable', checkPermission('MANAGE_ORGANIZATION'), userController.disableUserAccount);
router.post('/:id/enable', checkPermission('MANAGE_ORGANIZATION'), userController.enableUserAccount);

export default router;
