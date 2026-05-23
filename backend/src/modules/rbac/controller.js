import rbacService from './service.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { successResponse } from '../../utils/responseHelper.js';

/**
 * RBAC MODULE - BOUNDARY CONTROLLERS (controller.js)
 * Responsibility: Handles Express REST input decoding and response encoding
 * for dynamic roles, custom mappings, assignment flows, and hierarchy limits.
 */

/**
 * @desc    List all accessible roles (Global defaults + Tenant custom roles)
 * @route   GET /api/roles
 * @access  Private (All authenticated members)
 */
export const listRoles = asyncHandler(async (req, res) => {
  const roles = await rbacService.listRoles(req.organizationId);
  return successResponse(res, 'Roles list fetched successfully.', roles);
});

/**
 * @desc    Create a custom tenant-specific role
 * @route   POST /api/roles
 * @access  Private (Org Admin, Super Admin)
 */
export const createCustomRole = asyncHandler(async (req, res) => {
  const newRole = await rbacService.createCustomRole(req.body, req.organizationId);
  return successResponse(res, 'Custom role created successfully.', newRole, 201);
});

/**
 * @desc    Modify details of a custom tenant-specific role
 * @route   PUT /api/roles/:id
 * @access  Private (Org Admin, Super Admin)
 */
export const updateCustomRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updatedRole = await rbacService.updateCustomRole(id, req.body, req.organizationId);
  return successResponse(res, 'Custom role updated successfully.', updatedRole);
});

/**
 * @desc    Purge a custom tenant-specific role
 * @route   DELETE /api/roles/:id
 * @access  Private (Org Admin, Super Admin)
 */
export const deleteCustomRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await rbacService.deleteCustomRole(id, req.organizationId);
  return successResponse(res, 'Custom role purged successfully.');
});

/**
 * @desc    Assign a role to a target user, enforcing Role Hierarchy checks
 * @route   POST /api/roles/assign
 * @access  Private (Org Admin, Super Admin)
 */
export const assignRoleToUser = asyncHandler(async (req, res) => {
  const { userId, role } = req.body;
  const assignmentReport = await rbacService.assignRoleToUser(
    req.user,
    userId,
    role,
    req.organizationId
  );

  return successResponse(res, 'Role assigned successfully. Target user active sessions revoked.', assignmentReport);
});
