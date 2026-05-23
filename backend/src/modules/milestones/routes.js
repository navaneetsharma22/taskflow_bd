import express from 'express';
import validate from '../../validators/validate.js';
import * as milestoneController from './controller.js';
import { protect } from '../auth/middleware.js';
import { checkPermission } from '../rbac/middleware.js';
import { resolveTenant } from '../organizations/middleware.js';
import {
  validateCreateMilestone,
  validateUpdateMilestone,
  validateLinkTasks,
} from './validator.js';

/**
 * MILESTONES MODULE - ENDPOINTS ROUTER (routes.js)
 * Responsibility: Outlines routes endpoints for Project Milestone management,
 * binding security guards, tenant resolvers, and payload Joi validators.
 */

const router = express.Router();

// Apply core authentication and tenant workspace resolution filters across all routes
router.use(protect);
router.use(resolveTenant);

// 1. Milestones Lists & Creations
router.route('/')
  .get(milestoneController.listMilestones)
  .post(checkPermission('EDIT_PROJECT'), validate(validateCreateMilestone), milestoneController.createMilestone);

// 2. Dynamic alerts telemetry (Must be placed before parametric resource routing!)
router.get('/alerts', milestoneController.getMilestoneAlerts);

// 3. Milestone Details, Modifications, and purging
router.route('/:id')
  .get(milestoneController.getMilestone)
  .put(checkPermission('EDIT_PROJECT'), validate(validateUpdateMilestone), milestoneController.updateMilestone)
  .delete(checkPermission('EDIT_PROJECT'), milestoneController.deleteMilestone);

// 4. Task associations mapping
router.post('/:id/tasks', checkPermission('EDIT_PROJECT'), validate(validateLinkTasks), milestoneController.linkTasksToMilestone);

export default router;
