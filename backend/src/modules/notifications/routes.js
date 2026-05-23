import express from 'express';
import validate from '../../validators/validate.js';
import * as notificationController from './controller.js';
import { protect } from '../auth/middleware.js';
import { resolveTenant } from '../organizations/middleware.js';
import { validateNotificationId } from './validator.js';

/**
 * NOTIFICATION MODULE - ENDPOINTS ROUTER (routes.js)
 * Responsibility: Outlines routes endpoints for user Notifications tracking,
 * binding security guards, tenant resolvers, and Joi payload validators.
 */

const router = express.Router();

// Apply core authentication and tenant workspace resolution filters across all routes
router.use(protect);
router.use(resolveTenant);

// 1. Lists User Notifications
router.get('/', notificationController.getNotifications);

// 2. Unread indication metrics
router.get('/unread-count', notificationController.getUnreadCount);

// 3. Mark all as read
router.put('/read-all', notificationController.markAllAsRead);

// 4. Mark specific notification as read
router.put('/:id/read', validate(validateNotificationId), notificationController.markAsRead);

export default router;
