import crypto from 'crypto';
import rbacRepository from './repository.js';
import userRepository from '../users/repository.js';
import authRepository from '../auth/repository.js';
import { ROLES } from '../../constants/index.js';
import { Role, Permission, RolePermission } from './model.js';
import AppError from '../../utils/AppError.js';
import logger from '../../utils/logger.js';

/**
 * RBAC MODULE - SERVICE LAYER (service.js)
 * Responsibility: Executes permission checks, handles dynamic loading of permissions,
 * and seeds system default privileges and mapping allocations.
 * Extended to support complete Role Management with dynamic Hierarchy weights validation.
 */
class RbacService {
  
  /**
   * Resolves whether a given role holds a specific permission in a tenant space.
   */
  async checkPermission(roleCode, permissionCode, organizationId = null) {
    if (!roleCode || !permissionCode) return false;

    const role = await rbacRepository.findRoleByCode(roleCode, organizationId);
    if (!role) return false;

    const permission = await rbacRepository.findPermissionByCode(permissionCode);
    if (!permission) return false;

    return rbacRepository.verifyRoleHasPermission(role._id, permission._id, organizationId);
  }

  /**
   * Dynamic Permission Loader Service
   */
  async loadPermissions(roleCode, organizationId = null) {
    const role = await rbacRepository.findRoleByCode(roleCode, organizationId);
    if (!role) return [];

    return rbacRepository.getPermissionsForRole(role._id, organizationId);
  }

  // ==========================================
  // ROLE MANAGEMENT SYSTEM OPERATIONS
  // ==========================================

  /**
   * Lists all roles accessible in a tenant (Global defaults + Tenant customs)
   */
  async listRoles(organizationId) {
    return Role.find({
      $or: [
        { organizationId },
        { organizationId: null }
      ]
    }).sort({ weight: -1 }).lean();
  }

  /**
   * Creates a custom tenant-specific role.
   */
  async createCustomRole({ name, code, weight = 10, description }, organizationId) {
    // 1. Enforce Role Hierarchy boundaries
    if (weight >= 80) {
      throw new AppError('Tenant custom roles weights must be strictly below 80 (Org Admin limit).', 400);
    }

    // 2. Validate code format
    const uppercaseCode = code.toUpperCase().replace(/\s+/g, '_');

    // 3. Ensure role doesn't exist in tenant scope
    const existing = await Role.findOne({ code: uppercaseCode, organizationId });
    if (existing) {
      throw new AppError(`A custom role with code '${uppercaseCode}' already exists in your workspace.`, 409);
    }

    const newRole = await Role.create({
      name,
      code: uppercaseCode,
      weight,
      description,
      organizationId,
    });

    logger.info(`RBAC Role: Created custom role [Code: ${uppercaseCode}] in Organization ID: ${organizationId}`);
    return newRole;
  }

  /**
   * Modifies a custom tenant-specific role.
   */
  async updateCustomRole(id, { name, weight, description }, organizationId) {
    const role = await Role.findById(id);
    if (!role) {
      throw new AppError('Role not found.', 404);
    }

    // Enforce tenant boundary: Cannot edit platform global roles or roles of other tenants
    if (!role.organizationId || role.organizationId.toString() !== organizationId) {
      throw new AppError('Security violation. Global system roles cannot be modified.', 403);
    }

    if (weight !== undefined) {
      if (weight >= 80) {
        throw new AppError('Role hierarchy weight level must be strictly below 80.', 400);
      }
      role.weight = weight;
    }

    if (name) role.name = name;
    if (description) role.description = description;

    await role.save();
    logger.info(`RBAC Role: Modified custom role ID: ${id}`);
    
    return role;
  }

