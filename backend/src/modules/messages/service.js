import messageRepository from './repository.js';
import projectService from '../projects/service.js';
import Task from '../tasks/model.js';
import { User } from '../auth/model.js';
import AppError from '../../utils/AppError.js';
import logger from '../../utils/logger.js';
import { emitToUser } from '../../socket/index.js';
import mongoose from 'mongoose';

// Dynamic socket.io room emitter helper
import { initSocket } from '../../socket/index.js';

/**
 * MESSAGING MODULE - SERVICE LAYER (service.js)
 * Responsibility: Implements core Enterprise Messaging business logic:
 *   1. Sending real-time Direct Messages, Project chats, and Task discussions.
 *   2. Handling file attachments metadata.
 *   3. Dynamic room-based WebSockets broadcasts.
 *   4. Integrated Read Receipts mapping.
 */
class MessageService {

  /**
   * Dispatches a Direct Message (DM) to another developer in the organization
   */
  async sendDirectMessage(senderId, recipientId, content, attachments = [], organizationId) {
    // 1. Verify recipient account is in the same tenant workspace
    const recipient = await User.findOne({ _id: recipientId, organizationId });
    if (!recipient) {
      throw new AppError('Recipient not found or workspace boundary mismatch.', 404);
    }

    const message = await messageRepository.create({
      senderId,
      organizationId,
      conversationType: 'DM',
      recipientId,
      content,
      attachments,
      readBy: [{ userId: senderId }],
    });

    // 2. Real-time Socket Dispatch to both User Rooms
    emitToUser(recipientId, 'chat:message:received', message);
    emitToUser(senderId, 'chat:message:received', message);

    logger.info(`Chat Service: DM dispatched from Sender: ${senderId} to Recipient: ${recipientId}`);
    return message;
  }

  /**
   * Dispatches a message to a Project-scoped group chat
   */
  async sendProjectMessage(senderId, projectId, content, attachments = [], organizationId) {
    // 1. Verify project exists in the organization
    await projectService.getProjectById(projectId, organizationId);

    const message = await messageRepository.create({
      senderId,
      organizationId,
      conversationType: 'PROJECT',
      projectId,
      content,
      attachments,
      readBy: [{ userId: senderId }],
    });

    // 2. Emit message to the Project Room channel
    this.emitToRoom(`project:${projectId}`, 'chat:message:received', message);

    logger.info(`Chat Service: Group message dispatched to Project ID: ${projectId}`);
    return message;
  }

  /**
   * Dispatches a message to a Task-scoped discussion feed
   */
  async sendTaskMessage(senderId, taskId, content, attachments = [], organizationId) {
    // 1. Verify task exists in the organization
    const task = await Task.findOne({ _id: taskId, organizationId });
    if (!task) {
      throw new AppError('Task not found.', 404);
    }

    const message = await messageRepository.create({
      senderId,
      organizationId,
      conversationType: 'TASK',
      taskId,
      content,
      attachments,
      readBy: [{ userId: senderId }],
    });

    // 2. Emit message to the Task Room channel
    this.emitToRoom(`task:${taskId}`, 'chat:message:received', message);

    logger.info(`Chat Service: Discussion message dispatched to Task ID: ${taskId}`);
    return message;
  }

  /**
   * Retrieves and marks direct messages as read
   */
  async getDirectMessages(userId, recipientId, organizationId, page, limit) {
    const { messages, total } = await messageRepository.findDirectMessages(
      userId,
      recipientId,
      organizationId,
      page,
      limit
    );

    // Auto trigger read receipt for unread fetched messages where the user is recipient
    const unreadIds = messages
      .filter((m) => m.senderId._id.toString() !== userId.toString())
      .map((m) => m._id);

    if (unreadIds.length > 0) {
      await this.markAsRead(unreadIds, userId, recipientId, 'DM');
    }

    return { messages, total };
  }

  /**
   * Retrieves and marks project group messages as read
   */
  async getProjectMessages(userId, projectId, organizationId, page, limit) {
    const { messages, total } = await messageRepository.findProjectMessages(
      projectId,
      organizationId,
      page,
      limit
    );

    const unreadIds = messages
      .filter((m) => m.senderId._id.toString() !== userId.toString())
      .map((m) => m._id);

    if (unreadIds.length > 0) {
      await this.markAsRead(unreadIds, userId, projectId, 'PROJECT');
    }

    return { messages, total };
  }

  /**
   * Retrieves and marks task discussion messages as read
   */
  async getTaskMessages(userId, taskId, organizationId, page, limit) {
    const { messages, total } = await messageRepository.findTaskMessages(
      taskId,
      organizationId,
      page,
      limit
    );

    const unreadIds = messages
      .filter((m) => m.senderId._id.toString() !== userId.toString())
      .map((m) => m._id);

    if (unreadIds.length > 0) {
      await this.markAsRead(unreadIds, userId, taskId, 'TASK');
    }

    return { messages, total };
  }

  /**
   * Marks a set of message IDs as read, broadcasting read receipts to sockets
   */
  async markAsRead(messageIds, userId, conversationTarget, type) {
    await messageRepository.markAsRead(messageIds, userId);

    const payload = {
      messageIds,
      userId,
      readAt: new Date(),
    };

    // Emit read receipt event to conversational targets
    if (type === 'DM') {
      emitToUser(conversationTarget, 'chat:read_receipt', payload);
    } else if (type === 'PROJECT') {
      this.emitToRoom(`project:${conversationTarget}`, 'chat:read_receipt', payload);
    } else if (type === 'TASK') {
      this.emitToRoom(`task:${conversationTarget}`, 'chat:read_receipt', payload);
    }
  }

  /**
   * Helper utility to emit to custom socket rooms directly
   */
  emitToRoom(roomName, eventName, payload) {
    // Dynamically access the initialized global Socket.io instance from module
    const socketModule = mongoose.connection.db ? global.ioInstance : null;
    const activeIo = socketModule || global.socketIoServer;
    
    if (activeIo) {
      activeIo.to(roomName).emit(eventName, payload);
    } else {
      logger.debug(`Socket Emitter: Emitted [${eventName}] to custom room channel [${roomName}]`);
    }
  }
}

export default new MessageService();
