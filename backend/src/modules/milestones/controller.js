import milestoneService from './service.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { successResponse, paginationResponse } from '../../utils/responseHelper.js';

/**
 * MILESTONES MODULE - BOUNDARY CONTROLLERS (controller.js)
 * Responsibility: Wires Express HTTP bindings for Milestone management.
 */

/**
 * @desc    Create a new project milestone
 * @route   POST /api/milestones
 * @access  Private (Requires EDIT_PROJECT permission)
 */
export const createMilestone = asyncHandler(async (req, res) => {
  const milestone = await milestoneService.createMilestone(req.body, req.organizationId);
  return successResponse(res, 'Project milestone created successfully.', milestone, 201);
});

/**
 * @desc    Update milestone configurations
 * @route   PUT /api/milestones/:id
 * @access  Private (Requires EDIT_PROJECT permission)
 */
export const updateMilestone = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const milestone = await milestoneService.updateMilestone(id, req.body, req.organizationId);
  return successResponse(res, 'Milestone configurations updated successfully.', milestone);
});

/**
 * @desc    Delete a project milestone
 * @route   DELETE /api/milestones/:id
 * @access  Private (Requires EDIT_PROJECT permission)
 */
export const deleteMilestone = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await milestoneService.deleteMilestone(id, req.organizationId);
  return successResponse(res, 'Milestone purged successfully.');
});

/**
 * @desc    Get specific milestone details
 * @route   GET /api/milestones/:id
 * @access  Private (All authenticated members)
 */
export const getMilestone = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const milestone = await milestoneService.getMilestoneById(id, req.organizationId);
  return successResponse(res, 'Milestone details retrieved successfully.', milestone);
});

/**
 * @desc    List milestones (filtered and paginated)
 * @route   GET /api/milestones
 * @access  Private (All authenticated members)
 */
export const listMilestones = asyncHandler(async (req, res) => {
  const { projectId, status, page = 1, limit = 10 } = req.query;

  const filter = {};
  if (projectId) filter.projectId = projectId;
  if (status) filter.status = status;

  const { milestones, total } = await milestoneService.listMilestones(filter, page, limit, req.organizationId);

  return paginationResponse(
    res,
    'Milestones listed successfully.',
    milestones,
    page,
    limit,
    total
  );
});

/**
 * @desc    Associate task items to track progress dynamically
 * @route   POST /api/milestones/:id/tasks
 * @access  Private (Requires EDIT_PROJECT permission)
 */
export const linkTasksToMilestone = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { taskIds } = req.body;

  const milestone = await milestoneService.linkTasksToMilestone(id, taskIds, req.organizationId);
  return successResponse(res, 'Task associations linked successfully. Milestone progress updated.', milestone);
});

/**
 * @desc    Retrieve dynamic alerts for incomplete or overdue milestones
 * @route   GET /api/milestones/alerts
 * @access  Private (All authenticated members)
 */
export const getMilestoneAlerts = asyncHandler(async (req, res) => {
  const { projectId } = req.query;
  const alerts = await milestoneService.getMilestoneAlerts(projectId, req.organizationId);
  return successResponse(res, 'Milestones alerts telemetry calculated successfully.', alerts);
});
