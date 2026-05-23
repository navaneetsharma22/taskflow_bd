import mongoose from 'mongoose';

/**
 * ORGANIZATIONS MODULE - DATABASE SCHEMA (model.js)
 * Responsibility: Declares structure, constraints, and indexes for Organization documents.
 * Crucial for multi-tenant data isolation, matching users and projects to their specific tenant block.
 */

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required.'],
      trim: true,
      maxlength: [100, 'Organization name cannot exceed 100 characters.'],
    },
    code: {
      type: String,
      required: [true, 'Organization unique access code is required.'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true, // Quick lookup on login landing space
    },
    status: {
      type: String,
      enum: {
        values: ['ACTIVE', 'SUSPENDED'],
        message: 'Status must be ACTIVE or SUSPENDED.',
      },
      default: 'ACTIVE',
    },
    subscriptionPlan: {
      type: String,
      enum: {
        values: ['FREE_TRIAL', 'GROWTH', 'ENTERPRISE'],
        message: 'Invalid subscription tier.',
      },
      default: 'FREE_TRIAL',
    },
  },
  {
    timestamps: true,
  }
);

const Organization = mongoose.model('Organization', organizationSchema);

export default Organization;
