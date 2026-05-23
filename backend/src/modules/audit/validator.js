import Joi from 'joi';

/**
 * AUDIT LOGS MODULE - PAYLOAD SCHEMA VALIDATORS (validator.js)
 * Responsibility: Outlines Joi validation shapes for Audit Log query filters.
 */

export const validateAuditQuery = {
  query: Joi.object({
    userId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional().messages({
      'string.pattern.base': 'Filtered User ID must be a valid ObjectId.',
    }),
    entityType: Joi.string().valid('ORGANIZATION', 'USER', 'PROJECT', 'TASK', 'MILESTONE', 'ROLE').optional(),
    action: Joi.string().trim().max(100).optional(),
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
  }),
};
