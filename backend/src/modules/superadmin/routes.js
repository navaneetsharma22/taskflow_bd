import express from 'express';
import { protect, restrictTo } from '../auth/middleware.js';
import { ROLES } from '../../constants/index.js';
import * as superadminController from './controller.js';

const router = express.Router();

// Only allow authenticated SUPER_ADMIN users
router.use(protect);
router.use(restrictTo(ROLES.SUPER_ADMIN));

// List organizations, create, update status, and delete organization
router.get('/organizations', superadminController.listOrganizations);
router.post('/organizations', superadminController.createOrganization);
router.patch('/organizations/:id/status', superadminController.updateOrganizationStatus);
router.delete('/organizations/:id', superadminController.deleteOrganization);
router.delete('/organizations/:id/permanent', superadminController.permanentDeleteOrganization);

export default router;
