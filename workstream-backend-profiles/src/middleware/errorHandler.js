// src/middleware/errorHandler.js
const AppError = require('../utils/AppError');
const env = require('../config/env');

function notFoundHandler(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

// Express recognizes this as an error handler because it takes 4 args —
// the unused `next` parameter is required for that signature to register.
// eslint-disable-next-line no-unused-vars
function globalErrorHandler(err, req, res, next) {
  // Postgres unique violation (e.g. duplicate email slipping past the
  // service-layer check due to a race condition)
  if (err.code === '23505') {
    return res.status(409).json({
      status: 'error',
      message: 'A record with this value already exists.',
    });
  }

  // Malformed or expired JWT bubbling up from jwt.verify()
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ status: 'error', message: 'Invalid token.' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ status: 'error', message: 'Token has expired.' });
  }

  // Multer's own errors (file too large, too many files, wrong field
  // name) are NOT instances of our AppError, so without this they'd
  // fall through to the generic 500 branch below — a confusing result
  // for what's really just bad input.
  if (err.name === 'MulterError') {
    const messages = {
      LIMIT_FILE_SIZE: 'File is too large.',
      LIMIT_UNEXPECTED_FILE: 'Unexpected file field, or too many files.',
    };
    return res.status(400).json({
      status: 'error',
      message: messages[err.code] || `Upload error: ${err.message}`,
    });
  }

  // Known, expected errors we threw on purpose
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      ...(err.code ? { code: err.code } : {}),
      ...(err.fieldErrors ? { errors: err.fieldErrors } : {}),
    });
  }

  // Anything else is a genuine bug — log full detail server-side, but
  // never leak stack traces or internals to the client.
  console.error('UNEXPECTED ERROR 💥', err);

  return res.status(500).json({
    status: 'error',
    message:
      env.NODE_ENV === 'production' ? 'Something went wrong. Please try again.' : err.message,
  });
}

module.exports = { notFoundHandler, globalErrorHandler };
