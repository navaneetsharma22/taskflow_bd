import express from 'express';
import validate from '../../validators/validate.js';
import * as projectController from './controller.js';
import { protect } from '../auth/middleware.js';
import { checkPermission } from '../rbac/middleware.js';
import { resolveTenant } from '../organizations/middleware.js';
import {
  validateCreateProject,
  validateUpdateProject,
  validateAddDependency,
} from './validator.js';

/**
 * PROJECTS MODULE - ENDPOINTS ROUTER (routes.js)
 * Responsibility: Outlines routes endpoints for Project management,
 * binding security guards, tenant resolvers, and payload Joi validators.
 */

const router = express.Router();

// Apply core authentication and tenant workspace resolution filters across all routes
router.use(protect);
router.use(resolveTenant);

// 1. Projects Lists & Creations
router.route('/')
  .get(projectController.listProjects)
  .post(checkPermission('CREATE_PROJECT'), validate(validateCreateProject), projectController.createProject);

// 2. Project Details, Updates, and Archiving
router.route('/:id')
  .get(projectController.getProject)
  .put(checkPermission('EDIT_PROJECT'), validate(validateUpdateProject), projectController.updateProject);

router.post('/:id/archive', checkPermission('DELETE_PROJECT'), projectController.archiveProject);

// 3. Dependencies configuration
router.post('/:id/dependencies', checkPermission('EDIT_PROJECT'), validate(validateAddDependency), projectController.addProjectDependency);

export default router;
