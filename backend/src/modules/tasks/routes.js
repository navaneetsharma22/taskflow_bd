import express from 'express';
import validate from '../../validators/validate.js';
import * as taskController from './controller.js';
import { protect } from '../auth/middleware.js';
import { checkPermission } from '../rbac/middleware.js';
import { resolveTenant } from '../organizations/middleware.js';
import {
  validateCreateTask,
  validateUpdateTask,
  validateAddSubtask,
  validateUpdateSubtask,
  validateAddComment,
  validateAddAttachment,
  validateAddDependency,
  validateAddBlocker,
  validateEscalateTask,
} from './validator.js';

/**
 * TASKS MODULE - ENDPOINTS ROUTER (routes.js)
 * Responsibility: Outlines routes endpoints for Task management,
 * binding security guards, tenant resolvers, and payload Joi validators.
 */

const router = express.Router();

// Apply core authentication and tenant workspace resolution filters across all routes
router.use(protect);
router.use(resolveTenant);

// 1. Core Task Lists & Creations
router.route('/')
  .get(taskController.listTasks)
  .post(checkPermission('CREATE_TASK'), validate(validateCreateTask), taskController.createTask);

// 2. Specific Task Actions
router.route('/:id')
  .get(taskController.getTask)
  .put(checkPermission('UPDATE_TASK'), validate(validateUpdateTask), taskController.updateTask);

// 3. Subtasks Management
router.post('/:id/subtasks', checkPermission('UPDATE_TASK'), validate(validateAddSubtask), taskController.addSubtask);
router.route('/:id/subtasks/:subtaskId')
  .put(checkPermission('UPDATE_TASK'), validate(validateUpdateSubtask), taskController.updateSubtask)
  .delete(checkPermission('UPDATE_TASK'), taskController.deleteSubtask);

// 4. Comments & Attachments
router.post('/:id/comments', validate(validateAddComment), taskController.addComment);
router.post('/:id/attachments', validate(validateAddAttachment), taskController.addAttachment);

// 5. Cross-Task dependencies, blockers, and escalations
router.post('/:id/dependencies', checkPermission('UPDATE_TASK'), validate(validateAddDependency), taskController.addTaskDependency);
router.post('/:id/blockers', checkPermission('UPDATE_TASK'), validate(validateAddBlocker), taskController.addBlocker);
router.post('/:id/escalate', checkPermission('UPDATE_TASK'), validate(validateEscalateTask), taskController.escalateTask);

export default router;
