import Joi from 'joi';
import { PROJECT_STATUS } from '../../constants/index.js';

/**
 * PROJECTS MODULE - PAYLOAD SCHEMA VALIDATORS (validator.js)
 * Responsibility: Outlines Joi validation shapes for Project REST endpoints.
 */

export const validateCreateProject = {
  body: Joi.object({
    name: Joi.string().required().trim().min(3).max(100).messages({
      'any.required': 'Project name is required.',
      'string.min': 'Project name must be at least 3 characters.',
    }),
    description: Joi.string().trim().max(1000).allow('').optional(),
    template: Joi.string().valid('KANBAN', 'SCRUM', 'WATERFALL', 'CUSTOM').optional(),
    startDate: Joi.date().iso().required().messages({
      'any.required': 'Project start date is required.',
      'date.format': 'Start date must follow ISO 8601 format.',
    }),
    endDate: Joi.date().iso().required().messages({
      'any.required': 'Project deadline is required.',
      'date.format': 'Deadline date must follow ISO 8601 format.',
    }),
    members: Joi.array().items(Joi.string().regex(/^[0-9a-fA-F]{24}$/)).optional(),
  }),
};

export const validateUpdateProject = {
  body: Joi.object({
    name: Joi.string().trim().min(3).max(100).optional(),
    description: Joi.string().trim().max(1000).allow('').optional(),
    status: Joi.string().valid(...Object.values(PROJECT_STATUS)).optional(),
    template: Joi.string().valid('KANBAN', 'SCRUM', 'WATERFALL', 'CUSTOM').optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    members: Joi.array().items(Joi.string().regex(/^[0-9a-fA-F]{24}$/)).optional(),
  }),
};

export const validateAddDependency = {
  body: Joi.object({
    dependencyId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
      'any.required': 'Dependency Project ID is required.',
      'string.pattern.base': 'Dependency Project ID must be a valid MongoDB ObjectId.',
    }),
  }),
};
