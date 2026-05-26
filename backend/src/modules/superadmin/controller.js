import organizationService from '../organizations/service.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { successResponse } from '../../utils/responseHelper.js';

/**
 * @desc    Create a new organization workspace
 * @route   POST /api/superadmin/organizations
 * @access  Private (SUPER_ADMIN)
 */
export const createOrganization = asyncHandler(async (req, res) => {
  const newOrganization = await organizationService.createOrganization(req.body);
  return successResponse(res, 'Organization created successfully.', newOrganization, 201);
});
