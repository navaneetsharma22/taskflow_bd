import { Role, Permission, RolePermission } from './model.js';

/**
 * RBAC MODULE - DATA REPOSITORY (repository.js)
 * Responsibility: Handles queries on Roles, Permissions, and RolePermissions.
 * Optimized with lean lookups and strict multitenant filters.
 */
class RbacRepository {
  // ==========================================
  // 1. Role Operations
  // ==========================================

  async findRoleByCode(code, organizationId = null) {
    // Look up either tenant-specific custom role or global default role
    return Role.findOne({
      code: code.toUpperCase(),
      $or: [
        { organizationId },
        { organizationId: null }
      ]
    }).lean();
  }

  async findRoleById(id) {
    return Role.findById(id).lean();
  }

  async createRole(roleData) {
    return Role.create({
      ...roleData,
      code: roleData.code.toUpperCase()
    });
  }

  // ==========================================
  // 2. Permission Operations
  // ==========================================

  async findPermissionByCode(code) {
    return Permission.findOne({ code: code.toUpperCase() }).lean();
  }

  async createPermission(permissionData) {
    return Permission.create({
      ...permissionData,
      code: permissionData.code.toUpperCase()
    });
  }

  async findAllPermissions() {
    return Permission.find({}).lean();
  }

  // ==========================================
  // 3. Mapping Operations (RolePermissions)
  // ==========================================

  async createRolePermissionMapping(roleId, permissionId, organizationId = null) {
    return RolePermission.findOneAndUpdate(
      { roleId, permissionId, organizationId },
      { roleId, permissionId, organizationId },
      { upsert: true, new: true }
    ).exec();
  }

  /**
   * Dynamic Permission Loader Query
   * Pulls all permission documents mapped to a Role ID in the current tenant space
   * including both global default mapping and tenant-specific overrides.
   */
  async getPermissionsForRole(roleId, organizationId = null) {
    const mappings = await RolePermission.find({
      roleId,
      $or: [
        { organizationId },
        { organizationId: null }
      ]
    })
      .populate('permissionId')
      .lean();

    // Map populated arrays to return clean permission codes list
    return mappings
      .filter(m => m.permissionId)
      .map(m => m.permissionId.code);
  }

  /**
   * Direct Quick Verification
   * Uses compound index to verify if a specific role + permission exists in database
   */
  async verifyRoleHasPermission(roleId, permissionId, organizationId = null) {
    const exists = await RolePermission.findOne({
      roleId,
      permissionId,
      $or: [
        { organizationId },
        { organizationId: null }
      ]
    }).select('_id').lean();

    return !!exists;
  }
}

export default new RbacRepository();
