import taskRepository from './repository.js';
import projectService from '../projects/service.js';
import AppError from '../../utils/AppError.js';
import logger from '../../utils/logger.js';
import { TASK_STATUS, TASK_PRIORITY } from '../../constants/index.js';
import Task from './model.js';

/**
 * TASKS MODULE - SERVICE LAYER (service.js)
 * Responsibility: Implements core Task business logic:
 *   1. Subtask reallocations and state updates.
 *   2. Auto-generating child tasks for Recurring Task loops.
 *   3. Computer Science DFS cycle-detection for Task Dependencies.
 *   4. Blocker cascades (auto-toggling BLOCKED status).
 *   5. Escalation flows (escalating tasks and auto-promoting to CRITICAL).
 */
class TaskService {
  
  /**
   * Creates a new task inside a verified project workspace
   */
  async createTask(taskData, reporterId, organizationId) {
    // 1. Verify project context
    await projectService.getProjectById(taskData.projectId, organizationId);

    // 2. Validate dates
    if (taskData.startDate && taskData.endDate) {
      const start = new Date(taskData.startDate);
      const end = new Date(taskData.endDate);
      if (end < start) {
        throw new AppError('Task deadline must be strictly after the start date.', 400);
      }
    }

    // 3. Configure initial recurring occurrences
    let recurringObj = { isRecurring: false };
    if (taskData.recurring && taskData.recurring.isRecurring === true) {
      const nextDate = this.calculateNextOccurrenceDate(new Date(), taskData.recurring.frequency);
      recurringObj = {
        isRecurring: true,
        frequency: taskData.recurring.frequency,
        nextOccurrence: nextDate,
      };
    }

    const newTask = await taskRepository.create({
      ...taskData,
      reporterId,
      organizationId,
      recurring: recurringObj,
      status: taskData.status || TASK_STATUS.TODO,
    });

    logger.info(`Task: Created task [ID: ${newTask._id}, Title: ${newTask.title}] in Org ID: ${organizationId}`);
    return newTask;
  }

  /**
   * Safe updates merges
   */
  async updateTask(id, updateData, organizationId) {
    const task = await taskRepository.findByIdRaw(id, organizationId);
    if (!task) {
      throw new AppError('Task not found or workspace boundary mismatch.', 404);
    }

    // SECURITY: Whitelist allowed update fields to prevent injection of sensitive fields
    const allowedFields = [
      'title', 'description', 'status', 'priority', 'assigneeId',
      'startDate', 'endDate', 'recurring',
    ];
    const sanitizedUpdate = {};
    for (const key of allowedFields) {
      if (updateData[key] !== undefined) {
        sanitizedUpdate[key] = updateData[key];
      }
    }

    // If status transitions to COMPLETED, check recurring updates
    if (sanitizedUpdate.status === TASK_STATUS.COMPLETED && task.status !== TASK_STATUS.COMPLETED) {
      // If completed subtasks exist, mark all complete
      if (task.subtasks && task.subtasks.length > 0) {
        task.subtasks.forEach((sub) => { sub.isCompleted = true; });
      }
    }

    const updated = await taskRepository.update(id, sanitizedUpdate, organizationId);
    logger.info(`Task: Updated details for Task ID: ${id}`);
    return updated;
  }

  /**
   * Adds a subtask
   */
  async addSubtask(taskId, title, organizationId) {
    const subtaskReport = await taskRepository.addSubtask(taskId, { title, isCompleted: false }, organizationId);
    if (!subtaskReport) {
      throw new AppError('Task not found or workspace boundary mismatch.', 404);
    }
    return subtaskReport;
  }

  /**
   * Modifies subtask completed status
   */
  async updateSubtask(taskId, subtaskId, isCompleted, organizationId) {
    const updated = await taskRepository.updateSubtask(taskId, subtaskId, isCompleted, organizationId);
    if (!updated) {
      throw new AppError('Subtask not found.', 404);
    }
    return updated;
  }

