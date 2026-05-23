import projectRepository from './repository.js';
import organizationService from '../organizations/service.js';
import { PLAN_LIMITS, SUBSCRIPTION_PLANS, PROJECT_STATUS } from '../../constants/index.js';
import AppError from '../../utils/AppError.js';
import logger from '../../utils/logger.js';

/**
 * PROJECTS MODULE - SERVICE LAYER (service.js)
 * Responsibility: Implements all project life-cycle calculations, including:
 *   1. Automated unique project code generations based on name initials.
 *   2. Subscription limits check per organization tier.
 *   3. Dynamic Project Health Score evaluations relative to deadlines.
 *   4. Computer Science DFS cycle-detection for Project Dependencies.
 */
class ProjectService {
  
  /**
   * Generates a unique short uppercase identifier code from a project name
   */
  async generateProjectCode(name, organizationId) {
    // Keep only alphanumeric characters, convert to uppercase
    const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    
    // Extract base abbreviation (3 characters)
    let baseCode = cleanName.substring(0, 3);
    if (baseCode.length < 3) {
      baseCode = (baseCode + 'PRJ').substring(0, 3);
    }

    let code = baseCode;
    let sequence = 101;
    let isUnique = false;

    while (!isUnique) {
      const exists = await projectRepository.findAll({ code }, 1, 1, organizationId);
      if (exists.total === 0) {
        isUnique = true;
      } else {
        code = `${baseCode}-${sequence}`;
        sequence += 1;
      }
    }

    return code;
  }

  /**
   * Instantiates a new project workspace under organizational tier limits.
   */
  async createProject(projectData, ownerId, organizationId) {
    // 1. Enforce Subscription limits check
    const org = await organizationService.getOrganizationById(organizationId);
    const activeProjects = await projectRepository.countProjects(organizationId);

    const limits = PLAN_LIMITS[org.subscriptionPlan] || PLAN_LIMITS[SUBSCRIPTION_PLANS.FREE_TRIAL];
    if (activeProjects >= limits.maxProjects) {
      throw new AppError(`Project limit reached. Your '${org.subscriptionPlan}' plan permits up to ${limits.maxProjects} projects.`, 403);
    }

    // 2. Validate Dates
    const startDate = new Date(projectData.startDate);
    const endDate = new Date(projectData.endDate);

    if (endDate <= startDate) {
      throw new AppError('Project deadline (end date) must be strictly after the start date.', 400);
    }

    // 3. Auto Generate Unique Project short code
    const code = await this.generateProjectCode(projectData.name, organizationId);

    // 4. Templates Default Initializer (Scrum / Kanban / Waterfall)
    let templateDescription = projectData.description || '';
    if (projectData.template === 'SCRUM') {
      templateDescription += '\n\n-- SCRUM CONFIGURATION --\n* Sprint Duration: 2 Weeks\n* Backlog Items: Ready\n* Review Cycle: Friday';
    } else if (projectData.template === 'KANBAN') {
      templateDescription += '\n\n-- KANBAN CONFIGURATION --\n* Active WIP limits: 5\n* Columns: To Do | In Progress | In Review | Done';
    }

    const newProject = await projectRepository.create({
      ...projectData,
      description: templateDescription,
      code,
      ownerId,
      organizationId,
      status: PROJECT_STATUS.PLANNING,
      healthScore: 100, // Starts fully healthy
    });

    logger.info(`Project: Created project workspace [Code: ${code}] in Org ID: ${organizationId}`);
    return newProject;
  }

  /**
   * Updates project details, automatically recalculating project health scores.
   */
  async updateProject(id, updateData, organizationId) {
    const project = await projectRepository.findByIdRaw(id, organizationId);
    if (!project) {
      throw new AppError('Project not found or workspace boundary mismatch.', 404);
    }

    if (updateData.startDate || updateData.endDate) {
      const start = new Date(updateData.startDate || project.startDate);
      const end = new Date(updateData.endDate || project.endDate);
      if (end <= start) {
        throw new AppError('Project deadline must be strictly after the start date.', 400);
      }
    }

    const updated = await projectRepository.update(id, updateData, organizationId);
    
    // Automatically evaluate health score on dates/status modifications
    await this.calculateProjectHealth(id, organizationId);

    return updated;
  }

