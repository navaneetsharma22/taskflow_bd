import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import authRepository from './repository.js';
import organizationService from '../organizations/service.js';
import { ROLES } from '../../constants/index.js';
import config from '../../config/index.js';
import AppError from '../../utils/AppError.js';
import logger from '../../utils/logger.js';

/**
 * AUTH MODULE - SERVICE LAYER (service.js)
 * Responsibility: Implements all security controls and business rules including:
 *   1. Multitenant checks (matching user organization partitions).
 *   2. Cryptographic password hashing/verification.
 *   3. Session creation, telemetry tracking, and token rotation security.
 *   4. JWT signing and session validation lifecycle.
 */
class AuthService {
  
  /**
   * Registers a new tenant user inside an active Organization workspace.
   */
  async register({ name, email, password, organizationCode }) {
    // 1. Resolve Organization Workspace
    const org = await organizationService.validateOrganizationCode(organizationCode);

    // 2. Prevent Duplicate Platform Registrations
    const existingUser = await authRepository.findUserByEmail(email);
    if (existingUser) {
      throw new AppError('Email address is already registered on this platform.', 409);
    }

    // 3. Create Partitioned User (SECURITY: role is always DEVELOPER — admin assignment via RBAC)
    const newUser = await authRepository.createUser({
      name,
      email,
      password,
      organizationId: org._id,
    });

    logger.info(`Auth: New user successfully registered [ID: ${newUser._id}] under Organization: ${org.name}`);
    
    // Return sanitized data
    return {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      organizationId: newUser.organizationId,
    };
  }

  /**
   * Performs multitenant logins, validating organization membership and registering user session.
   */

  async login({ email, password, organizationCode, employeeId, device, ipAddress }) {
    if (!email) {
      throw new AppError('Email address is required to login.', 400);
    }

    // 1. Fetch User by Email globally
    const user = await authRepository.findUserByEmail(email, true);
    if (!user) {
      throw new AppError('Invalid credentials or unauthorized workspace partition.', 401);
    }

    // 2. Resolve Organization from user's record
    const org = await organizationService.getOrganizationById(user.organizationId);
    if (!org) {
      throw new AppError('Associated workspace organization not found.', 404);
    }

    // 3. Super Admin Route Restriction
    if (user.role === ROLES.SUPER_ADMIN) {
      if (!organizationCode || organizationCode.toUpperCase() !== org.code.toUpperCase()) {
        throw new AppError('Super Admin accounts must sign in through the dedicated Platform Control Center.', 401);
      }
    }

    // 4. Employee ID Verification (if configured on the account)
    if (user.employeeId) {
      const cleanInputId = String(employeeId || '').trim();
      if (!cleanInputId || user.employeeId.trim().toLowerCase() !== cleanInputId.toLowerCase()) {
        throw new AppError('A valid Employee ID is required to log into this account.', 401);
      }
    }

    if (org.status === 'SUSPENDED') {
      throw new AppError('Workspace has been suspended. Please contact platform administrators.', 403);
    }
    if (org.status === 'TRIAL_EXPIRED') {
      throw new AppError('Your organization free trial has expired. Update subscription plan to reactivate.', 402);
    }

    // 4. Verify Active Status
    if (user.status !== 'ACTIVE') {
      throw new AppError('Your account has been suspended. Please contact support.', 403);
    }

    // 5. Verify Password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AppError('Invalid credentials or unauthorized workspace partition.', 401);
    }

    // 6. Generate JWT Telemetry Tokens
    const { accessToken, refreshToken, expiresAt } = this._generateTokens(user);

    // 7. Register UserSession details for telemetry and revocation control
    await authRepository.createSession({
      userId: user._id,
      organizationId: user.organizationId,
      refreshToken,
      device,
      ipAddress,
      expiresAt,
    });

    logger.info(`Auth: Successful session registered for User: ${user.email} [IP: ${ipAddress}]`);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
    };
  }

  /**
   * Refreshes active sessions implementing automated Refresh Token Rotation.
   */
  async refreshSession({ token, device, ipAddress }) {
    // 1. Verify Token Presence in db session pool
    const activeSession = await authRepository.findSessionByToken(token);
    if (!activeSession) {
      throw new AppError('Session expired or token signature is invalid.', 401);
    }

    // 2. Validate cryptographic signature of refresh token
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.refreshSecret);
    } catch (err) {
      // Invalidate compromised token sessions to prevent replays
      await authRepository.invalidateSession(token);
      throw new AppError('Authentication session signature validation failed.', 401);
    }

    // 3. Verify user membership boundaries
    const user = await authRepository.findUserById(decoded.id);
    if (!user || user.status !== 'ACTIVE') {
      throw new AppError('User account suspended or missing.', 401);
    }

    // 4. ROTATION SECURITY: Invalidate current refresh token session
    await authRepository.invalidateSession(token);

    // 5. Build brand-new JWTs
    const { accessToken, refreshToken: newRefreshToken, expiresAt } = this._generateTokens(user);

    // 6. Save new Session record
    await authRepository.createSession({
      userId: user._id,
      organizationId: user.organizationId,
      refreshToken: newRefreshToken,
      device,
      ipAddress,
      expiresAt,
    });

    logger.info(`Auth: Rotated token session for User: ${user.email} [IP: ${ipAddress}]`);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Terminates active session.
   */
  async logout(token) {
    if (!token) throw new AppError('Refresh token is required to invalidate session.', 400);
    await authRepository.invalidateSession(token);
    logger.info('Auth: Session terminated successfully.');
  }

  /**
   * Generates a password recovery reset token.
   */
  async forgotPassword(email) {
    const user = await authRepository.findUserByEmail(email);
    if (!user) {
      // Prevent user enumeration attacks: return generic success indicators
      logger.warn(`Auth: Reset attempted on unregistered recovery address: ${email}`);
      return { success: true };
    }

    // Generate clean cryptographic reset hex
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Token expires in 1 hour
    user.passwordResetToken = hashedResetToken;
    user.passwordResetExpires = Date.now() + 3600000;
    await user.save({ validateBeforeSave: false });

    logger.info(`Auth: Generated password recovery token for: ${email}`);

    // SECURITY: Token is dispatched via email service only — NEVER returned in API response.
    // TODO: Integrate emailService.sendPasswordResetEmail(email, resetToken);
    return {
      message: 'If the email is registered, a recovery link has been sent.',
    };
  }

  /**
   * Resets credentials utilizing recovery tokens.
   */
  async resetPassword({ token, password }) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    const user = await authRepository.findUserByResetToken(hashedToken);
    if (!user) {
      throw new AppError('Recovery token has expired or is invalid.', 400);
    }

    // Apply new credentials
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // SECURITY BEST PRACTICE: Revoke all active login sessions immediately
    await authRepository.invalidateAllUserSessions(user._id);

    logger.info(`Auth: Credentials successfully updated for User: ${user.email}. Revoked all active sessions.`);
  }

  // ==========================================
  // Private Tokens Generator Helpers
  // ==========================================
  _generateTokens(user) {
    const accessToken = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        role: user.role, 
        organizationId: user.organizationId 
      },
      config.jwt.secret,
      { expiresIn: config.jwt.accessExpiry }
    );

    const refreshToken = jwt.sign(
      { id: user._id, organizationId: user.organizationId },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiry }
    );

    // Calculate expiry date object matching configuration values
    const days = parseInt(config.jwt.refreshExpiry, 10) || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    return {
      accessToken,
      refreshToken,
      expiresAt,
    };
  }
}

export default new AuthService();