  /**
   * Removes subtask item
   */
  async deleteSubtask(taskId, subtaskId, organizationId) {
    const updated = await taskRepository.deleteSubtask(taskId, subtaskId, organizationId);
    if (!updated) {
      throw new AppError('Task not found.', 404);
    }
    return updated;
  }

  /**
   * Adds a comment trace
   */
  async addComment(taskId, text, userId, organizationId) {
    const task = await taskRepository.addComment(taskId, { userId, text }, organizationId);
    if (!task) {
      throw new AppError('Task not found or workspace boundary mismatch.', 404);
    }
    return task.comments;
  }

  /**
   * Adds an attachment mapping
   */
  async addAttachment(taskId, name, url, organizationId) {
    const task = await taskRepository.addAttachment(taskId, { name, url }, organizationId);
    if (!task) {
      throw new AppError('Task not found or workspace boundary mismatch.', 404);
    }
    return task.attachments;
  }

  // ==========================================
  // PURE CS TASK CYCLE DETECTION & DEPENDENCIES
  // ==========================================

  /**
   * DFS task dependency circular validation checks (optimized in-memory to prevent N+1 queries)
   */
  async checkCircularDependency(taskId, targetDependencyId, projectId, organizationId) {
    // 1. Fetch all tasks within the same project context (single optimized query)
    const projectTasks = await Task.find({ projectId, organizationId })
      .select('_id dependencies')
      .lean();

    // 2. Build dependency lookup map for immediate O(1) traversal
    const dependencyMap = new Map();
    for (const t of projectTasks) {
      dependencyMap.set(t._id.toString(), t.dependencies.map(d => d.toString()));
    }

    const visited = new Set();
    const stack = new Set();

    const dfs = (currentId) => {
      visited.add(currentId);
      stack.add(currentId);

      const deps = dependencyMap.get(currentId) || [];
      for (const depId of deps) {
        if (depId === taskId.toString()) {
          return true; // Cycle detected: child maps back to root!
        }

        if (!visited.has(depId)) {
          if (dfs(depId)) return true;
        } else if (stack.has(depId)) {
          return true;
        }
      }

      stack.delete(currentId);
      return false;
    };

    return dfs(targetDependencyId.toString());
  }

  /**
   * Adds a task dependency, blocking circular pipelines
   */
  async addTaskDependency(taskId, dependencyId, organizationId) {
    if (taskId.toString() === dependencyId.toString()) {
      throw new AppError('A task cannot depend on itself.', 400);
    }

    const [task, dependency] = await Promise.all([
      taskRepository.findByIdRaw(taskId, organizationId),
      taskRepository.findByIdRaw(dependencyId, organizationId),
    ]);

    if (!task || !dependency) {
      throw new AppError('One or both tasks were not found in this organization.', 404);
    }

    if (task.dependencies.includes(dependencyId)) {
      throw new AppError('Dependency is already registered.', 400);
    }

    // Run DFS cycle validation (Optimized in-memory check passing projectId)
    const hasCycle = await this.checkCircularDependency(taskId, dependencyId, task.projectId, organizationId);
    if (hasCycle) {
      throw new AppError('Circular dependency violation. Task dependencies cannot map circular references.', 409);
    }

    task.dependencies.push(dependencyId);
    await task.save();

    logger.info(`Task Dependency: [Task: ${taskId}] depends on [Dependency: ${dependencyId}]`);
    return taskRepository.findById(taskId, organizationId);
  }

  /**
   * Adds a blocker, automatically setting task status to BLOCKED state.
   */
  async addBlocker(taskId, blockerId, organizationId) {
    const [task, blocker] = await Promise.all([
      taskRepository.findByIdRaw(taskId, organizationId),
      taskRepository.findByIdRaw(blockerId, organizationId),
    ]);

    if (!task || !blocker) {
      throw new AppError('One or both tasks not found.', 404);
    }

    if (task.blockers.includes(blockerId)) {
      throw new AppError('Blocker is already registered.', 400);
    }

    task.blockers.push(blockerId);
    task.status = TASK_STATUS.BLOCKED; // Auto cascade status to BLOCKED!
    
    await task.save();
    
    logger.warn(`Task Blocker: Task ID: ${taskId} is now BLOCKED by Task ID: ${blockerId}`);
    return taskRepository.findById(taskId, organizationId);
  }

