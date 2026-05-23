import Joi from 'joi';

/**
 * AUTH MODULE - PAYLOAD SCHEMA VALIDATORS (validator.js)
 * Responsibility: Outlines Joi validation shapes for auth REST endpoints payload inputs.
 * Secures routing entries by intercepting client anomalies before database hits.
 */

export const validateOrgCode = {
  body: Joi.object({
    code: Joi.string().required().trim().uppercase().messages({
      'any.required': 'Organization access code is required.',
      'string.empty': 'Organization code cannot be empty.',
    }),
  }),
};

export const validateRegister = {
  body: Joi.object({
    name: Joi.string().required().trim().min(2).max(50).messages({
      'any.required': 'Name is required.',
      'string.min': 'Name must be at least 2 characters long.',
    }),
    email: Joi.string().required().trim().email().messages({
      'any.required': 'Email is required.',
      'string.email': 'Please supply a valid email format.',
    }),
    password: Joi.string().required().min(8).max(100)
      .pattern(/[A-Z]/, 'uppercase')
      .pattern(/[a-z]/, 'lowercase')
      .pattern(/[0-9]/, 'digit')
      .pattern(/[!@#$%^&*(),.?":{}|<>]/, 'special character')
      .messages({
        'any.required': 'Password is required.',
        'string.min': 'Password must be at least 8 characters long.',
        'string.pattern.name': 'Password must contain at least one {#name}.',
      }),
    organizationCode: Joi.string().required().trim().uppercase().messages({
      'any.required': 'Organization code is required to register inside a workspace.',
    }),
    // SECURITY: role is NOT accepted from client — always defaults to DEVELOPER server-side
  }),
};

export const validateLogin = {
  body: Joi.object({
    email: Joi.string().required().trim().email().messages({
      'any.required': 'Email is required.',
      'string.email': 'Please provide a valid email.',
    }),
    password: Joi.string().required().messages({
      'any.required': 'Password is required.',
    }),
    organizationCode: Joi.string().required().trim().uppercase().messages({
      'any.required': 'Organization workspace code is required.',
    }),
  }),
};

export const validateForgotPassword = {
  body: Joi.object({
    email: Joi.string().required().trim().email().messages({
      'any.required': 'Email is required for password recovery.',
      'string.email': 'Valid email is required.',
    }),
  }),
};

export const validateResetPassword = {
  body: Joi.object({
    token: Joi.string().required().messages({
      'any.required': 'Reset token is required.',
    }),
    password: Joi.string().required().min(8).max(100)
      .pattern(/[A-Z]/, 'uppercase')
      .pattern(/[a-z]/, 'lowercase')
      .pattern(/[0-9]/, 'digit')
      .pattern(/[!@#$%^&*(),.?":{}|<>]/, 'special character')
      .messages({
        'any.required': 'New password is required.',
        'string.min': 'New password must be at least 8 characters long.',
        'string.pattern.name': 'Password must contain at least one {#name}.',
      }),
  }),
};

export const validateRefreshToken = {
  body: Joi.object({
    refreshToken: Joi.string().required().messages({
      'any.required': 'Refresh token is required to refresh session.',
    }),
  }),
};
