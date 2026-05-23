import mongoose from 'mongoose';

/**
 * MESSAGING MODULE - DATABASE SCHEMA (model.js)
 * Responsibility: Outlines structures for messaging, supporting Direct Messages (DMs),
 * Project Group Chats, Task Discussions, File Attachments, and Read Receipts.
 */

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Message must have an associated sender.'],
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Message must belong to a tenant organization.'],
      index: true,
    },
    conversationType: {
      type: String,
      enum: ['DM', 'PROJECT', 'TASK'],
      required: [true, 'Conversation type (DM, PROJECT, TASK) is required.'],
      index: true,
    },
    // Recipient user (Used ONLY for DM conversation type)
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    // Project reference (Used ONLY for PROJECT group chat type)
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      index: true,
    },
    // Task reference (Used ONLY for TASK discussion type)
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      index: true,
    },
    content: {
      type: String,
      trim: true,
      maxlength: [4000, 'Message content cannot exceed 4000 characters.'],
      default: '',
    },
    attachments: [
      {
        fileName: {
          type: String,
          required: true,
        },
        fileUrl: {
          type: String,
          required: true,
        },
        fileType: {
          type: String,
          required: true,
        },
        fileSize: {
          type: Number,
          required: true,
        },
      },
    ],
    // Read receipts mapping users to their read timestamps
    readBy: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// High-speed indices for conversation listings
messageSchema.index({ conversationType: 1, recipientId: 1, senderId: 1, createdAt: -1 });
messageSchema.index({ conversationType: 1, projectId: 1, createdAt: -1 });
messageSchema.index({ conversationType: 1, taskId: 1, createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);

export default Message;
