import mongoose from 'mongoose';

/**
 * AUDIT LOGS MODULE - DATABASE SCHEMA (model.js)
 * Responsibility: Outlines structures for audit logging compliance,
 * tracking user identities (who), actions, old/new states diffs, timestamps,
 * and multi-tenant organization identifiers.
 */

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Audit log must record the associated user identity.'],
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Audit log must belong to a tenant organization.'],
      index: true,
    },
    action: {
      type: String,
      required: [true, 'Audit log action definition is required.'],
      trim: true,
      index: true,
    },
    entityType: {
      type: String,
      required: [true, 'Associated entity type is required.'],
      enum: ['ORGANIZATION', 'USER', 'PROJECT', 'TASK', 'MILESTONE', 'ROLE'],
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Associated entity identifier is required.'],
      index: true,
    },
    oldValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true, // Auto provides the 'createdAt' (Timestamp) metric
  }
);

// High-speed indices for security audit listing queries
auditLogSchema.index({ organizationId: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, organizationId: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, organizationId: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
