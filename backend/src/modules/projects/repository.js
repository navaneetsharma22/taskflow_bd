import Project from './model.js';

/**
 * PROJECTS MODULE - DATA REPOSITORY (repository.js)
 * Responsibility: Wires Mongoose queries for Projects.
 * Enforces strict tenant boundaries to secure isolated SaaS database partitions.
 */
class ProjectRepository {
  
  async findById(id, organizationId) {
    return Project.findOne({ _id: id, organizationId })
      .populate('ownerId', 'name email profilePhoto')
      .populate('members', 'name email designation profilePhoto')
      .populate('dependencies', 'name code status endDate');
  }

  async findByIdRaw(id, organizationId) {
    return Project.findOne({ _id: id, organizationId });
  }

  async findAll(filter = {}, page = 1, limit = 10, organizationId) {
    const queryFilter = {
      ...filter,
      organizationId,
    };

    const skip = (page - 1) * limit;

    const [projects, total] = await Promise.all([
      Project.find(queryFilter)
        .populate('ownerId', 'name email')
        .populate('dependencies', 'name code')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      Project.countDocuments(queryFilter),
    ]);

    return { projects, total };
  }

  async create(projectData) {
    return Project.create(projectData);
  }

  async update(id, updateData, organizationId) {
    return Project.findOneAndUpdate(
      { _id: id, organizationId },
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('ownerId', 'name email')
      .populate('dependencies', 'name code');
  }

  async delete(id, organizationId) {
    return Project.findOneAndDelete({ _id: id, organizationId });
  }

  async countProjects(organizationId) {
    return Project.countDocuments({ organizationId });
  }
}

export default new ProjectRepository();
