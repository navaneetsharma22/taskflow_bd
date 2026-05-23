import Joi from 'joi';

/**
 * ORGANIZATIONS MODULE - PAYLOAD SCHEMA VALIDATORS (validator.js)
 * Responsibility: Outlines Joi validation shapes for Tenant REST endpoints.
 */

export const validateUpdateSettings = {
  body: Joi.object({
    allow2FA: Joi.boolean().optional(),
    ipWhitelist: Joi.array().items(Joi.string().ip()).optional(),
    sessionLimit: Joi.number().integer().min(1).max(20).optional(),
    storageLimitGb: Joi.number().positive().max(1000).optional(),
    userLimit: Joi.number().integer().positive().max(10000).optional(),
  }),
};

export const validateUpdateFeatureFlags = {
  body: Joi.object({
    hasAIEnabled: Joi.boolean().optional(),
    hasChatEnabled: Joi.boolean().optional(),
    hasTimelineEnabled: Joi.boolean().optional(),
    hasKPIEnabled: Joi.boolean().optional(),
  }),
};
