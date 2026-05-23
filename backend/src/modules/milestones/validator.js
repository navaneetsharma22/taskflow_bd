import Joi from 'joi';

/**
 * MILESTONES MODULE - PAYLOAD SCHEMA VALIDATORS (validator.js)
 * Responsibility: Outlines Joi validation shapes for Milestone REST endpoints.
 */

export const validateCreateMilestone = {
  body: Joi.object({
    title: Joi.string().required().trim().min(3).max(100).messages({
      'any.required': 'Milestone title is required.',
      'string.min': 'Milestone title must be at least 3 characters.',
    }),
    description: Joi.string().trim().max(1000).allow('').optional(),
    projectId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
      'any.required': 'Project ID association is required.',
      'string.pattern.base': 'Project ID must be a valid ObjectId.',
    }),
    dueDate: Joi.date().iso().required().messages({
      'any.required': 'Milestone due date is required.',
      'date.format': 'Due date must follow ISO 8601 format.',
    }),
  }),
};

export const validateUpdateMilestone = {
  body: Joi.object({
    title: Joi.string().trim().min(3).max(100).optional(),
    description: Joi.string().trim().max(1000).allow('').optional(),
    dueDate: Joi.date().iso().optional(),
    status: Joi.string().valid('UPCOMING', 'ACHIEVED', 'DELAYED').optional(),
    progress: Joi.number().integer().min(0).max(100).optional(),
  }),
};

export const validateLinkTasks = {
  body: Joi.object({
    taskIds: Joi.array().items(Joi.string().regex(/^[0-9a-fA-F]{24}$/)).required().messages({
      'any.required': 'List of associated Task IDs is required.',
    }),
  }),
};
