import organizationService from './service.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { successResponse } from '../../utils/responseHelper.js';

/**
 * ORGANIZATIONS MODULE - BOUNDARY CONTROLLERS (controller.js)
 * Responsibility: Handles Express input and output bindings for Organization (Tenant)
 * settings, feature flags configurations, and telemetry details.
 */

/**
 * @desc    Get active organization settings
 * @route   GET /api/organizations/settings
 * @access  Private (Org Admin, Super Admin)
 */
export const getSettings = asyncHandler(async (req, res) => {
  const org = await organizationService.getOrganizationById(req.organizationId);
  return successResponse(res, 'Organization settings fetched successfully.', org.settings);
});

/**
 * @desc    Update active organization settings
 * @route   PUT /api/organizations/settings
 * @access  Private (Org Admin, Super Admin)
 */
export const updateSettings = asyncHandler(async (req, res) => {
  const updatedSettings = await organizationService.updateSettings(req.organizationId, req.body);
  return successResponse(res, 'Organization settings updated successfully.', updatedSettings);
});

/**
 * @desc    Get active organization feature flags
 * @route   GET /api/organizations/features
 * @access  Private (All authenticated members)
 */
export const getFeatureFlags = asyncHandler(async (req, res) => {
  const org = await organizationService.getOrganizationById(req.organizationId);
  return successResponse(res, 'Organization feature flags fetched successfully.', org.featureFlags);
});

/**
 * @desc    Update active organization feature flags
 * @route   PUT /api/organizations/features
 * @access  Private (Super Admin Only)
 */
export const updateFeatureFlags = asyncHandler(async (req, res) => {
  const updatedFlags = await organizationService.updateFeatureFlags(req.organizationId, req.body);
  return successResponse(res, 'Organization feature flags updated successfully.', updatedFlags);
});
