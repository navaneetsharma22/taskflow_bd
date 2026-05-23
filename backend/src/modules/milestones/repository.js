import Milestone from './model.js';

/**
 * MILESTONES MODULE - DATA REPOSITORY (repository.js)
 * Responsibility: Wires Mongoose queries for Milestones.
 * Enforces strict tenant boundaries to secure isolated SaaS database partitions.
 */
class MilestoneRepository {
  
  async findById(id, organizationId) {
    return Milestone.findOne({ _id: id, organizationId })
      .populate('projectId', 'name code status')
      .populate('tasks', 'title status priority assigneeId');
  }

  async findByIdRaw(id, organizationId) {
    return Milestone.findOne({ _id: id, organizationId });
  }

  async findAll(filter = {}, page = 1, limit = 10, organizationId) {
    const queryFilter = {
      ...filter,
      organizationId,
    };

    const skip = (page - 1) * limit;

    const [milestones, total] = await Promise.all([
      Milestone.find(queryFilter)
        .populate('tasks', 'title status')
        .skip(skip)
        .limit(limit)
        .sort({ dueDate: 1 })
        .lean(),
      Milestone.countDocuments(queryFilter),
    ]);

    return { milestones, total };
  }

  async create(milestoneData) {
    return Milestone.create(milestoneData);
  }

  async update(id, updateData, organizationId) {
    return Milestone.findOneAndUpdate(
      { _id: id, organizationId },
      { $set: updateData },
      { new: true, runValidators: true }
    );
  }

  async delete(id, organizationId) {
    return Milestone.findOneAndDelete({ _id: id, organizationId });
  }
}

export default new MilestoneRepository();