  /**
   * Deletes a custom tenant-specific role and purges mappings.
   */
  async deleteCustomRole(id, organizationId) {
    const role = await Role.findById(id);
    if (!role) {
      throw new AppError('Role not found.', 404);
    }

    // Security check: Only custom tenant roles can be deleted
    if (!role.organizationId || role.organizationId.toString() !== organizationId) {
      throw new AppError('Security violation. Global system roles cannot be deleted.', 403);
    }

    // Prevent deleting a role that is currently allocated to active users
    const usersCount = await userRepository.countUsers(organizationId); // Scoped count check
    // In a real database, we check: User.countDocuments({ role: role.code, organizationId })
    const activeHolds = await Role.model('User').countDocuments({ role: role.code, organizationId });
    if (activeHolds > 0) {
      throw new AppError(`Cannot delete role '${role.code}'. It is currently assigned to ${activeHolds} active team members.`, 400);
    }

    // Clean up mapping records
    await RolePermission.deleteMany({ roleId: role._id, organizationId });
    await role.deleteOne();

    logger.warn(`RBAC Role: Purged custom role [Code: ${role.code}] from Org ID: ${organizationId}`);
  }

  /**
   * Assigns a role to a target user, enforcing Role Hierarchy protection rules.
   */
  async assignRoleToUser(executingUser, targetUserId, newRoleCode, organizationId) {
    // 1. Fetch Target User
    const targetUser = await userRepository.findById(targetUserId, organizationId);
    if (!targetUser) {
      throw new AppError('Target team member not found in your organization partition.', 404);
    }

    // 2. Load Executing user's role weight
    const execRole = await rbacRepository.findRoleByCode(executingUser.role, organizationId);
    const execWeight = execRole ? execRole.weight : 0;

    // 3. Load Target user's current role weight
    const targetRole = await rbacRepository.findRoleByCode(targetUser.role, organizationId);
    const targetWeight = targetRole ? targetRole.weight : 0;

    // 4. Load New Role's weight
    const newRole = await rbacRepository.findRoleByCode(newRoleCode, organizationId);
    if (!newRole) {
      throw new AppError(`Role '${newRoleCode}' does not exist.`, 404);
    }
    const newWeight = newRole.weight;

    // 5. ROLE HIERARCHY ESCALATION CHECKS
    // Executing user must have a strictly higher authority weight than both the target user's current weight AND the weight of the role being assigned!
    if (execWeight <= targetWeight) {
      throw new AppError('Access Denied. You do not hold sufficient hierarchy level authority over this team member.', 403);
    }

    if (execWeight <= newWeight) {
      throw new AppError('Access Denied. You cannot assign a role with a hierarchy weight superior or equal to your own.', 403);
    }

    // 6. Update user's role code
    targetUser.role = newRole.code;
    await targetUser.save();

    // 7. Security: Revoke all active login sessions of the target user to force fresh token checks
    await authRepository.invalidateAllUserSessions(targetUserId);

    logger.warn(`RBAC Role Assignment: User ${executingUser.email} reassigned User ${targetUser.email} to Role: ${newRole.code}`);
    
    return {
      userId: targetUser._id,
      email: targetUser.email,
      role: targetUser.role,
    };
  }

