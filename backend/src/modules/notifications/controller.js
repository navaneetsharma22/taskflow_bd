import notificationService from './service.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { successResponse, paginationResponse } from '../../utils/responseHelper.js';

/**
 * NOTIFICATION MODULE - BOUNDARY CONTROLLERS (controller.js)
 * Responsibility: Wires Express HTTP bindings for personal user notifications.
 */

/**
 * @desc    Get user's notifications (paginated)
 * @route   GET /api/notifications
 * @access  Private
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const { isRead, page = 1, limit = 10 } = req.query;
  const recipientId = req.user._id;

  const filter = {};
  if (isRead !== undefined) {
    filter.isRead = isRead === 'true';
  }

  const { notifications, total } = await notificationService.getNotifications(
    recipientId,
    req.organizationId,
    filter,
    page,
    limit
  );

  return paginationResponse(
    res,
    'Notifications listed successfully.',
    notifications,
    page,
    limit,
    total
  );
});

/**
 * @desc    Mark individual notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
export const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const recipientId = req.user._id;

  const notification = await notificationService.markAsRead(id, recipientId, req.organizationId);
  return successResponse(res, 'Notification marked as read successfully.', notification);
});

/**
 * @desc    Mark all user notifications as read
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
export const markAllAsRead = asyncHandler(async (req, res) => {
  const recipientId = req.user._id;

  await notificationService.markAllAsRead(recipientId, req.organizationId);
  return successResponse(res, 'All notifications marked as read successfully.');
});

/**
 * @desc    Get count of unread notifications
 * @route   GET /api/notifications/unread-count
 * @access  Private
 */
export const getUnreadCount = asyncHandler(async (req, res) => {
  const recipientId = req.user._id;

  const count = await notificationService.getUnreadCount(recipientId, req.organizationId);
  return successResponse(res, 'Unread notification count calculated successfully.', { count });
});
