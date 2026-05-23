import { User, UserSession } from './model.js';

/**
 * AUTH MODULE - DATA REPOSITORY (repository.js)
 * Responsibility: Isolates data persistence layers for User credentials and
 * active login Session states. Ensures that Mongoose model interfaces are not leaked.
 */
class AuthRepository {
  // ==========================================
  // 1. User Queries & Writes
  // ==========================================

  async findUserByEmail(email, includePassword = false) {
    const query = User.findOne({ email: email.toLowerCase() });
    if (includePassword) {
      query.select('+password');
    }
    return query.exec();
  }

  async findUserById(id) {
    return User.findById(id).exec();
  }

  async createUser(userData) {
    return User.create(userData);
  }

  async findUserByResetToken(token) {
    return User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+passwordResetToken +passwordResetExpires');
  }

  // ==========================================
  // 2. UserSession Queries & Writes
  // ==========================================

  async createSession(sessionData) {
    return UserSession.create(sessionData);
  }

  async findSessionByToken(token) {
    return UserSession.findOne({ refreshToken: token, isValid: true }).exec();
  }

  async invalidateSession(token) {
    return UserSession.findOneAndUpdate(
      { refreshToken: token },
      { isValid: false },
      { new: true }
    ).exec();
  }

  async invalidateAllUserSessions(userId) {
    return UserSession.updateMany(
      { userId, isValid: true },
      { isValid: false }
    ).exec();
  }

  async cleanExpiredSessions() {
    return UserSession.deleteMany({ expiresAt: { $lt: new Date() } }).exec();
  }
}

export default new AuthRepository();
