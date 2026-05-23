import express from 'express';
import validate from '../../validators/validate.js';
import * as messageController from './controller.js';
import { protect } from '../auth/middleware.js';
import { resolveTenant } from '../organizations/middleware.js';
import {
  validateSendDM,
  validateSendProjectMessage,
  validateSendTaskMessage,
  validateRecipientParam,
  validateProjectParam,
  validateTaskParam,
} from './validator.js';

/**
 * MESSAGING MODULE - ENDPOINTS ROUTER (routes.js)
 * Responsibility: Outlines routes endpoints for real-time messaging,
 * binding security guards, tenant resolvers, and Joi payload validators.
 */

const router = express.Router();

// Apply core authentication and tenant workspace resolution filters across all routes
router.use(protect);
router.use(resolveTenant);

// 1. Send Messages workflows
router.post('/dm', validate(validateSendDM), messageController.sendDirectMessage);
router.post('/project', validate(validateSendProjectMessage), messageController.sendProjectMessage);
router.post('/task', validate(validateSendTaskMessage), messageController.sendTaskMessage);

// 2. Fetch conversational feeds (DMs, Project, Task)
router.get('/dm/:recipientId', validate(validateRecipientParam), messageController.getDirectMessages);
router.get('/project/:projectId', validate(validateProjectParam), messageController.getProjectMessages);
router.get('/task/:taskId', validate(validateTaskParam), messageController.getTaskMessages);

export default router;
