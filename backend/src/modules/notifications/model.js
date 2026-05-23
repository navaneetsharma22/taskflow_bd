import mongoose from 'mongoose';

/**
 * NOTIFICATION MODULE - DATABASE SCHEMA (model.js)
 * Responsibility: Outlines structures for notifications, including read/unread
 * indicators, target channels (EMAIL, IN_APP, PUSH), and tenant isolation parameters.
 */

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Notification must belong to a target recipient user.'],
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Notification must belong to a tenant organization.'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required.'],
      trim: true,
      maxlength: [100],
    },
    message: {
      type: String,
      required: [true, 'Notification content message is required.'],
      trim: true,
      maxlength: [1000],
    },
    type: {
      type: String,
      enum: ['INFO', 'ALERT', 'TASK_ASSIGNED', 'PROJECT_UPDATED', 'ESCALATION'],
      default: 'INFO',
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    channels: {
      type: [String],
      enum: ['EMAIL', 'IN_APP', 'PUSH'],
      default: ['IN_APP'],
    },
    deliveryStatus: {
      email: {
        type: String,
        enum: ['PENDING', 'SENT', 'FAILED', 'NOT_APPLICABLE'],
        default: 'NOT_APPLICABLE',
      },
      push: {
        type: String,
        enum: ['PENDING', 'SENT', 'FAILED', 'NOT_APPLICABLE'],
        default: 'NOT_APPLICABLE',
      },
      inApp: {
        type: String,
        enum: ['PENDING', 'SENT', 'FAILED', 'NOT_APPLICABLE'],
        default: 'NOT_APPLICABLE',
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound Index: retrieve unread notifications rapidly for dynamic count indicators
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1, organizationId: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
