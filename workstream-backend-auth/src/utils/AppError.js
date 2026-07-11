// src/utils/AppError.js
// A custom error class so the global error handler can distinguish
// "expected" errors (bad input, wrong password, locked account) from
// real bugs that need a stack trace logged server-side.

class AppError extends Error {
  constructor(message, statusCode, code = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // marks this as a known, handled error
    this.code = code; // optional machine-readable code, e.g. 'ACCOUNT_LOCKED'
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
