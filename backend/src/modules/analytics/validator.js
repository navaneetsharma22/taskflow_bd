import Joi from 'joi';

/**
 * ANALYTICS MODULE - PAYLOAD SCHEMA VALIDATORS (validator.js)
 * Responsibility: Outlines Joi validation shapes for Analytics REST endpoints.
 */

export const validateProjectParams = {
  params: Joi.object({
    projectId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
      'any.required': 'Project ID parameter is required.',
      'string.pattern.base': 'Project ID must be a valid MongoDB ObjectId.',
    }),
  }),
};
