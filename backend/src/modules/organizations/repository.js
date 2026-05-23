import Organization from './model.js';

/**
 * ORGANIZATIONS MODULE - DATA REPOSITORY (repository.js)
 * Responsibility: Handles direct database operations for Organizations.
 * Encapsulates Mongoose-specific query logic to separate persistence from business rules.
 */
class OrganizationRepository {
  /**
   * Find organization by its unique access code
   * @param {string} code 
   */
  async findByCode(code) {
    return Organization.findOne({ code: code.toUpperCase() }).lean();
  }

  /**
   * Find organization by ID
   * @param {string} id 
   */
  async findById(id) {
    return Organization.findById(id).lean();
  }

  /**
   * Create new organization document
   * @param {Object} orgData 
   */
  async create(orgData) {
    return Organization.create({
      ...orgData,
      code: orgData.code.toUpperCase()
    });
  }
}

export default new OrganizationRepository();