  /**
   * Soft-archives project by moving status to ARCHIVED state.
   */
  async archiveProject(id, organizationId) {
    const project = await projectRepository.findByIdRaw(id, organizationId);
    if (!project) {
      throw new AppError('Project not found or workspace boundary mismatch.', 404);
    }

    project.status = PROJECT_STATUS.ARCHIVED;
    await project.save();

    logger.warn(`Project: Archived project [ID: ${id}] in Org ID: ${organizationId}`);
    return project;
  }

  /**
   * Pure CS DFS Cycle Detection Algorithm
   * Verifies if adding a project dependency introduces circular loops.
   */
  async checkCircularDependency(projectId, targetDependencyId, organizationId) {
    const visited = new Set();
    const stack = new Set();

    const dfs = async (currentId) => {
      visited.add(currentId);
      stack.add(currentId);

      const proj = await projectRepository.findByIdRaw(currentId, organizationId);
      if (proj && proj.dependencies && proj.dependencies.length > 0) {
        for (const depId of proj.dependencies) {
          const stringId = depId.toString();
          
          if (stringId === projectId.toString()) {
            return true; // Cycle detected: child leads back to root!
          }

          if (!visited.has(stringId)) {
            if (await dfs(stringId)) return true;
          } else if (stack.has(stringId)) {
            return true; // Cycle inside nested paths
          }
        }
      }

      stack.delete(currentId);
      return false;
    };

    // Begin check starting from the target dependency
    return dfs(targetDependencyId.toString());
  }

  /**
   * Registers a project dependency, preventing circular referencing.
   */
  async addProjectDependency(projectId, dependencyId, organizationId) {
    if (projectId.toString() === dependencyId.toString()) {
      throw new AppError('A project cannot depend on itself.', 400);
    }

    const [project, dependency] = await Promise.all([
      projectRepository.findByIdRaw(projectId, organizationId),
      projectRepository.findByIdRaw(dependencyId, organizationId),
    ]);

    if (!project || !dependency) {
      throw new AppError('One or both project workspaces were not found in this organization.', 404);
    }

    // Check if mapping already exists
    if (project.dependencies.includes(dependencyId)) {
      throw new AppError('Dependency is already registered.', 400);
    }

    // Run DFS circular loop validation
    const hasCycle = await this.checkCircularDependency(projectId, dependencyId, organizationId);
    if (hasCycle) {
      throw new AppError('Circular dependency violation. Target project has ancestral references mapping back to this workspace.', 409);
    }

    // Append dependency
    project.dependencies.push(dependencyId);
    await project.save();

    logger.info(`Project Dependency: Configured [Project: ${project.code}] depends on [Dependency: ${dependency.code}]`);
    return projectRepository.findById(projectId, organizationId);
  }

  /**
   * Dynamic Health Score & Deadline Telemetry Evaluator
   * Computes health score from deadline proximities.
   */
  async calculateProjectHealth(projectId, organizationId) {
    const project = await projectRepository.findByIdRaw(projectId, organizationId);
    if (!project) return;

    // Completed or Archived projects default to healthy status
    if (project.status === PROJECT_STATUS.COMPLETED || project.status === PROJECT_STATUS.ARCHIVED) {
      project.healthScore = 100;
      await project.save();
      return;
    }

    const today = new Date();
    const deadline = new Date(project.endDate);

    let score = 100;

    // 1. Check Overdue Threshold
    if (today > deadline) {
      score = 25; // CRITICAL state
    } else {
      // 2. Check Approaching Warning Threshold (Within 3 days)
      const diffTime = Math.abs(deadline - today);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 3) {
        score = 60; // WARNING state
      }
    }

    project.healthScore = score;
    await project.save();

    logger.debug(`Project Health: Recalculated Health Score for [Project Code: ${project.code}] to: ${score}`);
  }

  /**
   * Lists projects in organization.
   */
  async listProjects(filter, page, limit, organizationId) {
    return projectRepository.findAll(filter, page, limit, organizationId);
  }

  /**
   * Retrieves specific project context.
   */
  async getProjectById(id, organizationId) {
    const proj = await projectRepository.findById(id, organizationId);
    if (!proj) {
      throw new AppError('Project workspace not found in this organization.', 404);
    }
    return proj;
  }
}

export default new ProjectService();
