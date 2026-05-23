import organizationRepository from './repository.js';
import AppError from '../../utils/AppError.js';

/**
 * ORGANIZATIONS MODULE - SERVICE LAYER (service.js)
 * Responsibility: Implements business logic and checks for Tenant (Organization) state.
 */
class OrganizationService {
  /**
   * Verifies if an organization code exists and is active.
   * @param {string} code 
   */
  async validateOrganizationCode(code) {
    if (!code) {
      throw new AppError('Organization access code is required.', 400);
    }

    const org = await organizationRepository.findByCode(code);
    if (!org) {
      throw new AppError('Invalid organization access code.', 404);
    }

    if (org.status !== 'ACTIVE') {
      throw new AppError('Organization workspace is suspended. Please contact support.', 403);
    }

    return org;
  }

  /**
   * Fetch organization details by ID
   * @param {string} id 
   */
  async getOrganizationById(id) {
    const org = await organizationRepository.findById(id);
    if (!org) {
      throw new AppError('Organization workspace not found.', 404);
    }
    return org;
  }
}

export default new OrganizationService();
