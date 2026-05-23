import express from 'express';
import validate from '../../validators/validate.js';
import * as authController from './controller.js';
import { protect } from './middleware.js';
import { successResponse } from '../../utils/responseHelper.js';
import {
  validateOrgCode,
  validateRegister,
  validateLogin,
  validateRefreshToken,
  validateForgotPassword,
  validateResetPassword,
} from './validator.js';

/**
 * AUTH MODULE - ENDPOINTS ROUTER (routes.js)
 * Responsibility: Outlines routes endpoints, registers Joi payloads validators,
 * and maps actions to underlying controller functions.
 */

const router = express.Router();

// 1. Workspace Validation Entry
router.post('/validate-org', validate(validateOrgCode), authController.validateOrganizationWorkspace);

// 2. User Credentials Lifecycle
router.post('/register', validate(validateRegister), authController.registerUser);
router.post('/login', validate(validateLogin), authController.loginUser);
router.post('/refresh', validate(validateRefreshToken), authController.refreshSessionToken);
router.post('/logout', validate(validateRefreshToken), authController.logoutUser);

// 3. Credentials Recovery Workflows
router.post('/forgot-password', validate(validateForgotPassword), authController.forgotUserPassword);
router.post('/reset-password', validate(validateResetPassword), authController.resetUserPassword);

// 4. Verification Check (Protected telemetry me endpoint)
router.get('/me', protect, (req, res) => {
  return successResponse(res, 'User session context fetched successfully.', {
    user: req.user,
    organizationId: req.organizationId,
  });
});

export default router;
