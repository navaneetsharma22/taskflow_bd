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
}

export default new OrganizationRepository();
