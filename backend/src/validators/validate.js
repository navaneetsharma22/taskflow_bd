import AppError from '../utils/AppError.js';

/**
 * VALIDATORS DIRECTORY - SCHEMAS VALIDATION MIDDLEWARE
 * Responsibility: Reusable request validation middleware.
 * Validates incoming `req.body`, `req.query`, and `req.params` schemas.
 * Reduces code duplication in controllers by intercepting invalid payloads before they trigger database queries.
 *
 * Example Usage inside routes.js:
 * router.post('/register', validate(registerSchema), authController.register);
 */
const validate = (schema) => (req, res, next) => {
  const validations = [];
  const validateSection = (section, reqKey) => {
    if (schema[section]) {
      const { error, value } = schema[section].validate(req[reqKey], {
        abortEarly: false,
        stripUnknown: true,
        errors: { wrap: { label: '' } }
      });
      if (error) {
        validations.push(...error.details.map(d => d.message));
      } else {
        req[reqKey] = value; // Replace raw body/query/params with sanitized/stripped values
      }
    }
  };

  validateSection('body', 'body');
  validateSection('query', 'query');
  validateSection('params', 'params');

  if (validations.length > 0) {
    return next(new AppError(`Validation failure: ${validations.join('; ')}`, 400));
  }

  next();
};

export default validate;
