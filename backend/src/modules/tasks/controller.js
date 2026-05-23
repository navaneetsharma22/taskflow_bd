import taskService from './service.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { successResponse, paginationResponse } from '../../utils/responseHelper.js';

/**
 * TASKS MODULE - BOUNDARY CONTROLLERS (controller.js)
 * Responsibility: Wires Express HTTP bindings for Task management.
 */

/**
 * @desc    Instantiate a new task
 * @route   POST /api/tasks
 * @access  Private (Requires CREATE_TASK permission)
 */
export const createTask = asyncHandler(async (req, res) => {
  const task = await taskService.createTask(req.body, req.user._id, req.organizationId);
  return successResponse(res, 'Task instantiated successfully.', task, 201);
});

/**
 * @desc    Update task configurations
 * @route   PUT /api/tasks/:id
 * @access  Private (Requires UPDATE_TASK permission)
 */
export const updateTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const task = await taskService.updateTask(id, req.body, req.organizationId);
  return successResponse(res, 'Task updated successfully.', task);
});

/**
 * @desc    Get specific task details
 * @route   GET /api/tasks/:id
 * @access  Private (All authenticated members)
 */
export const getTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const task = await taskService.getTaskById(id, req.organizationId);
  return successResponse(res, 'Task details retrieved successfully.', task);
});

/**
 * @desc    List tasks within workspace (filtered and paginated)
 * @route   GET /api/tasks
 * @access  Private (All authenticated members)
 */
export const listTasks = asyncHandler(async (req, res) => {
  const { projectId, status, priority, assigneeId, page = 1, limit = 20 } = req.query;

  // Build filter criteria
  const filter = {};
  if (projectId) filter.projectId = projectId;
  if (status) filter.status = status;
  if (priority) filter.priority = priority.toUpperCase();
  if (assigneeId) filter.assigneeId = assigneeId;

  const { tasks, total } = await taskService.listTasks(filter, page, limit, req.organizationId);

  return paginationResponse(
    res,
    'Workspace tasks list retrieved successfully.',
    tasks,
    page,
    limit,
    total
  );
});

/**
 * @desc    Add a subtask item
 * @route   POST /api/tasks/:id/subtasks
 * @access  Private (Requires UPDATE_TASK permission)
 */
export const addSubtask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title } = req.body;
  const task = await taskService.addSubtask(id, title, req.organizationId);
  return successResponse(res, 'Subtask added successfully.', task.subtasks);
});

/**
 * @desc    Modify subtask status
 * @route   PUT /api/tasks/:id/subtasks/:subtaskId
 * @access  Private (Requires UPDATE_TASK permission)
 */
export const updateSubtask = asyncHandler(async (req, res) => {
  const { id, subtaskId } = req.params;
  const { isCompleted } = req.body;
  const task = await taskService.updateSubtask(id, subtaskId, isCompleted, req.organizationId);
  return successResponse(res, 'Subtask updated successfully.', task.subtasks);
});

/**
 * @desc    Remove a subtask item
 * @route   DELETE /api/tasks/:id/subtasks/:subtaskId
 * @access  Private (Requires UPDATE_TASK permission)
 */
export const deleteSubtask = asyncHandler(async (req, res) => {
  const { id, subtaskId } = req.params;
  const task = await taskService.deleteSubtask(id, subtaskId, req.organizationId);
  return successResponse(res, 'Subtask removed successfully.', task.subtasks);
});

/**
 * @desc    Append comment to task
 * @route   POST /api/tasks/:id/comments
 * @access  Private (All authenticated members)
 */
export const addComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  const comments = await taskService.addComment(id, text, req.user._id, req.organizationId);
  return successResponse(res, 'Comment appended successfully.', comments);
});

/**
 * @desc    Append attachment mapping to task
 * @route   POST /api/tasks/:id/attachments
 * @access  Private (All authenticated members)
 */
export const addAttachment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, url } = req.body;
  const attachments = await taskService.addAttachment(id, name, url, req.organizationId);
  return successResponse(res, 'Attachment configured successfully.', attachments);
});

/**
 * @desc    Configure task dependency, checking for circular references
 * @route   POST /api/tasks/:id/dependencies
 * @access  Private (Requires UPDATE_TASK permission)
 */
export const addTaskDependency = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { dependencyId } = req.body;
  const task = await taskService.addTaskDependency(id, dependencyId, req.organizationId);
  return successResponse(res, 'Task dependency configured successfully.', task);
});

/**
 * @desc    Configure task blocker, cascading status to BLOCKED
 * @route   POST /api/tasks/:id/blockers
 * @access  Private (Requires UPDATE_TASK permission)
 */
export const addBlocker = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { blockerId } = req.body;
  const task = await taskService.addBlocker(id, blockerId, req.organizationId);
  return successResponse(res, 'Task blocker configured successfully. Task status transitioned to BLOCKED.', task);
});

/**
 * @desc    Escalate a task, automatically promoting priority to CRITICAL
 * @route   POST /api/tasks/:id/escalate
 * @access  Private (Requires UPDATE_TASK permission)
 */
export const escalateTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason, escalatedTo } = req.body;
  const task = await taskService.escalateTask(id, reason, escalatedTo, req.organizationId);
  return successResponse(res, 'Task escalated successfully. Priority promoted to CRITICAL.', task);
});
