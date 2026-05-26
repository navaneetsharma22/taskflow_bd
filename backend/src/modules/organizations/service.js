import crypto from 'crypto';
import organizationRepository from './repository.js';
import { PLAN_LIMITS, SUBSCRIPTION_PLANS } from '../../constants/index.js';
import AppError from '../../utils/AppError.js';
import logger from '../../utils/logger.js';

/**
 * ORGANIZATIONS MODULE - SERVICE LAYER (service.js)
 * Responsibility: Implements core Tenant business logic, including:
 *   1. Cryptographic Organization Workspace code generation.
 *   2. Settings configuration and validation controls.
 *   3. Enforcing limits and feature flags based on Subscription levels.
 *   4. Validating active tenant states to isolate operations.
 */
class OrganizationService {
  
  /**
   * Cryptographically generates a unique Organization code (e.g., TF-A3C9F2)
   */
  async generateUniqueOrganizationCode() {
    let isUnique = false;
    let code = '';

    while (!isUnique) {
      // Generate 3 random bytes and compile to hex uppercase
      const bytes = crypto.randomBytes(3).toString('hex').toUpperCase();
      code = `TF-${bytes}`;

      const existingOrg = await organizationRepository.findByCode(code);
      if (!existingOrg) {
        isUnique = true;
      }
    }

    return code;
  }

  /**
   * Instantiates a new Tenant (Organization) with limits tied to the subscription level.
   */
  async createOrganization({ name, subscriptionPlan = SUBSCRIPTION_PLANS.FREE_TRIAL }) {
    if (!name) {
      throw new AppError('Organization name is required.', 400);
    }

    // 1. Generate Unique Workspace Code
    const code = await this.generateUniqueOrganizationCode();

    // 2. Fetch Limits mapped to subscription tier
    const limits = PLAN_LIMITS[subscriptionPlan] || PLAN_LIMITS[SUBSCRIPTION_PLANS.FREE_TRIAL];

    // 3. Prepare Settings & Feature Flags based on subscription tier limits
    const settings = {
      allow2FA: limits.features.includes('two_factor_auth'),
      ipWhitelist: [],
      sessionLimit: 5,
      storageLimitGb: limits.maxStorageGb,
      userLimit: limits.maxUsers,
    };

    const featureFlags = {
      hasAIEnabled: limits.features.includes('ai_sprint_summary'),
      hasChatEnabled: limits.features.includes('direct_chat') || limits.features.includes('project_chat'),
      hasTimelineEnabled: limits.features.includes('timeline_view'),
      hasKPIEnabled: limits.features.includes('basic_analytics'),
    };

    const newOrg = await organizationRepository.create({
      name,
      code,
      subscriptionPlan,
      settings,
      featureFlags,
      status: 'ACTIVE',
    });

    logger.info(`Tenant: Created new tenant [Code: ${code}, Name: ${name}] under Plan: ${subscriptionPlan}`);

    return newOrg;
  }

  /**
   * Verifies if an organization code is valid and active.
   */
  async validateOrganizationCode(code) {
    if (!code) {
      throw new AppError('Organization code is required.', 400);
    }

    const org = await organizationRepository.findByCode(code);
    if (!org) {
      throw new AppError('Workspace code is invalid. Check spelling and retry.', 404);
    }

    if (org.status === 'SUSPENDED') {
      throw new AppError('Workspace has been suspended. Please contact platform administrators.', 403);
    }

    if (org.status === 'TRIAL_EXPIRED') {
      throw new AppError('Your organization free trial has expired. Update subscription plan to reactivate.', 402);
    }

    return org;
  }

  /**
   * Retrieves organization context by ID
   */
  async getOrganizationById(id) {
    const org = await organizationRepository.findById(id);
    if (!org) {
      throw new AppError('Organization workspace not found.', 404);
    }
    return org;
  }

  /**
   * Updates settings parameters.
   */
  async updateSettings(id, settingsData) {
    const org = await this.getOrganizationById(id);
    
    // Merge updated parameters safely
    const updatedSettings = {
      ...org.settings,
      ...settingsData,
    };

    const updatedOrg = await organizationRepository.updateSettings(id, updatedSettings);
    logger.info(`Tenant: Updated settings configuration for Organization ID: ${id}`);
    
    return updatedOrg.settings;
  }

  /**
   * Updates feature flags toggles.
   */
  async updateFeatureFlags(id, flagsData) {
    const org = await this.getOrganizationById(id);

    const updatedFlags = {
      ...org.featureFlags,
      ...flagsData,
    };

    const updatedOrg = await organizationRepository.updateFeatureFlags(id, updatedFlags);
    logger.info(`Tenant: Modified feature flags for Organization ID: ${id}`);

    return updatedOrg.featureFlags;
  }

  /**
   * Updates tenant lifecycle status (ACTIVE, SUSPENDED, TRIAL_EXPIRED).
   */
  async updateStatus(id, status) {
    if (!['ACTIVE', 'SUSPENDED', 'TRIAL_EXPIRED'].includes(status)) {
      throw new AppError('Invalid status identifier state.', 400);
    }

    const updatedOrg = await organizationRepository.updateStatus(id, status);
    logger.info(`Tenant: Transitioned Organization ID: ${id} status state to: ${status}`);

    return updatedOrg;
  }

}

export default new OrganizationService();
