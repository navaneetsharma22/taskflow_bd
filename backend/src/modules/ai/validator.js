import Joi from 'joi';

/**
 * AI SERVICE MODULE - PAYLOAD SCHEMA VALIDATORS (validator.js)
 * Responsibility: Outlines Joi validation shapes for AI parameters.
 */

export const validateProjectAiQuery = {
  params: Joi.object({
    projectId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
      'string.pattern.base': 'Target Project ID must be a valid ObjectId.',
      'any.required': 'Target Project ID is required for AI processing.',
    }),
  }),
};
