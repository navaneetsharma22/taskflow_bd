import express from 'express';
import validate from '../../validators/validate.js';
import * as analyticsController from './controller.js';
import { protect } from '../auth/middleware.js';
import { checkPermission } from '../rbac/middleware.js';
import { resolveTenant } from '../organizations/middleware.js';
import { validateProjectParams } from './validator.js';

/**
 * ANALYTICS MODULE - ENDPOINTS ROUTER (routes.js)
 * Responsibility: Outlines routes endpoints for Analytics calculations reports,
 * binding security guards, tenant resolvers, and payload Joi validators.
 */

const router = express.Router();

// Apply core authentication and tenant workspace resolution filters across all routes
router.use(protect);
router.use(resolveTenant);

// 1. Executive Performance summary summaries
router.get('/kpis', checkPermission('VIEW_ANALYTICS'), analyticsController.getKpiDashboard);

// 2. Team Productivity league charts
router.get('/productivity', checkPermission('VIEW_ANALYTICS'), analyticsController.getUserProductivity);

// 3. Overall completion timelines
router.get('/trends/completion', checkPermission('VIEW_ANALYTICS'), analyticsController.getTaskCompletionTrends);

// 4. Overdue and risks forecasts
router.get('/deadline-risks', checkPermission('VIEW_ANALYTICS'), analyticsController.getDeadlineRiskTelemetry);

// 5. Individual project metrics calculations
router.get('/projects/:projectId', validate(validateProjectParams), analyticsController.getProjectAnalytics);
router.get('/velocity/:projectId', validate(validateProjectParams), analyticsController.getSprintVelocity);

export default router;
