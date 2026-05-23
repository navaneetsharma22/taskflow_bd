import notificationRepository from './repository.js';
import { emitToUser } from '../../socket/index.js';
import logger from '../../utils/logger.js';
import AppError from '../../utils/AppError.js';
import cacheManager from '../../utils/cache.js';

/**
 * NOTIFICATION MODULE - SERVICE LAYER & WORKER QUEUE (service.js)
 * Responsibility: Implements asynchronous background queuing and multi-channel
 * notification delivery:
 *   1. Dispatcher: Registers a job in our non-blocking worker queue.
 *   2. In-Memory Asynchronous Worker Queue: Avoids locking HTTP threads.
 *   3. Email Channel: SMTP mock dispatcher.
 *   4. Push Channel: WebPush/FCM mock dispatcher.
 *   5. In-App Channel: Saves to DB and emits a real-time WebSockets event.
 *   6. Read/Unread State controls.
 */

// Global In-Memory Notification Queue buffer
const notificationQueue = [];
let isWorkerRunning = false;

class NotificationService {

  /**
   * Pushes a notification request into the background processing queue.
   * Returns immediately (non-blocking) to optimize API speeds.
   */
  dispatchNotification(recipientId, organizationId, title, message, channels = ['IN_APP'], type = 'INFO') {
    const job = {
      recipientId: recipientId.toString(),
      organizationId: organizationId.toString(),
      title,
      message,
      channels,
      type,
      retryCount: 0,
      timestamp: new Date(),
    };

    notificationQueue.push(job);
    logger.info(`Notification Queue: Enqueued job [Title: ${title}] for Recipient: ${recipientId}. Queue size: ${notificationQueue.length}`);

    // Trigger queue worker loop asynchronously
    this.startWorker();
  }

  /**
   * Non-blocking Queue Worker Loop
   */
  async startWorker() {
    if (isWorkerRunning) return;
    isWorkerRunning = true;

    // Process all pending notification jobs in the buffer
    while (notificationQueue.length > 0) {
      const job = notificationQueue.shift();
      try {
        await this.processJob(job);
      } catch (err) {
        logger.error(`Notification Worker: Failed to process job [Title: ${job.title}]. Error: ${err.message}`);
        
        // Exponential Retry strategy (Max 3 attempts)
        if (job.retryCount < 3) {
          job.retryCount += 1;
          notificationQueue.push(job);
          logger.warn(`Notification Worker: Re-enqueuing job for retry attempt ${job.retryCount}/3`);
        } else {
          logger.error(`Notification Worker: Job [Title: ${job.title}] breached max retry ceiling. Discarded.`);
        }
      }
    }

    isWorkerRunning = false;
  }

  /**
   * Processes a single notification job by routing it to target channels
   */
  async processJob(job) {
    const { recipientId, organizationId, title, message, channels, type } = job;

    // 1. Initialize Mongoose document configuration
    const notificationData = {
      recipientId,
      organizationId,
      title,
      message,
      type,
      channels,
      deliveryStatus: {
        email: channels.includes('EMAIL') ? 'PENDING' : 'NOT_APPLICABLE',
        push: channels.includes('PUSH') ? 'PENDING' : 'NOT_APPLICABLE',
        inApp: channels.includes('IN_APP') ? 'PENDING' : 'NOT_APPLICABLE',
      },
    };

    // 2. Persist notification to DB (Required for In-App list retrieval)
    const notification = await notificationRepository.create(notificationData);

    // Invalidate cached unread notifications count
    const cacheKey = `tenant:${organizationId}:user:${recipientId}:notifications:unread`;
    await cacheManager.del(cacheKey);

    // 3. Process Multi-channel delivery targets parallelly
    const deliveryPromises = [];

    if (channels.includes('IN_APP')) {
      deliveryPromises.push(this.deliverInApp(notification));
    }
    if (channels.includes('EMAIL')) {
      deliveryPromises.push(this.deliverEmail(notification));
    }
    if (channels.includes('PUSH')) {
      deliveryPromises.push(this.deliverPush(notification));
    }

    await Promise.all(deliveryPromises);
    
    // Save updated delivery status metrics
    await notification.save();

    logger.info(`Notification Worker: Successfully processed job [ID: ${notification._id}] over channels: [${channels.join(', ')}]`);
  }

