import mongoose from 'mongoose';
import { TASK_STATUS, TASK_PRIORITY } from '../../constants/index.js';

/**
 * TASKS MODULE - DATABASE SCHEMAS (model.js)
 * Responsibility: Outlines structures for Tasks, Subtasks, Comments, Attachments,
 * dependencies, recurring settings, blockers, and escalations, securing tenant isolation.
 */

// Subtask Sub-document Schema
const subtaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Subtask title is required.'],
    trim: true,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

// Comment Sub-document Schema
const commentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  text: {
    type: String,
    required: [true, 'Comment text is required.'],
    trim: true,
  },
}, { timestamps: true });

// Attachment Sub-document Schema
const attachmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Attachment name is required.'],
    trim: true,
  },
  url: {
    type: String,
    required: [true, 'Attachment URL is required.'],
    trim: true,
  },
}, { timestamps: true });

// Core Task Schema
const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required.'],
      trim: true,
      maxlength: [150, 'Task title cannot exceed 150 characters.'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Task must belong to a project workspace.'],
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Task must belong to a tenant organization workspace.'],
      index: true,
    },
    assigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      default: null,
    },
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Task reporter is required.'],
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(TASK_STATUS),
        message: 'Invalid task status.',
      },
      default: TASK_STATUS.TODO,
      index: true,
    },
    priority: {
      type: String,
      enum: {
        values: Object.values(TASK_PRIORITY),
        message: 'Invalid task priority.',
      },
      default: TASK_PRIORITY.MEDIUM,
      index: true,
    },
    startDate: {
      type: Date,
      index: true,
    },
    endDate: {
      type: Date,
      index: true,
    },
    subtasks: [subtaskSchema],
    comments: [commentSchema],
    attachments: [attachmentSchema],
    
    // Dependencies & Blockers
    dependencies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
      },
    ],
    blockers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
      },
    ],

    // Recurring Task Configuration
    recurring: {
      isRecurring: {
        type: Boolean,
        default: false,
        index: true,
      },
      frequency: {
        type: String,
        enum: ['DAILY', 'WEEKLY', 'MONTHLY'],
      },
      nextOccurrence: {
        type: Date,
        index: true,
      },
    },

    // Escalation Matrix Configurations
    escalation: {
      isEscalated: {
        type: Boolean,
        default: false,
        index: true,
      },
      escalatedAt: {
        type: Date,
      },
      reason: {
        type: String,
        trim: true,
      },
      escalatedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for high performance dashboard searches
taskSchema.index({ status: 1, priority: 1, organizationId: 1 });
taskSchema.index({ projectId: 1, status: 1, organizationId: 1 });

const Task = mongoose.model('Task', taskSchema);

export default Task;
