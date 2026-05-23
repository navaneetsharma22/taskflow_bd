import express from 'express';
import validate from '../../validators/validate.js';
import * as aiController from './controller.js';
import { protect, restrictTo } from '../auth/middleware.js';
import { resolveTenant, checkFeatureFlag } from '../organizations/middleware.js';
import { validateProjectAiQuery } from './validator.js';

/**
 * AI SERVICE MODULE - ENDPOINTS ROUTER (routes.js)
 * Responsibility: Outlines routes endpoints for generative AI tasks,
 * binding security guards, tenant resolvers, subscription feature gates,
 * and Joi parameter validators.
 */

const router = express.Router();

// Apply core authentication, tenant workspace resolution, and SaaS feature flag gatekeepers
router.use(protect);
router.use(resolveTenant);
router.use(checkFeatureFlag('hasAIEnabled'));

// 1. Generate project Sprint Summary review
router.get('/projects/:projectId/sprint-summary', validate(validateProjectAiQuery), aiController.getSprintSummary);

// 2. Assess project Deadline Risk factors
router.get('/projects/:projectId/deadline-risk', validate(validateProjectAiQuery), aiController.getDeadlineRisk);

// 3. Predict developer Workload balance capacities
router.get('/workload-prediction', aiController.getWorkloadPrediction);

// 4. Generate AI Executive operations Report text (Restricted to workspace administrators)
router.get('/executive-report', restrictTo('ORG_ADMIN', 'SUPER_ADMIN'), aiController.getExecutiveReport);

export default router;
