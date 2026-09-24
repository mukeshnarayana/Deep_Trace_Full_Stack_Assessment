const AppError = require('../utils/appError');

/**
 * Middleware factory for Zod schema validation
 * @param {ZodSchema} schema - Zod schema to validate req.body against
 */
const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const formattedErrors = result.error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message
    }));
    return next(new AppError('Validation error', 400, formattedErrors));
  }
  // Replace req.body with sanitized & validated data
  req.body = result.data;
  next();
};

module.exports = {
  validateBody
};
