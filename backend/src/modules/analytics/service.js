import mongoose from 'mongoose';
import Task from '../tasks/model.js';
import Project from '../projects/model.js';
import { User } from '../auth/model.js';
import Milestone from '../milestones/model.js';
import { TASK_STATUS, TASK_PRIORITY } from '../../constants/index.js';
import AppError from '../../utils/AppError.js';
import logger from '../../utils/logger.js';

/**
 * ANALYTICS MODULE - SERVICE LAYER (service.js)
 * Responsibility: Executes highly performant MongoDB Aggregation Pipelines to
 * calculate business intelligence metrics across Projects, Tasks, Users, and Milestones.
 * Features:
 *   1. Project Analytics: Status and priority allocations.
 *   2. User Productivity: League-table of completed tasks and completion rates.
 *   3. Task Completion: Trend metrics grouped over the past 6 months.
 *   4. Deadline Risk: Predicts delay vulnerabilities based on deadline proximities.
 *   5. Sprint Velocity: Measures team output speeds over weekly intervals.
 *   6. KPI Dashboard: Enterprise executive telemetry summaries.
 */
class AnalyticsService {

  /**
   * Compiles detailed metrics for a specific project workspace
   */
  async getProjectAnalytics(projectId, organizationId) {
    const projId = new mongoose.Types.ObjectId(projectId);
    const orgId = new mongoose.Types.ObjectId(organizationId);

    // 1. Verify project exists
    const project = await Project.findOne({ _id: projId, organizationId: orgId });
    if (!project) {
      throw new AppError('Project not found or workspace boundary mismatch.', 404);
    }

    // 2. Perform task aggregation by status and priority
    const taskStats = await Task.aggregate([
      { $match: { projectId: projId, organizationId: orgId } },
      {
        $group: {
          _id: null,
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: { $cond: [{ $eq: ['$status', TASK_STATUS.COMPLETED] }, 1, 0] },
          },
          blockedTasks: {
            $sum: { $cond: [{ $eq: ['$status', TASK_STATUS.BLOCKED] }, 1, 0] },
          },
          highPriorityTasks: {
            $sum: { $cond: [{ $in: ['$priority', [TASK_PRIORITY.HIGH, TASK_PRIORITY.CRITICAL]] }, 1, 0] },
          },
        },
      },
    ]);

    // 3. Count milestones achieved vs total
    const [milestoneStats] = await Milestone.aggregate([
      { $match: { projectId: projId, organizationId: orgId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          achieved: { $sum: { $cond: [{ $eq: ['$status', 'ACHIEVED'] }, 1, 0] } },
        },
      },
    ]) || [{ total: 0, achieved: 0 }];

    const stats = taskStats[0] || { totalTasks: 0, completedTasks: 0, blockedTasks: 0, highPriorityTasks: 0 };
    const completionRate = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;