  // ==========================================
  // Core Seeding Script
  // ==========================================
  async seedDefaultRbacData() {
    logger.info('RBAC: Inspecting database seed telemetry...');

    try {
      // 1. Define standard system permissions
      const defaultPermissions = [
        { name: 'Manage Subscription plans', code: 'MANAGE_SUBSCRIPTION', module: 'ADMIN', description: 'Modify billing plans and limits (Super Admin only).' },
        { name: 'Manage Organization settings', code: 'MANAGE_ORGANIZATION', module: 'ORG', description: 'Update organization policies and departments.' },
        { name: 'Import Employees', code: 'IMPORT_EMPLOYEES', module: 'ORG', description: 'Import team profiles via CSV.' },
        
        { name: 'Create Projects', code: 'CREATE_PROJECT', module: 'PROJECTS', description: 'Instantiate new project workspaces.' },
        { name: 'Edit Projects', code: 'EDIT_PROJECT', module: 'PROJECTS', description: 'Modify project details and health scores.' },
        { name: 'Delete Projects', code: 'DELETE_PROJECT', module: 'PROJECTS', description: 'Archive/Delete projects.' },
        
        { name: 'Create Tasks', code: 'CREATE_TASK', module: 'TASKS', description: 'Add new tasks to boards.' },
        { name: 'Update Tasks status', code: 'UPDATE_TASK', module: 'TASKS', description: 'Update priority, state workflow, or assignments.' },
        { name: 'Approve Tasks', code: 'APPROVE_TASK', module: 'TASKS', description: 'Approve completed tasks.' },
        { name: 'Delete Tasks', code: 'DELETE_TASK', module: 'TASKS', description: 'Remove task items.' },
        
        { name: 'View Audit logs', code: 'VIEW_AUDIT_LOGS', module: 'LOGS', description: 'Inspect system modifications timeline.' },
      ];

      const seededPermissions = {};
      for (const p of defaultPermissions) {
        let permDoc = await rbacRepository.findPermissionByCode(p.code);
        if (!permDoc) {
          permDoc = await rbacRepository.createPermission(p);
          logger.info(`RBAC: Seeded system permission: [${p.code}]`);
        }
        seededPermissions[p.code] = permDoc._id;
      }

      // 2. Define standard global roles with hierarchical weights
      const defaultRoles = [
        { name: 'Super Administrator', code: ROLES.SUPER_ADMIN, weight: 100, description: 'SaaS Platform Owner. Global master control.' },
        { name: 'Organization Administrator', code: ROLES.ORG_ADMIN, weight: 80, description: 'Tenant Administrator. Full local organization control.' },
        { name: 'Project Manager', code: ROLES.PROJECT_MANAGER, weight: 60, description: 'Manage multiple project workspaces and timelines.' },
        { name: 'Team Lead', code: ROLES.TEAM_LEAD, weight: 40, description: 'Direct developer tasks assignments and approvals.' },
        { name: 'Developer Engineer', code: ROLES.DEVELOPER, weight: 20, description: 'Update and write code. Move tasks to review.' },
      ];

      const seededRoles = {};
      for (const r of defaultRoles) {
        let roleDoc = await rbacRepository.findRoleByCode(r.code, null);
        if (!roleDoc) {
          roleDoc = await rbacRepository.createRole(r);
          logger.info(`RBAC: Seeded global role: [${r.code}] with weight: ${r.weight}`);
        } else if (roleDoc.weight !== r.weight) {
          // Sync/Update weights on existing roles in case they don't match
          await Role.updateOne({ _id: roleDoc._id }, { $set: { weight: r.weight } });
          logger.info(`RBAC: Updated global role: [${r.code}] weight hierarchy to: ${r.weight}`);
        }
        seededRoles[r.code] = roleDoc._id;
      }

      // 3. Map Default Mappings
      const roleMappings = {
        [ROLES.SUPER_ADMIN]: Object.keys(seededPermissions),
        [ROLES.ORG_ADMIN]: [
          'MANAGE_ORGANIZATION',
          'IMPORT_EMPLOYEES',
          'CREATE_PROJECT',
          'EDIT_PROJECT',
          'CREATE_TASK',
          'UPDATE_TASK',
          'APPROVE_TASK',
          'VIEW_AUDIT_LOGS'
        ],
        [ROLES.PROJECT_MANAGER]: [
          'CREATE_PROJECT',
          'EDIT_PROJECT',
          'CREATE_TASK',
          'UPDATE_TASK',
          'APPROVE_TASK'
        ],
        [ROLES.TEAM_LEAD]: [
          'CREATE_TASK',
          'UPDATE_TASK',
          'APPROVE_TASK'
        ],
        [ROLES.DEVELOPER]: [
          'UPDATE_TASK'
        ],
      };

      for (const [roleCode, permCodes] of Object.entries(roleMappings)) {
        const roleId = seededRoles[roleCode];
        for (const pCode of permCodes) {
          const permissionId = seededPermissions[pCode];
          if (roleId && permissionId) {
            await rbacRepository.createRolePermissionMapping(roleId, permissionId, null);
          }
        }
      }

      logger.info('RBAC: Seeding sequence successfully completed.');
    } catch (error) {
      logger.error(`RBAC: Seeding error encountered: ${error.message}`);
    }
  }
}

export default new RbacService();
