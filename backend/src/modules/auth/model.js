import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from '../../constants/index.js';

/**
 * AUTH MODULE - DATABASE MODELS (model.js)
 * Responsibility: Defines Mongoose schemas, properties, indexes, and methods 
 * for Users and UserSessions (device and session security tracking).
 * Extended to support full enterprise User profiles (Skills, Departments, Employee IDs).
 */

// ==========================================
// 1. User Schema Definition
// ==========================================
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'User name is required.'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters.'],
    },
    email: {
      type: String,
      required: [true, 'User email is required.'],
      unique: true, // Unique across the platform
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required.'],
      minlength: [8, 'Password must be at least 8 characters long.'],
      select: false, // Prevents password from leaking in standard finds
    },
    role: {
      type: String,
      enum: {
        values: Object.values(ROLES),
        message: 'Invalid authorization role.',
      },
      default: ROLES.DEVELOPER,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'User must belong to an Organization tenant.'],
      index: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED'],
      default: 'ACTIVE',
      index: true,
    },
    // Profile Customizations
    profilePhoto: {
      type: String,
      default: '', // URL or base64 representation
    },
    skills: {
      type: [String],
      default: [],
    },
    department: {
      type: String,
      trim: true,
      default: 'General',
    },
    designation: {
      type: String,
      trim: true,
      default: 'Team Member',
    },
    employeeId: {
      type: String,
      trim: true,
      index: true, // Scoped lookup within tenant
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound Index: Employee ID must be unique within a single Organization tenant workspace
userSchema.index({ employeeId: 1, organizationId: 1 }, { unique: true, sparse: true });

// Mongoose Pre-Save Hook: Automatically hash password on create/update
userSchema.pre('save', async function (next) {
  // Only hash password if it has been modified
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Mongoose Instance Method: Verify candidates password match
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ==========================================
// 2. UserSession Schema Definition
// ==========================================
const userSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    refreshToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    device: {
      type: String,
      default: 'Unknown Device',
    },
    ipAddress: {
      type: String,
      default: '0.0.0.0',
    },
    isValid: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);
const UserSession = mongoose.model('UserSession', userSessionSchema);

export { User, UserSession };
