// src/middleware/errorHandler.js
const AppError = require('../utils/AppError');
const env = require('../config/env');

function notFoundHandler(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

// eslint-disable-next-line no-unused-vars
function globalErrorHandler(err, req, res, next) {
  // Postgres unique violation
  if (err.code === '23505') {
    return res.status(409).json({
      status: 'error',
      message: 'A record with this value already exists.',
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ status: 'error', message: 'Invalid token.' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ status: 'error', message: 'Token has expired.' });
  }

  // Known operational errors
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      ...(err.code ? { code: err.code } : {}),
      ...(err.fieldErrors ? { errors: err.fieldErrors } : {}),
    });
  }

  // Unknown bugs — log server-side, hide from client
  console.error('UNEXPECTED ERROR 💥', err);

  return res.status(500).json({
    status: 'error',
    message:
      env.NODE_ENV === 'production' ? 'Something went wrong. Please try again.' : err.message,
  });
}

module.exports = { notFoundHandler, globalErrorHandler };
