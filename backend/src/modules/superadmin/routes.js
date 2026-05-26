import express from 'express';
import { protect, restrictTo } from '../auth/middleware.js';
import { ROLES } from '../../constants/index.js';
import * as superadminController from './controller.js';

const router = express.Router();

// Only allow authenticated SUPER_ADMIN users
router.use(protect);
router.use(restrictTo(ROLES.SUPER_ADMIN));

// Super admin can only create organizations from this module
router.post('/organizations', superadminController.createOrganization);

export default router;
