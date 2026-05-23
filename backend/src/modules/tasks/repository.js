import Task from './model.js';

/**
 * TASKS MODULE - DATA REPOSITORY (repository.js)
 * Responsibility: Wires Mongoose queries for Tasks, subtasks, comments, attachments.
 * Enforces strict tenant boundaries to secure isolated SaaS database partitions.
 */
class TaskRepository {
  
  async findById(id, organizationId) {
    return Task.findOne({ _id: id, organizationId })
      .populate('assigneeId', 'name email designation profilePhoto')
      .populate('reporterId', 'name email')
      .populate('comments.userId', 'name profilePhoto')
      .populate('dependencies', 'title status priority')
      .populate('blockers', 'title status priority')
      .populate('escalation.escalatedTo', 'name email');
  }

  async findByIdRaw(id, organizationId) {
    return Task.findOne({ _id: id, organizationId });
  }

  async findAll(filter = {}, page = 1, limit = 20, organizationId) {
    const queryFilter = {
      ...filter,
      organizationId,
    };

    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      Task.find(queryFilter)
        .populate('assigneeId', 'name profilePhoto')
        .populate('reporterId', 'name')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      Task.countDocuments(queryFilter),
    ]);

    return { tasks, total };
  }

  async create(taskData) {
    return Task.create(taskData);
  }

  async update(id, updateData, organizationId) {
    return Task.findOneAndUpdate(
      { _id: id, organizationId },
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('assigneeId', 'name profilePhoto')
      .populate('reporterId', 'name');
  }

  async delete(id, organizationId) {
    return Task.findOneAndDelete({ _id: id, organizationId });
  }

  async addSubtask(taskId, subtaskData, organizationId) {
    return Task.findOneAndUpdate(
      { _id: taskId, organizationId },
      { $push: { subtasks: subtaskData } },
      { new: true }
    );
  }

  async updateSubtask(taskId, subtaskId, isCompleted, organizationId) {
    return Task.findOneAndUpdate(
      { _id: taskId, 'subtasks._id': subtaskId, organizationId },
      { $set: { 'subtasks.$.isCompleted': isCompleted } },
      { new: true }
    );
  }

  async deleteSubtask(taskId, subtaskId, organizationId) {
    return Task.findOneAndUpdate(
      { _id: taskId, organizationId },
      { $pull: { subtasks: { _id: subtaskId } } },
      { new: true }
    );
  }

  async addComment(taskId, commentData, organizationId) {
    return Task.findOneAndUpdate(
      { _id: taskId, organizationId },
      { $push: { comments: commentData } },
      { new: true }
    ).populate('comments.userId', 'name profilePhoto');
  }

  async addAttachment(taskId, attachmentData, organizationId) {
    return Task.findOneAndUpdate(
      { _id: taskId, organizationId },
      { $push: { attachments: attachmentData } },
      { new: true }
    );
  }
}

export default new TaskRepository();
