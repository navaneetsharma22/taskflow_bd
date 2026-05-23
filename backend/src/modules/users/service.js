import userRepository from './repository.js';
import organizationService from '../organizations/service.js';
import authRepository from '../auth/repository.js';
import AppError from '../../utils/AppError.js';
import logger from '../../utils/logger.js';

/**
 * USERS MODULE - SERVICE LAYER (service.js)
 * Responsibility: Implements all user profile configurations, including:
 *   1. Automated unique Employee ID generations.
 *   2. Headcount limits enforcement based on subscription limits.
 *   3. Bulk CSV import parsing and validation.
 *   4. Profile updates, account suspensions, and organizational boundary checks.
 */
class UserService {
  
  /**
   * Generates a unique sequential Employee ID for a tenant (e.g. EMP-10005)
   */
  async generateEmployeeId(organizationId) {
    const totalCount = await userRepository.countUsers(organizationId);
    let sequence = totalCount + 10001; // Start counting from 10001
    let employeeId = `EMP-${sequence}`;
    
    // Ensure uniqueness by looping (fail-safe checks)
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      const exists = await userRepository.findByEmployeeId(employeeId, organizationId);
      if (!exists) {
        isUnique = true;
      } else {
        sequence += 1;
        employeeId = `EMP-${sequence}`;
        attempts += 1;
      }
    }

