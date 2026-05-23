import mongoose from 'mongoose';

/**
 * RBAC MODULE - DATABASE SCHEMAS (model.js)
 * Responsibility: Declares data structures for Roles, Permissions, and 
 * RolePermissions collections. Includes compound indexing for extremely 
 * fast, sub-millisecond RBAC evaluation times and supports tenant-level custom roles
 * with hierarchy weights.
 */

// ==========================================
// 1. Role Schema Definition
// ==========================================
const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Role name is required.'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Role code is required.'],
      uppercase: true,
      trim: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null, // Null indicates globally available system default role
      index: true,
    },
    weight: {
      type: Number,
      required: [true, 'Role hierarchy level weight is required.'],
      default: 10, // Higher numbers indicate higher authority in role hierarchy
      min: [1, 'Hierarchy weight must be at least 1.'],
      max: [100, 'Hierarchy weight cannot exceed 100.'],
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound Index: Enforces role code uniqueness either globally (null tenant) or per-tenant (custom roles)
roleSchema.index({ code: 1, organizationId: 1 }, { unique: true });

// ==========================================
// 2. Permission Schema Definition
// ==========================================
const permissionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Permission name is required.'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Permission unique code is required.'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    module: {
      type: String,
      required: [true, 'Module categorization is required.'],
      uppercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// ==========================================
// 3. RolePermission Mapping Schema Definition
// ==========================================
const rolePermissionSchema = new mongoose.Schema(
  {
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      required: [true, 'Role association is required.'],
      index: true,
    },
    permissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Permission',
      required: [true, 'Permission association is required.'],
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null, // Null indicates global default mapping; otherwise tenant custom override
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

rolePermissionSchema.index({ roleId: 1, permissionId: 1, organizationId: 1 }, { unique: true });

const Role = mongoose.model('Role', roleSchema);
const Permission = mongoose.model('Permission', permissionSchema);
const RolePermission = mongoose.model('RolePermission', rolePermissionSchema);

export { Role, Permission, RolePermission };
