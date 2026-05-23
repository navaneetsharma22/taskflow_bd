import Joi from 'joi';

/**
 * NOTIFICATION MODULE - PAYLOAD SCHEMA VALIDATORS (validator.js)
 * Responsibility: Outlines Joi validation shapes for Notification REST endpoints.
 */

export const validateNotificationId = {
  params: Joi.object({
    id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
      'any.required': 'Notification ID parameter is required.',
      'string.pattern.base': 'Notification ID must be a valid MongoDB ObjectId.',
    }),
  }),
};
