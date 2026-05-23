import Joi from 'joi';

/**
 * RBAC MODULE - PAYLOAD SCHEMA VALIDATORS (validator.js)
 * Responsibility: Outlines Joi validation shapes for Role Management REST endpoints.
 */

export const validateCreateRole = {
  body: Joi.object({
    name: Joi.string().required().trim().min(2).max(40).messages({
      'any.required': 'Role name is required.',
      'string.min': 'Role name must be at least 2 characters.',
    }),
    code: Joi.string().required().trim().uppercase().min(2).max(30).messages({
      'any.required': 'Role code is required.',
    }),
    weight: Joi.number().integer().min(1).max(79).optional().messages({
      'number.max': 'Custom role hierarchy weight level must be below 80.',
    }),
    description: Joi.string().trim().max(200).optional(),
  }),
};

export const validateUpdateRole = {
  body: Joi.object({
    name: Joi.string().trim().min(2).max(40).optional(),
    weight: Joi.number().integer().min(1).max(79).optional(),
    description: Joi.string().trim().max(200).optional(),
  }),
};

export const validateAssignRole = {
  body: Joi.object({
    userId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
      'any.required': 'Target User ID is required.',
      'string.pattern.base': 'Target User ID must be a valid MongoDB ObjectId.',
    }),
    role: Joi.string().required().trim().uppercase().messages({
      'any.required': 'Role code is required for allocation.',
    }),
  }),
};
