import milestoneRepository from './repository.js';
import projectService from '../projects/service.js';
import AppError from '../../utils/AppError.js';
import logger from '../../utils/logger.js';
import Task from '../tasks/model.js';

/**
 * MILESTONES MODULE - SERVICE LAYER (service.js)
 * Responsibility: Implements core Milestone business logic:
 *   1. Calculating progress dynamically relative to associated tasks completion.
 *   2. Auto-transitioning milestone status to ACHIEVED when progress reaches 100%.
 *   3. Evaluating alerts for approaching or overdue milestones (DELAYED status).
 *   4. Scoping calculations cleanly within tenant boundaries.
 */
class MilestoneService {
  
  /**
   * Creates a new milestone inside a project workspace
   */
  async createMilestone(milestoneData, organizationId) {
    // Verify project context exists in tenant
    await projectService.getProjectById(milestoneData.projectId, organizationId);

    const newMilestone = await milestoneRepository.create({
      ...milestoneData,
      organizationId,
      status: 'UPCOMING',
      progress: 0,
    });

    logger.info(`Milestone: Created milestone [Title: ${newMilestone.title}] in Org ID: ${organizationId}`);
    return newMilestone;
  }

  /**
   * Updates milestone configurations, automatically triggers progress updates
   */
  async updateMilestone(id, updateData, organizationId) {
    const milestone = await milestoneRepository.findByIdRaw(id, organizationId);
    if (!milestone) {
      throw new AppError('Milestone not found or workspace boundary mismatch.', 404);
    }

    const updated = await milestoneRepository.update(id, updateData, organizationId);
    
    // If tasks are updated, calculate progress immediately
    if (updateData.tasks) {
      await this.calculateProgress(id, organizationId);
    }

    return milestoneRepository.findById(id, organizationId);
  }

  /**
   * Removes milestone
   */
  async deleteMilestone(id, organizationId) {
    const milestone = await milestoneRepository.delete(id, organizationId);
    if (!milestone) {
      throw new AppError('Milestone not found.', 404);
    }
    logger.warn(`Milestone: Purged Milestone ID: ${id}`);
  }

  /**
   * Links tasks to a milestone to track progress automatically
   */
  async linkTasksToMilestone(id, taskIds, organizationId) {
    const milestone = await milestoneRepository.findByIdRaw(id, organizationId);
    if (!milestone) {
      throw new AppError('Milestone not found.', 404);
    }

    // Merge unique task IDs
    const merged = Array.from(new Set([...milestone.tasks.map((t) => t.toString()), ...taskIds]));
    milestone.tasks = merged;
    await milestone.save();

    logger.info(`Milestone: Linked ${taskIds.length} tasks to Milestone ID: ${id}`);

    // Trigger dynamic progress calculation
    return this.calculateProgress(id, organizationId);
  }

  /**
   * Dynamic Progress Calculation Engine
   * Milestone progress is defined as the completion ratio of its linked tasks:
   * progress = (completedTasks / totalTasks) * 100
   */
  async calculateProgress(id, organizationId) {
    const milestone = await milestoneRepository.findByIdRaw(id, organizationId);
    if (!milestone) return;

    if (!milestone.tasks || milestone.tasks.length === 0) {
      milestone.progress = 0;
      await milestone.save();
      return milestone;
    }

    // Query active task completed parameters
    const totalCount = milestone.tasks.length;
    const completedCount = await Task.countDocuments({
      _id: { $in: milestone.tasks },
      status: 'COMPLETED',
    });

    const progressRatio = Math.round((completedCount / totalCount) * 100);
    milestone.progress = progressRatio;

    // Auto-transition status if reached 100%
    if (progressRatio === 100) {
      milestone.status = 'ACHIEVED';
    } else {
      // Re-evaluate if it was previously ACHIEVED but tasks were added or reopened
      const today = new Date();
      if (today > new Date(milestone.dueDate)) {
        milestone.status = 'DELAYED';
      } else {
        milestone.status = 'UPCOMING';
      }
    }

    await milestone.save();
    logger.info(`Milestone Progress: Computed progress for [Milestone: ${milestone.title}] to: ${progressRatio}%`);
    
    return milestone;
  }

  /**
   * Milestone Alert & Telemetry Evaluator
   * Flags warnings for approaching deadlines and critical delays for overdue goals.
   */
  async getMilestoneAlerts(projectId, organizationId) {
    const { milestones } = await milestoneRepository.findAll({ projectId }, 1, 100, organizationId);

    const today = new Date();
    const alerts = [];

    for (const m of milestones) {
      const dueDate = new Date(m.dueDate);
      const isCompleted = m.progress === 100 || m.status === 'ACHIEVED';

      let alertLevel = 'HEALTHY';
      let message = 'Milestone is on track.';

      // 1. Critical Delay Alert (Overdue and incomplete)
      if (!isCompleted && today > dueDate) {
        alertLevel = 'CRITICAL';
        message = `OVERDUE: Goal milestone was due on ${dueDate.toLocaleDateString()}. Current progress is at ${m.progress}%.`;
        
        // Dynamic DB Status Update to DELAYED
        await MilestoneService.transitionStatus(m._id, 'DELAYED', organizationId);
      } 
      // 2. Approaching Warning Alert (Within 48 hours and incomplete)
      else if (!isCompleted) {
        const diffTime = dueDate - today;
        const diffHours = diffTime / (1000 * 60 * 60);

        if (diffHours > 0 && diffHours <= 48) {
          alertLevel = 'WARNING';
          message = `URGENT: Milestone deadline is approaching in ${Math.round(diffHours)} hours. Progress is currently at ${m.progress}%.`;
        }
      }

      if (alertLevel !== 'HEALTHY') {
        alerts.push({
          milestoneId: m._id,
          title: m.title,
          dueDate: m.dueDate,
          progress: m.progress,
          alertLevel,
          message,
        });
      }
    }

    return alerts;
  }

  /**
   * Private status updating wrapper
   */
  static async transitionStatus(id, status, organizationId) {
    await milestoneRepository.update(id, { status }, organizationId);
  }

  /**
   * Lists milestones in project.
   */
  async listMilestones(filter, page, limit, organizationId) {
    return milestoneRepository.findAll(filter, page, limit, organizationId);
  }

  /**
   * Retrieves specific milestone details.
   */
  async getMilestoneById(id, organizationId) {
    const milestone = await milestoneRepository.findById(id, organizationId);
    if (!milestone) {
      throw new AppError('Milestone not found.', 404);
    }
    return milestone;
  }
}

export default new MilestoneService();