    return {
      projectId: project._id,
      name: project.name,
      code: project.code,
      status: project.status,
      healthScore: project.healthScore,
      taskMetrics: {
        total: stats.totalTasks,
        completed: stats.completedTasks,
        blocked: stats.blockedTasks,
        highPriority: stats.highPriorityTasks,
        completionRate,
      },
      milestoneMetrics: {
        total: milestoneStats ? milestoneStats.total : 0,
        achieved: milestoneStats ? milestoneStats.achieved : 0,
      },
    };
  }

  /**
   * Evaluates employee productivity and output ratings
   */
  async getUserProductivity(organizationId) {
    const orgId = new mongoose.Types.ObjectId(organizationId);

    // Group tasks by assignee and calculate status ratios
    const productivity = await Task.aggregate([
      { $match: { organizationId: orgId, assigneeId: { $ne: null } } },
      {
        $group: {
          _id: '$assigneeId',
          totalAssigned: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', TASK_STATUS.COMPLETED] }, 1, 0] },
          },
          active: {
            $sum: { $cond: [{ $in: ['$status', [TASK_STATUS.IN_PROGRESS, TASK_STATUS.IN_REVIEW]] }, 1, 0] },
          },
          blocked: {
            $sum: { $cond: [{ $eq: ['$status', TASK_STATUS.BLOCKED] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails',
        },
      },
      { $unwind: '$userDetails' },
      {
        $project: {
          _id: 1,
          userName: '$userDetails.name',
          userEmail: '$userDetails.email',
          userDesignation: '$userDetails.designation',
          totalAssigned: 1,
          completed: 1,
          active: 1,
          blocked: 1,
          completionRate: {
            $cond: [
              { $gt: ['$totalAssigned', 0] },
              { $round: [{ $multiply: [{ $divide: ['$completed', '$totalAssigned'] }, 100] }, 0] },
              0,
            ],
          },
        },
      },
      { $sort: { completionRate: -1, completed: -1 } },
    ]);

    return productivity;
  }

  /**
   * Compiles monthly task completion trends over the past 6 months
   */
  async getTaskCompletionTrends(organizationId) {
    const orgId = new mongoose.Types.ObjectId(organizationId);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const trends = await Task.aggregate([
      {
        $match: {
          organizationId: orgId,
          status: TASK_STATUS.COMPLETED,
          updatedAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$updatedAt' },
            month: { $month: '$updatedAt' },
          },
          completedCount: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      {
        $project: {
          _id: 0,
          period: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              { $cond: [{ $lt: ['$_id.month', 10] }, '0', ''] },
              { $toString: '$_id.month' },
            ],
          },
          completedCount: 1,
        },
      },
    ]);

    return trends;
  }

  /**
   * Predicts deadline exposure risks based on active task dates
   */
  async getDeadlineRiskTelemetry(organizationId) {
    const orgId = new mongoose.Types.ObjectId(organizationId);
    const today = new Date();
    const warningThreshold = new Date();
    warningThreshold.setDate(warningThreshold.getDate() + 2); // 48 Hours

    // Fetch incomplete tasks violating deadlines
    const overdueTasks = await Task.find({
      organizationId: orgId,
      status: { $ne: TASK_STATUS.COMPLETED },
      endDate: { $lt: today },
    })
      .populate('projectId', 'name code')
      .populate('assigneeId', 'name email')
      .lean();

    // Fetch incomplete tasks approaching deadlines (next 48h)
    const approachingTasks = await Task.find({
      organizationId: orgId,
      status: { $ne: TASK_STATUS.COMPLETED },
      endDate: { $gte: today, $lte: warningThreshold },
    })
      .populate('projectId', 'name code')
      .populate('assigneeId', 'name email')
      .lean();

    // Compile list of projects with low health levels
    const riskyProjects = await Project.find({
      organizationId: orgId,
      healthScore: { $lt: 80 },
    }).lean();

    return {
      riskLevel: overdueTasks.length > 5 ? 'HIGH' : overdueTasks.length > 0 ? 'MEDIUM' : 'LOW',
      metrics: {
        totalOverdueTasks: overdueTasks.length,
        totalApproachingTasks: approachingTasks.length,
        totalRiskyProjects: riskyProjects.length,
      },
      details: {
        overdue: overdueTasks.map((t) => ({
          taskId: t._id,
          title: t.title,
          projectName: t.projectId ? t.projectId.name : 'Unknown',
          dueDate: t.endDate,
          assignee: t.assigneeId ? t.assigneeId.name : 'Unassigned',
        })),
        approaching: approachingTasks.map((t) => ({
          taskId: t._id,
          title: t.title,
          projectName: t.projectId ? t.projectId.name : 'Unknown',
          dueDate: t.endDate,
          assignee: t.assigneeId ? t.assigneeId.name : 'Unassigned',
        })),
        projects: riskyProjects.map((p) => ({
          projectId: p._id,
          name: p.name,
          code: p.code,
          healthScore: p.healthScore,
        })),
      },
    };
  }

  /**
   * Computes velocity statistics grouped by weekly outputs
   */
  async getSprintVelocity(projectId, organizationId) {
    const projId = new mongoose.Types.ObjectId(projectId);
    const orgId = new mongoose.Types.ObjectId(organizationId);

    // Group completed tasks by weekly interval
    const velocity = await Task.aggregate([
      {
        $match: {
          projectId: projId,
          organizationId: orgId,
          status: TASK_STATUS.COMPLETED,
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$updatedAt' },
            week: { $week: '$updatedAt' },
          },
          completedCount: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.week': 1 } },
      {
        $project: {
          _id: 0,
          sprintPeriod: {
            $concat: [
              { $toString: '$_id.year' },
              '-W',
              { $toString: '$_id.week' },
            ],
          },
          tasksCompleted: '$completedCount',
        },
      },
    ]);

    return velocity;
  }

  /**
   * Consolidates system-wide executive Key Performance Indicators (KPIs)
   */
  async getKpiDashboard(organizationId) {
    const orgId = new mongoose.Types.ObjectId(organizationId);

    const [activeProjectsCount, activeUsersCount, taskSummary, delayedMilestonesCount] = await Promise.all([
      Project.countDocuments({ organizationId: orgId, status: 'ACTIVE' }),
      User.countDocuments({ organizationId: orgId, status: 'ACTIVE' }),
      Task.aggregate([
        { $match: { organizationId: orgId } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', TASK_STATUS.COMPLETED] }, 1, 0] } },
            escalated: { $sum: { $cond: [{ $eq: ['$escalation.isEscalated', true] }, 1, 0] } },
          },
        },
      ]),
      Milestone.countDocuments({ organizationId: orgId, status: 'DELAYED' }),
    ]);

    const stats = taskSummary[0] || { total: 0, completed: 0, escalated: 0 };
    const globalCompletionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

    return {
      summary: {
        activeProjects: activeProjectsCount,
        activeUsers: activeUsersCount,
        delayedMilestones: delayedMilestonesCount,
        escalatedTasks: stats.escalated,
      },
      performance: {
        totalTasks: stats.total,
        completedTasks: stats.completed,
        globalCompletionRate,
      },
      tenantHealth: globalCompletionRate > 80 ? 'EXCELLENT' : globalCompletionRate > 50 ? 'GOOD' : 'CRITICAL',
    };
  }
}

export default new AnalyticsService();
