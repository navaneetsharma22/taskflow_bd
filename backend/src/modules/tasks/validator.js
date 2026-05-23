import Joi from 'joi';
import { TASK_STATUS, TASK_PRIORITY } from '../../constants/index.js';

/**
 * TASKS MODULE - PAYLOAD SCHEMA VALIDATORS (validator.js)
 * Responsibility: Outlines Joi validation shapes for Task REST endpoints.
 */

export const validateCreateTask = {
  body: Joi.object({
    title: Joi.string().required().trim().min(3).max(150).messages({
      'any.required': 'Task title is required.',
    }),
    description: Joi.string().trim().max(2000).allow('').optional(),
    projectId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
      'any.required': 'Project ID association is required.',
      'string.pattern.base': 'Project ID must be a valid ObjectId.',
    }),
    assigneeId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null).optional(),
    priority: Joi.string().valid(...Object.values(TASK_PRIORITY)).optional(),
    status: Joi.string().valid(...Object.values(TASK_STATUS)).optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    recurring: Joi.object({
      isRecurring: Joi.boolean().required(),
      frequency: Joi.string().valid('DAILY', 'WEEKLY', 'MONTHLY').required(),
    }).optional(),
  }),
};

export const validateUpdateTask = {
  body: Joi.object({
    title: Joi.string().trim().min(3).max(150).optional(),
    description: Joi.string().trim().max(2000).allow('').optional(),
    assigneeId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null).optional(),
    priority: Joi.string().valid(...Object.values(TASK_PRIORITY)).optional(),
    status: Joi.string().valid(...Object.values(TASK_STATUS)).optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
  }),
};

export const validateAddSubtask = {
  body: Joi.object({
    title: Joi.string().required().trim().min(2).max(100).messages({
      'any.required': 'Subtask title is required.',
    }),
  }),
};

export const validateUpdateSubtask = {
  body: Joi.object({
    isCompleted: Joi.boolean().required().messages({
      'any.required': 'Completed status boolean is required.',
    }),
  }),
};

export const validateAddComment = {
  body: Joi.object({
    text: Joi.string().required().trim().min(1).max(1000).messages({
      'any.required': 'Comment text cannot be empty.',
    }),
  }),
};

export const validateAddAttachment = {
  body: Joi.object({
    name: Joi.string().required().trim().min(2).max(100).messages({
      'any.required': 'Attachment name is required.',
    }),
    url: Joi.string().required().trim().uri().messages({
      'any.required': 'Attachment file URL is required.',
      'string.uri': 'Attachment must link to a valid URI.',
    }),
  }),
};

export const validateAddDependency = {
  body: Joi.object({
    dependencyId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
      'any.required': 'Dependency Task ID is required.',
    }),
  }),
};

export const validateAddBlocker = {
  body: Joi.object({
    blockerId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
      'any.required': 'Blocker Task ID is required.',
    }),
  }),
};

export const validateEscalateTask = {
  body: Joi.object({
    reason: Joi.string().required().trim().min(5).max(500).messages({
      'any.required': 'Escalation reason description is required.',
    }),
    escalatedTo: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
      'any.required': 'Escalated recipient User ID is required.',
    }),
  }),
};