  /**
   * IN_APP Delivery Channel: Updates Mongoose state and triggers a WebSockets event
   */
  async deliverInApp(notification) {
    try {
      // Direct emit using our decoupled sockets utility
      emitToUser(notification.recipientId, 'notification:received', {
        id: notification._id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        isRead: false,
        createdAt: notification.createdAt,
      });

      notification.deliveryStatus.inApp = 'SENT';
    } catch (err) {
      logger.error(`Notification InApp Channel: Delivery failure. Error: ${err.message}`);
      notification.deliveryStatus.inApp = 'FAILED';
    }
  }

  /**
   * EMAIL Delivery Channel: Simulates Nodemailer SMTP deliveries
   */
  async deliverEmail(notification) {
    try {
      // Simulate real-world SMTP handshake latencies
      await new Promise((resolve) => setTimeout(resolve, 100));

      logger.info(`Notification Email Channel: Dispatched mail to Recipient ID: ${notification.recipientId} | Subject: ${notification.title}`);
      notification.deliveryStatus.email = 'SENT';
    } catch (err) {
      logger.error(`Notification Email Channel: Delivery failure. Error: ${err.message}`);
      notification.deliveryStatus.email = 'FAILED';
    }
  }

  /**
   * PUSH Delivery Channel: Simulates Firebase Cloud Messaging (FCM) transmissions
   */
  async deliverPush(notification) {
    try {
      // Simulate network request latencies
      await new Promise((resolve) => setTimeout(resolve, 80));

      logger.info(`Notification Push Channel: Broadcasted FCM payload to active mobile sessions of User ID: ${notification.recipientId}`);
      notification.deliveryStatus.push = 'SENT';
    } catch (err) {
      logger.error(`Notification Push Channel: FCM transmission failure. Error: ${err.message}`);
      notification.deliveryStatus.push = 'FAILED';
    }
  }

  /**
   * Fetches user's notification list
   */
  async getNotifications(recipientId, organizationId, filter = {}, page = 1, limit = 10) {
    const query = {
      ...filter,
      recipientId,
    };
    return notificationRepository.findAll(query, page, limit, organizationId);
  }

  /**
   * Marks a notification as read
   */
  async markAsRead(id, recipientId, organizationId) {
    const notification = await notificationRepository.markAsRead(id, recipientId, organizationId);
    if (!notification) {
      throw new AppError('Notification not found.', 404);
    }
    
    // Invalidate cached unread count
    const cacheKey = `tenant:${organizationId}:user:${recipientId}:notifications:unread`;
    await cacheManager.del(cacheKey);

    return notification;
  }

  /**
   * Marks all active user notifications as read
   */
  async markAllAsRead(recipientId, organizationId) {
    await notificationRepository.markAllAsRead(recipientId, organizationId);

    // Invalidate cached unread count
    const cacheKey = `tenant:${organizationId}:user:${recipientId}:notifications:unread`;
    await cacheManager.del(cacheKey);

    logger.info(`Notification: Marked all notifications as read for User ID: ${recipientId}`);
  }

  /**
   * Gets unread notification count
   */
  async getUnreadCount(recipientId, organizationId) {
    const cacheKey = `tenant:${organizationId}:user:${recipientId}:notifications:unread`;
    let count = await cacheManager.get(cacheKey);

    if (count === null || count === undefined) {
      count = await notificationRepository.countUnread(recipientId, organizationId);
      // Cache unread count for 1 minute
      await cacheManager.set(cacheKey, count, 60);
    }

    return count;
  }
}

export default new NotificationService();
