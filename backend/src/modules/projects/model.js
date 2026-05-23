import mongoose from 'mongoose';
import { PROJECT_STATUS } from '../../constants/index.js';

/**
 * PROJECTS MODULE - DATABASE SCHEMA (model.js)
 * Responsibility: Outlines standard project settings, timelines, templates, 
 * dependencies, and health scores, securing strict organization isolation.
 */

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required.'],
      trim: true,
      maxlength: [100, 'Project name cannot exceed 100 characters.'],
    },
    code: {
      type: String,
      required: [true, 'Project short code identifier is required.'],
      trim: true,
      uppercase: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Project must belong to a tenant organization workspace.'],
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: Object.values(PROJECT_STATUS),
        message: 'Invalid project status configuration.',
      },
      default: PROJECT_STATUS.PLANNING,
      index: true,
    },
    template: {
      type: String,
      enum: ['KANBAN', 'SCRUM', 'WATERFALL', 'CUSTOM'],
      default: 'KANBAN',
    },
    startDate: {
      type: Date,
      required: [true, 'Project start date is required.'],
    },
    endDate: {
      type: Date,
      required: [true, 'Project deadline (end date) is required.'],
      index: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Project owner reference is required.'],
      index: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    dependencies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
      },
    ],
    healthScore: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Enforce unique project codes within a single organization
projectSchema.index({ code: 1, organizationId: 1 }, { unique: true });

const Project = mongoose.model('Project', projectSchema);

export default Project;
