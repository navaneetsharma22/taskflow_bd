import projectService from './service.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { successResponse, paginationResponse } from '../../utils/responseHelper.js';
import { PROJECT_STATUS } from '../../constants/index.js';

/**
 * PROJECTS MODULE - BOUNDARY CONTROLLERS (controller.js)
 * Responsibility: Wires Express HTTP bindings for Project management.
 */

/**
 * @desc    Instantiate a new project workspace
 * @route   POST /api/projects
 * @access  Private (Requires CREATE_PROJECT permission)
 */
export const createProject = asyncHandler(async (req, res) => {
  const project = await projectService.createProject(req.body, req.user._id, req.organizationId);
  return successResponse(res, 'Project workspace created successfully.', project, 201);
});

/**
 * @desc    Update project configurations
 * @route   PUT /api/projects/:id
 * @access  Private (Requires EDIT_PROJECT permission)
 */
export const updateProject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const project = await projectService.updateProject(id, req.body, req.organizationId);
  return successResponse(res, 'Project configurations updated successfully.', project);
});

/**
 * @desc    Archive a project workspace
 * @route   POST /api/projects/:id/archive
 * @access  Private (Requires DELETE_PROJECT permission)
 */
export const archiveProject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const project = await projectService.archiveProject(id, req.organizationId);
  return successResponse(res, 'Project archived successfully.', project);
});

/**
 * @desc    Retrieve specific project details
 * @route   GET /api/projects/:id
 * @access  Private (All authenticated members)
 */
export const getProject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const project = await projectService.getProjectById(id, req.organizationId);
  return successResponse(res, 'Project workspace details retrieved successfully.', project);
});

/**
 * @desc    List project workspaces (filtered and paginated)
 * @route   GET /api/projects
 * @access  Private (All authenticated members)
 */
export const listProjects = asyncHandler(async (req, res) => {
  const { status, overdue, page = 1, limit = 10 } = req.query;

  // Build filter criteria
  const filter = {};
  if (status) filter.status = status;
  
  // Deadline management: support viewing overdue projects
  if (overdue === 'true') {
    filter.status = { $ne: PROJECT_STATUS.COMPLETED };
    filter.endDate = { $lt: new Date() };
  }

  const { projects, total } = await projectService.listProjects(filter, page, limit, req.organizationId);

  return paginationResponse(
    res,
    'Project workspaces listed successfully.',
    projects,
    page,
    limit,
    total
  );
});

/**
 * @desc    Register a project dependency mapping, preventing circular references
 * @route   POST /api/projects/:id/dependencies
 * @access  Private (Requires EDIT_PROJECT permission)
 */
export const addProjectDependency = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { dependencyId } = req.body;

  const project = await projectService.addProjectDependency(id, dependencyId, req.organizationId);
  return successResponse(res, 'Project dependency configured successfully.', project);
});
