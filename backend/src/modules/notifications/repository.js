import Notification from './model.js';

/**
 * NOTIFICATION MODULE - DATA REPOSITORY (repository.js)
 * Responsibility: Wires Mongoose queries for Notifications.
 * Enforces strict recipient and tenant boundaries to secure data isolation.
 */
class NotificationRepository {
  
  async findById(id, recipientId, organizationId) {
    return Notification.findOne({ _id: id, recipientId, organizationId });
  }

  async findAll(filter = {}, page = 1, limit = 10, organizationId) {
    const queryFilter = {
      ...filter,
      organizationId,
    };

    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      Notification.find(queryFilter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      Notification.countDocuments(queryFilter),
    ]);

    return { notifications, total };
  }

  async create(notificationData) {
    return Notification.create(notificationData);
  }

  async markAsRead(id, recipientId, organizationId) {
    return Notification.findOneAndUpdate(
      { _id: id, recipientId, organizationId },
      { $set: { isRead: true, readAt: new Date(), 'deliveryStatus.inApp': 'SENT' } },
      { new: true }
    );
  }

  async markAllAsRead(recipientId, organizationId) {
    return Notification.updateMany(
      { recipientId, organizationId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
  }

  async countUnread(recipientId, organizationId) {
    return Notification.countDocuments({ recipientId, organizationId, isRead: false });
  }
}

export default new NotificationRepository();
