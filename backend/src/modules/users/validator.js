import Joi from 'joi';
import { ROLES } from '../../constants/index.js';

/**
 * USERS MODULE - PAYLOAD SCHEMA VALIDATORS (validator.js)
 * Responsibility: Outlines Joi validation shapes for User REST endpoints.
 */

export const validateCreateUser = {
  body: Joi.object({
    name: Joi.string().required().trim().min(2).max(50).messages({
      'any.required': 'Name is required.',
      'string.min': 'Name must be at least 2 characters.',
    }),
    email: Joi.string().required().trim().email().messages({
      'any.required': 'Email is required.',
      'string.email': 'Supply a valid email format.',
    }),
    role: Joi.string().valid(...Object.values(ROLES)).optional(),
    department: Joi.string().trim().max(50).optional(),
    designation: Joi.string().trim().max(50).optional(),
    skills: Joi.array().items(Joi.string()).optional(),
    employeeId: Joi.string().trim().max(30).optional(),
  }),
};

export const validateUpdateUser = {
  body: Joi.object({
    name: Joi.string().trim().min(2).max(50).optional(),
    profilePhoto: Joi.string().trim().uri().allow('').optional(),
    skills: Joi.array().items(Joi.string()).optional(),
    department: Joi.string().trim().max(50).optional(),
    designation: Joi.string().trim().max(50).optional(),
  }),
};

export const validateImportCSV = {
  body: Joi.object({
    csvData: Joi.string().required().messages({
      'any.required': 'CSV text data payload is required.',
    }),
  }),
};
