import jwt from 'jsonwebtoken';
import authRepository from './repository.js';
import config from '../../config/index.js';
import AppError from '../../utils/AppError.js';
import asyncHandler from '../../utils/asyncHandler.js';

/**
 * AUTH MODULE - SECURITY GUARD MIDDLEWARES (middleware.js)
 * Responsibility: Protects restricted endpoints by validating Bearer JWTs,
 * extracts current user details, registers tenant context scope boundaries (req.organizationId),
 * and enforces strict Role-Based Access Controls (RBAC).
 */

/**
 * Validates access token and ensures tenant partitions exist
 */
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // 1. Extract Bearer Token from HTTP Headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new AppError('Authentication failed. Access token is missing.', 401);
  }

  // 2. Cryptographically Verify Token
  let decoded;
  try {
    decoded = jwt.verify(token, config.jwt.secret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError('Access token has expired. Please refresh session.', 401);
    }
    throw new AppError('Invalid authentication token signature.', 401);
  }

  // 3. Ensure Token Owner still exists
  const currentUser = await authRepository.findUserById(decoded.id);
  if (!currentUser) {
    throw new AppError('The user associated with this credentials no longer exists.', 401);
  }

  // 4. Ensure Token Owner is Active
  if (currentUser.status !== 'ACTIVE') {
    throw new AppError('Your account has been suspended. Access revoked.', 403);
  }

  // 5. Establish Tenant Isolation Scope: Bind active user and organizationId to request pipeline
  req.user = {
    id: currentUser._id,
    name: currentUser.name,
    email: currentUser.email,
    role: currentUser.role,
  };
  req.organizationId = currentUser.organizationId.toString();

  next();
});

/**
 * Limits routes execution to specified authorization roles (RBAC Guard)
 */
export const restrictTo = (...allowedRoles) => {
  return (req, res, next) => {
    // protect middleware must execute first
    if (!req.user) {
      return next(new AppError('Core security guard bypass caught. Access denied.', 500));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError('Access denied. You do not possess the required system permissions.', 403)
      );
    }

    next();
  };
};