  // ==========================================
  // ESCALATION MATRIX MANAGEMENT
  // ==========================================

  /**
   * Escalates a task, promoting priority to CRITICAL automatically
   */
  async escalateTask(taskId, reason, escalatedToUserId, organizationId) {
    const task = await taskRepository.findByIdRaw(taskId, organizationId);
    if (!task) {
      throw new AppError('Task not found.', 404);
    }

    task.escalation = {
      isEscalated: true,
      reason,
      escalatedAt: new Date(),
      escalatedTo: escalatedToUserId,
    };

    task.priority = TASK_PRIORITY.CRITICAL; // Auto-escalate priority!
    await task.save();

    logger.warn(`Task Escalation: Task [ID: ${taskId}] has been escalated to User ID: ${escalatedToUserId}. Priority promoted to CRITICAL.`);
    return taskRepository.findById(taskId, organizationId);
  }

  // ==========================================
  // RECURRING TASK TELEMETRY GENERATION ENGINE
  // ==========================================

  /**
   * Calculates next occurrence dates relative to frequency
   */
  calculateNextOccurrenceDate(baseDate, frequency) {
    const date = new Date(baseDate);
    if (frequency === 'DAILY') {
      date.setDate(date.getDate() + 1);
    } else if (frequency === 'WEEKLY') {
      date.setDate(date.getDate() + 7);
    } else if (frequency === 'MONTHLY') {
      date.setMonth(date.getMonth() + 1);
    }
    return date;
  }

  /**
   * Periodic recurring task cron engine mapping (Optimized with cursors for high-scale memory efficiency)
   */
  async processRecurringTasks() {
    logger.info('Recurring Task: Running periodic generator engine...');
    const today = new Date();

    // Stream due tasks using a cursor to prevent Out-Of-Memory crashes under high scale
    const cursor = Task.find({
      'recurring.isRecurring': true,
      'recurring.nextOccurrence': { $lte: today },
    }).cursor();

    let createdCount = 0;
    
    for (let t = await cursor.next(); t != null; t = await cursor.next()) {
      try {
        // 1. Create a fresh duplicate task item (Clearing historical subtask logs)
        await Task.create({
          title: `${t.title} (Recurring)`,
          description: t.description,
          projectId: t.projectId,
          organizationId: t.organizationId,
          assigneeId: t.assigneeId,
          reporterId: t.reporterId,
          priority: t.priority,
          status: TASK_STATUS.TODO,
          subtasks: t.subtasks.map((s) => ({ title: s.title, isCompleted: false })), // Clone template subtasks as uncompleted!
        });

        // 2. Increment recurring calendar schedule on parent
        t.recurring.nextOccurrence = this.calculateNextOccurrenceDate(t.recurring.nextOccurrence, t.recurring.frequency);
        await t.save();
        
        createdCount += 1;
      } catch (err) {
        logger.error(`Recurring Task: Failed to generate occurrence for Task ID: ${t._id}. Error: ${err.message}`);
      }
    }

    logger.info(`Recurring Task: Generation complete. Instantiated ${createdCount} new task templates.`);
  }

  /**
   * Lists tasks.
   */
  async listTasks(filter, page, limit, organizationId) {
    return taskRepository.findAll(filter, page, limit, organizationId);
  }

  /**
   * Gets specific task context.
   */
  async getTaskById(id, organizationId) {
    const task = await taskRepository.findById(id, organizationId);
    if (!task) {
      throw new AppError('Task not found in this organization.', 404);
    }
    return task;
  }
}

export default new TaskService();
