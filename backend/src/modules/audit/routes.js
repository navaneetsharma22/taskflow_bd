import express from 'express';
import validate from '../../validators/validate.js';
import * as auditController from './controller.js';
import { protect, restrictTo } from '../auth/middleware.js';
import { resolveTenant } from '../organizations/middleware.js';
import { validateAuditQuery } from './validator.js';

/**
 * AUDIT LOGS MODULE - ENDPOINTS ROUTER (routes.js)
 * Responsibility: Outlines routes endpoints for security audit tracking,
 * binding security guards, tenant resolvers, and Joi payload validators.
 */

const router = express.Router();

// Apply core authentication, tenant workspace resolution, and administrative restrictions
router.use(protect);
router.use(resolveTenant);
router.use(restrictTo('ORG_ADMIN', 'SUPER_ADMIN'));

// 1. Lists Tenant Audit logs
router.get('/', validate(validateAuditQuery), auditController.getAuditLogs);

export default router;
