import express from 'express';
import * as uploadController from './controller.js';
import { protect } from '../auth/middleware.js';
import { resolveTenant } from '../organizations/middleware.js';
import uploadMiddleware from './validator.js';

/**
 * UPLOADS MODULE - ENDPOINTS ROUTER (routes.js)
 * Responsibility: Outlines routes endpoints for file uploads,
 * binding security guards, tenant resolvers, and Multer multipart processors.
 */

const router = express.Router();

// Apply core authentication and tenant workspace resolution filters across all routes
router.use(protect);
router.use(resolveTenant);

// 1. Single File upload endpoint
router.post('/single', uploadMiddleware.single('file'), uploadController.uploadSingleFile);

export default router;