    return employeeId;
  }

  /**
   * Creates a new user profile inside a tenant, checking user limits.
   */
  async createUser(userData, organizationId) {
    // 1. Enforce Subscription User Limits Boundaries
    const org = await organizationService.getOrganizationById(organizationId);
    const activeHeadcount = await userRepository.countUsers(organizationId);

    if (org.settings && org.settings.userLimit && activeHeadcount >= org.settings.userLimit) {
      throw new AppError(`Headcount limit reached. Your subscription allows up to ${org.settings.userLimit} users. Please upgrade.`, 403);
    }

    // 2. Prevent Email Duplications
    const existing = await userRepository.findByEmail(userData.email);
    if (existing) {
      throw new AppError(`Email address '${userData.email}' is already registered.`, 409);
    }

    // 3. Auto Generate Unique Employee ID if not supplied
    if (!userData.employeeId) {
      userData.employeeId = await this.generateEmployeeId(organizationId);
    } else {
      // Validate provided ID uniqueness within tenant
      const exists = await userRepository.findByEmployeeId(userData.employeeId, organizationId);
      if (exists) {
        throw new AppError(`Employee ID '${userData.employeeId}' is already allocated inside this organization.`, 409);
      }
    }

    // 4. Assign Default Password if missing (for dashboard administrative creations)
    const password = userData.password || 'TaskFlow@12345';

    const newUser = await userRepository.create({
      ...userData,
      password,
      organizationId,
      status: 'ACTIVE',
    });

    logger.info(`User: Created user [ID: ${newUser._id}, EmpID: ${newUser.employeeId}] in Org ID: ${organizationId}`);

    return {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      employeeId: newUser.employeeId,
      role: newUser.role,
      department: newUser.department,
      designation: newUser.designation,
      skills: newUser.skills,
    };
  }

  /**
   * Updates user profile configurations.
   */
  async updateUserProfile(id, updateData, organizationId) {
    const allowedUpdates = [
      'name',
      'profilePhoto',
      'skills',
      'department',
      'designation',
    ];

    // Filter updates
    const sanitizedData = {};
    Object.keys(updateData).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        sanitizedData[key] = updateData[key];
      }
    });

    const updatedUser = await userRepository.update(id, sanitizedData, organizationId);
    if (!updatedUser) {
      throw new AppError('User profile not found or workspace boundary mismatch.', 404);
    }

    logger.info(`User: Updated user profile details for ID: ${id}`);
    return updatedUser;
  }

  /**
   * Disables user account, blocking authorization access and invalidating sessions immediately.
   */
  async disableUser(id, organizationId) {
    const disabledUser = await userRepository.updateStatus(id, 'SUSPENDED', organizationId);
    if (!disabledUser) {
      throw new AppError('User profile not found or workspace boundary mismatch.', 404);
    }

    // SECURITY BEST PRACTICE: Revoke all active login sessions for disabled user immediately
    await authRepository.invalidateAllUserSessions(id);

    logger.warn(`User: Account Suspended and sessions invalidated for User ID: ${id} in Org ID: ${organizationId}`);
    return disabledUser;
  }

  /**
   * Enables user account back to ACTIVE status.
   */
  async enableUser(id, organizationId) {
    const enabledUser = await userRepository.updateStatus(id, 'ACTIVE', organizationId);
    if (!enabledUser) {
      throw new AppError('User profile not found or workspace boundary mismatch.', 404);
    }

    logger.info(`User: Account reactivated for User ID: ${id}`);
    return enabledUser;
  }

  /**
   * Fetches user profile context.
   */
  async getUserById(id, organizationId) {
    const user = await userRepository.findById(id, organizationId);
    if (!user) {
      throw new AppError('User profile not found.', 404);
    }
    return user;
  }

  /**
   * Lists users in a workspace.
   */
  async listUsers(filter, page, limit, organizationId) {
    return userRepository.findAll(filter, page, limit, organizationId);
  }

  /**
   * Parses and imports profiles in bulk using a CSV text block.
   * CSV Schema: name,email,role,department,designation,skills (comma separated)
   */
  async importUsersFromCSV(csvText, organizationId) {
    if (!csvText) {
      throw new AppError('CSV string block payload is required.', 400);
    }

    // Split rows, filtering out empty headers
    const lines = csvText.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
    if (lines.length <= 1) {
      throw new AppError('CSV payload must contain a header row and at least one user record row.', 400);
    }

    const headers = lines[0].toLowerCase().split(',').map((h) => h.trim());
    
    const successes = [];
    const failures = [];

    // Enforce limits checks
    const org = await organizationService.getOrganizationById(organizationId);
    const maxAllowed = org.settings && org.settings.userLimit ? org.settings.userLimit : 1000;

    for (let i = 1; i < lines.length; i++) {
      const activeCount = await userRepository.countUsers(organizationId);
      if (activeCount + successes.length >= maxAllowed) {
        failures.push({
          row: i + 1,
          email: 'N/A',
          error: `Failed to import. Headcount limit of ${maxAllowed} reached.`,
        });
        continue;
      }

      const columns = lines[i].split(',').map((c) => c.trim());
      
      // Match columns with header maps
      const rowData = {};
      headers.forEach((header, index) => {
        rowData[header] = columns[index] || '';
      });

      try {
        // Validate minimal mandatory rows
        if (!rowData.name || !rowData.email) {
          throw new Error('Name and email parameters are required.');
        }

        // Skills parse (comma-separated within row block, e.g. "React|Node" or semicolon separated)
        let skillsArray = [];
        if (rowData.skills) {
          skillsArray = rowData.skills.split(/[;|]/).map((s) => s.trim()).filter((s) => s.length > 0);
        }

        const employeeId = await this.generateEmployeeId(organizationId);

        const newUser = await this.createUser({
          name: rowData.name,
          email: rowData.email,
          role: rowData.role ? rowData.role.toUpperCase() : 'DEVELOPER',
          department: rowData.department || 'General',
          designation: rowData.designation || 'Team Member',
          skills: skillsArray,
          employeeId,
        }, organizationId);

        successes.push(newUser);
      } catch (err) {
        failures.push({
          row: i + 1,
          email: rowData.email || 'Unknown',
          error: err.message,
        });
      }
    }

    logger.info(`User Bulk CSV: Completed bulk imports in Org ID: ${organizationId}. Successes: ${successes.length}, Failures: ${failures.length}`);

    return {
      successCount: successes.length,
      failureCount: failures.length,
      successes,
      failures,
    };
  }
}

export default new UserService();
