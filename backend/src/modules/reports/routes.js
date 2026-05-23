import express from 'express';
import validate from '../../validators/validate.js';
import * as reportsController from './controller.js';
import { protect } from '../auth/middleware.js';
import { resolveTenant } from '../organizations/middleware.js';
import { checkPermission } from '../rbac/middleware.js';
import { validateProjectReport } from './validator.js';

/**
 * REPORTS MODULE - ENDPOINTS ROUTER (routes.js)
 * Responsibility: Outlines routes endpoints for PDF/CSV reports exports,
 * binding security guards, tenant resolvers, and Joi parameter validators.
 */

const router = express.Router();

// Apply core authentication, tenant workspace resolution, and analytics permissions filters
router.use(protect);
router.use(resolveTenant);
router.use(checkPermission('VIEW_ANALYTICS'));

// 1. Stream Executive Dashboard Report (PDF)
router.get('/dashboard/pdf', reportsController.downloadDashboardPdf);

// 2. Export overall User Productivity Report (CSV)
router.get('/employees/csv', reportsController.downloadEmployeeCsv);

// 3. Stream Project Status Report (PDF)
router.get('/projects/:projectId/pdf', validate(validateProjectReport), reportsController.downloadProjectPdf);

// 4. Export Project Tasks list Report (CSV)
router.get('/projects/:projectId/csv', validate(validateProjectReport), reportsController.downloadProjectCsv);

export default router;
