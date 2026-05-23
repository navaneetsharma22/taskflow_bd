import express from 'express';
import * as queueController from './controller.js';
import { protect, restrictTo } from '../auth/middleware.js';
import { resolveTenant } from '../organizations/middleware.js';

/**
 * QUEUE SYSTEM MODULE - ENDPOINTS ROUTER (routes.js)
 * Responsibility: Outlines routes endpoints for failed queue job metrics,
 * binding security guards and tenant resolvers.
 */

const router = express.Router();

// Apply core authentication, tenant workspace resolution, and administrative restrictions
router.use(protect);
router.use(resolveTenant);
router.use(restrictTo('ORG_ADMIN', 'SUPER_ADMIN'));

// 1. Lists failed queue jobs
router.get('/failed-jobs', queueController.getFailedJobs);

// 2. Clears failed queue jobs
router.delete('/failed-jobs', queueController.clearFailedJobs);

export default router;
