import mongoose from 'mongoose';

/**
 * MILESTONES MODULE - DATABASE SCHEMA (model.js)
 * Responsibility: Outlines standard structures for milestones, tracking progress
 * relative to linked tasks, and triggering alert status signals.
 */

const milestoneSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Milestone title is required.'],
      trim: true,
      maxlength: [100, 'Milestone title cannot exceed 100 characters.'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Milestone must belong to a project workspace.'],
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Milestone must belong to a tenant organization workspace.'],
      index: true,
    },
    dueDate: {
      type: Date,
      required: [true, 'Milestone due date is required.'],
      index: true,
    },
    status: {
      type: String,
      enum: ['UPCOMING', 'ACHIEVED', 'DELAYED'],
      default: 'UPCOMING',
      index: true,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      index: true,
    },
    // Array of associated task IDs to measure progress automatically
    tasks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound index for optimal listing of milestone boards inside project views
milestoneSchema.index({ projectId: 1, dueDate: 1, organizationId: 1 });

const Milestone = mongoose.model('Milestone', milestoneSchema);

export default Milestone;
