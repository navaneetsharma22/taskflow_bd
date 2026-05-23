import authService from './service.js';
import organizationService from '../organizations/service.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { successResponse } from '../../utils/responseHelper.js';

/**
 * AUTH MODULE - BOUNDARY CONTROLLERS (controller.js)
 * Responsibility: Handles Express REST input decoding and response encoding.
 * Extracts headers, body variables, telemetry states, and passes them to authService.
 * Restricts controllers strictly to thin wrapper bindings.
 */

/**
 * @desc    Validate organization code workspace
 * @route   POST /api/auth/validate-org
 * @access  Public
 */
export const validateOrganizationWorkspace = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const org = await organizationService.validateOrganizationCode(code);
  
  return successResponse(res, 'Organization workspace is valid and accessible.', {
    id: org._id,
    name: org.name,
    code: org.code,
    status: org.status,
  });
});

/**
 * @desc    Register a new tenant user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const registerUser = asyncHandler(async (req, res) => {
  const userData = await authService.register(req.body);
  return successResponse(res, 'Account registration completed successfully.', userData, 201);
});

/**
 * @desc    Authenticates user, checks tenant workspace, issues session tokens
 * @route   POST /api/auth/login
 * @access  Public
 */
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password, organizationCode } = req.body;
  const device = req.headers['user-agent'] || 'Unknown Device';
  const ipAddress = req.ip || '0.0.0.0';

  const authData = await authService.login({
    email,
    password,
    organizationCode,
    device,
    ipAddress,
  });

  return successResponse(res, 'User authenticated successfully.', authData);
});

/**
 * @desc    Refreshes active user access token and rotates refresh tokens
 * @route   POST /api/auth/refresh
 * @access  Public
 */
export const refreshSessionToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const device = req.headers['user-agent'] || 'Unknown Device';
  const ipAddress = req.ip || '0.0.0.0';

  const newTokens = await authService.refreshSession({
    token: refreshToken,
    device,
    ipAddress,
  });

  return successResponse(res, 'Authentication token refreshed successfully.', newTokens);
});

/**
 * @desc    Logs user out, revoking refresh token session validity
 * @route   POST /api/auth/logout
 * @access  Public
 */
export const logoutUser = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  await authService.logout(refreshToken);
  return successResponse(res, 'Session terminated successfully.', {});
});

/**
 * @desc    Submits password recovery forgot email requests
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotUserPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const recoveryResponse = await authService.forgotPassword(email);
  return successResponse(res, 'If email is registered, recovery directions have been dispatched.', recoveryResponse);
});

/**
 * @desc    Resets user passwords using active recovery codes
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
export const resetUserPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  await authService.resetPassword({ token, password });
  return successResponse(res, 'Password updated successfully. Active sessions revoked.', {});
});
