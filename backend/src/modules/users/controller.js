import userService from './service.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { successResponse, paginationResponse } from '../../utils/responseHelper.js';

/**
 * USERS MODULE - BOUNDARY CONTROLLERS (controller.js)
 * Responsibility: Handles Express input and output bindings for User profiles.
 * Extracts path params, queries, CSV blocks, and scopes them to the resolved tenant.
 */

/**
 * @desc    Create a new partitioned user inside active workspace
 * @route   POST /api/users
 * @access  Private (Org Admin, Super Admin)
 */
export const createUserProfile = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.body, req.organizationId);
  return successResponse(res, 'User profile registered successfully.', user, 201);
});

/**
 * @desc    Update user profile configurations
 * @route   PUT /api/users/:id
 * @access  Private (All authenticated members)
 */
export const updateUserProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await userService.updateUserProfile(id, req.body, req.organizationId);
  return successResponse(res, 'Profile configurations updated successfully.', user);
});

/**
 * @desc    Get specific user profile context
 * @route   GET /api/users/:id
 * @access  Private (All authenticated members)
 */
export const getUserProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await userService.getUserById(id, req.organizationId);
  return successResponse(res, 'User profile fetched successfully.', user);
});

/**
 * @desc    List users within tenant workspace (filtered and paginated)
 * @route   GET /api/users
 * @access  Private (All authenticated members)
 */
export const listUsers = asyncHandler(async (req, res) => {
  const { department, role, page = 1, limit = 10 } = req.query;

  // Build filter criteria
  const filter = {};
  if (department) filter.department = department;
  if (role) filter.role = role.toUpperCase();

  const { users, total } = await userService.listUsers(filter, page, limit, req.organizationId);

  return paginationResponse(
    res,
    'Workspace users list retrieved successfully.',
    users,
    page,
    limit,
    total
  );
});

/**
 * @desc    Disable a user account (Suspend dashboard access)
 * @route   POST /api/users/:id/disable
 * @access  Private (Org Admin, Super Admin)
 */
export const disableUserAccount = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await userService.disableUser(id, req.organizationId);
  return successResponse(res, 'User account suspended successfully. Active sessions revoked.', {
    id: user._id,
    email: user.email,
    status: user.status,
  });
});

/**
 * @desc    Enable a user account (Reactivate dashboard access)
 * @route   POST /api/users/:id/enable
 * @access  Private (Org Admin, Super Admin)
 */
export const enableUserAccount = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await userService.enableUser(id, req.organizationId);
  return successResponse(res, 'User account reactivated successfully.', {
    id: user._id,
    email: user.email,
    status: user.status,
  });
});

/**
 * @desc    Import users in bulk using CSV string payload
 * @route   POST /api/users/import-csv
 * @access  Private (Org Admin, Super Admin)
 */
export const importUsersBulk = asyncHandler(async (req, res) => {
  const { csvData } = req.body;
  const report = await userService.importUsersFromCSV(csvData, req.organizationId);
  return successResponse(res, 'CSV bulk import processing completed.', report);
});
