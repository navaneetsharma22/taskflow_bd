import { User } from '../auth/model.js';

/**
 * USERS MODULE - DATA REPOSITORY (repository.js)
 * Responsibility: Handles queries and updates on User accounts.
 * Enforces strict tenant isolation constraints to secure partitioned SaaS states.
 */
class UserRepository {
  
  /**
   * Find a partitioned user by their ID
   */
  async findById(id, organizationId) {
    return User.findOne({ _id: id, organizationId }).lean();
  }

  /**
   * Find a partitioned user by their email
   */
  async findByEmail(email) {
    // Email is globally unique
    return User.findOne({ email: email.toLowerCase() }).lean();
  }

  /**
   * Find all users inside a specific tenant organization workspace (filtered + paginated)
   */
  async findAll(filter = {}, page = 1, limit = 10, organizationId) {
    const queryFilter = {
      ...filter,
      organizationId, // Enforce strict tenant boundary
    };

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(queryFilter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      User.countDocuments(queryFilter),
    ]);

    return { users, total };
  }

  /**
   * Creates a new user record
   */
  async create(userData) {
    return User.create(userData);
  }

  /**
   * Updates user profile parameters scoped to a tenant
   */
  async update(id, updateData, organizationId) {
    return User.findOneAndUpdate(
      { _id: id, organizationId },
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();
  }

  /**
   * Transition user status (Disable or enable user accounts)
   */
  async updateStatus(id, status, organizationId) {
    return User.findOneAndUpdate(
      { _id: id, organizationId },
      { $set: { status } },
      { new: true }
    ).lean();
  }

  /**
   * Find user matching employeeId inside a specific tenant
   */
  async findByEmployeeId(employeeId, organizationId) {
    return User.findOne({ employeeId, organizationId }).lean();
  }

  /**
   * Count total active users in an organization
   */
  async countUsers(organizationId) {
    return User.countDocuments({ organizationId });
  }
}

export default new UserRepository();
