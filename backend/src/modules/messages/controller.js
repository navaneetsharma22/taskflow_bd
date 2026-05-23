import messageService from './service.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { successResponse, paginationResponse } from '../../utils/responseHelper.js';

/**
 * MESSAGING MODULE - BOUNDARY CONTROLLERS (controller.js)
 * Responsibility: Wires Express HTTP bindings for Enterprise Messaging.
 */

/**
 * @desc    Send a Direct Message (DM) to another user
 * @route   POST /api/messages/dm
 * @access  Private
 */
export const sendDirectMessage = asyncHandler(async (req, res) => {
  const { recipientId, content, attachments } = req.body;
  const senderId = req.user._id;

  const message = await messageService.sendDirectMessage(
    senderId,
    recipientId,
    content,
    attachments,
    req.organizationId
  );

  return successResponse(res, 'Direct message dispatched successfully.', message, 201);
});

/**
 * @desc    Send a Project Group message
 * @route   POST /api/messages/project
 * @access  Private
 */
export const sendProjectMessage = asyncHandler(async (req, res) => {
  const { projectId, content, attachments } = req.body;
  const senderId = req.user._id;

  const message = await messageService.sendProjectMessage(
    senderId,
    projectId,
    content,
    attachments,
    req.organizationId
  );

  return successResponse(res, 'Project group message dispatched successfully.', message, 201);
});

/**
 * @desc    Send a Task Discussion message
 * @route   POST /api/messages/task
 * @access  Private
 */
export const sendTaskMessage = asyncHandler(async (req, res) => {
  const { taskId, content, attachments } = req.body;
  const senderId = req.user._id;

  const message = await messageService.sendTaskMessage(
    senderId,
    taskId,
    content,
    attachments,
    req.organizationId
  );

  return successResponse(res, 'Task discussion message dispatched successfully.', message, 201);
});

/**
 * @desc    Get Direct Messages with another user
 * @route   GET /api/messages/dm/:recipientId
 * @access  Private
 */
export const getDirectMessages = asyncHandler(async (req, res) => {
  const { recipientId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const userId = req.user._id;

  const { messages, total } = await messageService.getDirectMessages(
    userId,
    recipientId,
    req.organizationId,
    page,
    limit
  );

  return paginationResponse(res, 'Direct messages listed successfully.', messages, page, limit, total);
});

/**
 * @desc    Get Project Group messages
 * @route   GET /api/messages/project/:projectId
 * @access  Private
 */
export const getProjectMessages = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const userId = req.user._id;

  const { messages, total } = await messageService.getProjectMessages(
    userId,
    projectId,
    req.organizationId,
    page,
    limit
  );

  return paginationResponse(res, 'Project group messages listed successfully.', messages, page, limit, total);
});

/**
 * @desc    Get Task Discussion messages
 * @route   GET /api/messages/task/:taskId
 * @access  Private
 */
export const getTaskMessages = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const userId = req.user._id;

  const { messages, total } = await messageService.getTaskMessages(
    userId,
    taskId,
    req.organizationId,
    page,
    limit
  );

  return paginationResponse(res, 'Task discussion messages listed successfully.', messages, page, limit, total);
});
