// src/middleware/requireRole.js
const AppError = require('../utils/AppError');

// Must run AFTER authenticate — reads req.user.role set by that middleware.
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(`This action requires one of these roles: ${allowedRoles.join(', ')}.`, 403)
      );
    }

    next();
  };
}

module.exports = requireRole;
