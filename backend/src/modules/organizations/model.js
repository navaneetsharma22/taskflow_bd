import mongoose from 'mongoose';

/**
 * ORGANIZATIONS MODULE - DATABASE SCHEMA (model.js)
 * Responsibility: Declares structure, settings, feature flags, limits, and statuses 
 * for Organizations (tenants). Central to maintaining strict multi-tenant data isolation.
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
        values: ['ACTIVE', 'SUSPENDED', 'TRIAL_EXPIRED'],
        message: 'Status must be ACTIVE, SUSPENDED, or TRIAL_EXPIRED.',
      },
      default: 'ACTIVE',
    },
    subscriptionPlan: {
      type: String,
      enum: ['FREE_TRIAL', 'GROWTH', 'ENTERPRISE'],
      default: 'FREE_TRIAL',
    },
    settings: {
      allow2FA: {
        type: Boolean,
        default: false,
      },
      ipWhitelist: {
        type: [String],
        default: [], // Empty means no whitelist restriction is applied
      },
      sessionLimit: {
        type: Number,
        default: 5, // Max concurrent sessions per user
      },
      storageLimitGb: {
        type: Number,
        default: 5, // Default Free Trial storage limit
      },
      userLimit: {
        type: Number,
        default: 10, // Default Free Trial user headcount limit
      },
    },
    featureFlags: {
      hasAIEnabled: {
        type: Boolean,
        default: false,
      },
      hasChatEnabled: {
        type: Boolean,
        default: true,
      },
      hasTimelineEnabled: {
        type: Boolean,
        default: true,
      },
      hasKPIEnabled: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

const Organization = mongoose.model('Organization', organizationSchema);

export default Organization;
