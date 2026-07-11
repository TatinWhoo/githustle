// src/middleware/validate.js
const AppError = require('../utils/AppError');

// Validates req[source] (default 'body') against a Zod schema. On
// failure, returns 422 with field-level error messages — this is what
// keeps unvalidated input from ever reaching a controller.
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const error = new AppError('Validation failed', 422, 'VALIDATION_ERROR');
      error.fieldErrors = result.error.flatten().fieldErrors;
      return next(error);
    }

    req[source] = result.data; // replace with the parsed/coerced data
    next();
  };
}

module.exports = validate;
