import Joi from 'joi';

/**
 * MESSAGING MODULE - PAYLOAD SCHEMA VALIDATORS (validator.js)
 * Responsibility: Outlines Joi validation shapes for Message REST endpoints.
 */

const attachmentSchema = Joi.object({
  fileName: Joi.string().required().messages({ 'any.required': 'Attachment file name is required.' }),
  fileUrl: Joi.string().uri().required().messages({ 'any.required': 'Attachment file URL is required.' }),
  fileType: Joi.string().required(),
  fileSize: Joi.number().integer().required(),
});

export const validateSendDM = {
  body: Joi.object({
    recipientId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
      'any.required': 'Recipient ID is required.',
      'string.pattern.base': 'Recipient ID must be a valid ObjectId.',
    }),
    content: Joi.string().trim().max(4000).allow('').optional(),
    attachments: Joi.array().items(attachmentSchema).optional(),
  }).or('content', 'attachments').messages({
    'object.missing': 'Message must contain either content text or at least one file attachment.',
  }),
};

export const validateSendProjectMessage = {
  body: Joi.object({
    projectId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
      'any.required': 'Project ID is required.',
      'string.pattern.base': 'Project ID must be a valid ObjectId.',
    }),
    content: Joi.string().trim().max(4000).allow('').optional(),
    attachments: Joi.array().items(attachmentSchema).optional(),
  }).or('content', 'attachments').messages({
    'object.missing': 'Message must contain either content text or at least one file attachment.',
  }),
};

export const validateSendTaskMessage = {
  body: Joi.object({
    taskId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
      'any.required': 'Task ID is required.',
      'string.pattern.base': 'Task ID must be a valid ObjectId.',
    }),
    content: Joi.string().trim().max(4000).allow('').optional(),
    attachments: Joi.array().items(attachmentSchema).optional(),
  }).or('content', 'attachments').messages({
    'object.missing': 'Message must contain either content text or at least one file attachment.',
  }),
};

export const validateRecipientParam = {
  params: Joi.object({
    recipientId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
      'string.pattern.base': 'Recipient ID must be a valid ObjectId.',
    }),
  }),
};

export const validateProjectParam = {
  params: Joi.object({
    projectId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
      'string.pattern.base': 'Project ID must be a valid ObjectId.',
    }),
  }),
};

export const validateTaskParam = {
  params: Joi.object({
    taskId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
      'string.pattern.base': 'Task ID must be a valid ObjectId.',
    }),
  }),
};
