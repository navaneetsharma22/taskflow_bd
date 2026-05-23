import Message from './model.js';

/**
 * MESSAGING MODULE - DATA REPOSITORY (repository.js)
 * Responsibility: Wires Mongoose queries for Messages.
 * Enforces strict tenant boundaries and provides populated expansions.
 */
class MessageRepository {
  
  async create(messageData) {
    const message = await Message.create(messageData);
    return message.populate('senderId', 'name email profilePhoto');
  }

  async findDirectMessages(userA, userB, organizationId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const filter = {
      organizationId,
      conversationType: 'DM',
      $or: [
        { senderId: userA, recipientId: userB },
        { senderId: userB, recipientId: userA },
      ],
    };

    const [messages, total] = await Promise.all([
      Message.find(filter)
        .populate('senderId', 'name email profilePhoto')
        .populate('recipientId', 'name email')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      Message.countDocuments(filter),
    ]);

    return { messages: messages.reverse(), total };
  }

  async findProjectMessages(projectId, organizationId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const filter = {
      organizationId,
      conversationType: 'PROJECT',
      projectId,
    };

    const [messages, total] = await Promise.all([
      Message.find(filter)
        .populate('senderId', 'name email profilePhoto')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      Message.countDocuments(filter),
    ]);

    return { messages: messages.reverse(), total };
  }

  async findTaskMessages(taskId, organizationId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const filter = {
      organizationId,
      conversationType: 'TASK',
      taskId,
    };

    const [messages, total] = await Promise.all([
      Message.find(filter)
        .populate('senderId', 'name email profilePhoto')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      Message.countDocuments(filter),
    ]);

    return { messages: messages.reverse(), total };
  }

  async markAsRead(messageIds, userId) {
    return Message.updateMany(
      { _id: { $in: messageIds }, 'readBy.userId': { $ne: userId } },
      { $addToSet: { readBy: { userId, readAt: new Date() } } }
    );
  }
}

export default new MessageRepository();
