// src/middleware/validate.js
const AppError = require('../utils/AppError');

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const error = new AppError('Validation failed', 422, 'VALIDATION_ERROR');
      error.fieldErrors = result.error.flatten().fieldErrors;
      return next(error);
    }

    req[source] = result.data;
    next();
  };
}

module.exports = validate;
