// src/middleware/requireRole.js
const AppError = require('../utils/AppError');

// Must run AFTER `authenticate` — it reads req.user.role, which that
// middleware attaches from the decoded JWT. This is coarse-grained RBAC
// (role-based): "must be a freelancer at all" vs. the finer-grained
// ABAC ownership checks ("must own THIS specific resource"), which live
// in the service layer instead, since only the service knows how to
// look up who owns what.
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      // Defensive — this should never trigger if authenticate() always
      // runs first, but failing loudly here beats a confusing 500 later.
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
