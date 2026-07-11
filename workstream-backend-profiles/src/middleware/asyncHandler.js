// src/middleware/asyncHandler.js
// Wraps async route handlers so rejected promises reach Express's
// error-handling middleware instead of crashing the process unhandled.
// Without this, every controller needs its own try/catch block.

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
