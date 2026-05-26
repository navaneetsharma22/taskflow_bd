import Organization from './model.js';

/**
 * ORGANIZATIONS MODULE - DATA REPOSITORY (repository.js)
 * Responsibility: Handles direct database operations for Organizations (Tenants).
 * Isolates Mongoose-specific query structures.
 */
class OrganizationRepository {
  async findByCode(code) {
    return Organization.findOne({ code: code.toUpperCase() }).lean();
  }

  async findById(id) {
    return Organization.findById(id).lean();
  }

  async create(orgData) {
    return Organization.create({
      ...orgData,
      code: orgData.code.toUpperCase()
    });
  }

  async updateSettings(id, settings) {
    return Organization.findByIdAndUpdate(
      id,
      { $set: { settings } },
      { new: true, runValidators: true }
    ).lean();
  }

  async updateFeatureFlags(id, featureFlags) {
    return Organization.findByIdAndUpdate(
      id,
      { $set: { featureFlags } },
      { new: true }
    ).lean();
  }

  async updateStatus(id, status) {
    return Organization.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true }
    ).lean();
  }

  async findAll() {
    // Exclude soft-deleted organizations by default
    return Organization.find({ isDeleted: { $ne: true } }).lean();
  }

  async deleteById(id, deletedBy) {
    // Soft-delete: mark flags and metadata instead of removing the document
    return Organization.findByIdAndUpdate(
      id,
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy } },
      { new: true }
    ).lean();
  }

  async hardDeleteById(id) {
    return Organization.findByIdAndDelete(id).lean();
  }
}

export default new OrganizationRepository();
