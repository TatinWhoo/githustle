// src/middleware/authenticate.js
const asyncHandler = require('./asyncHandler');
const AppError = require('../utils/AppError');
const { verifyAccessToken } = require('../utils/jwt');

// Protects routes by requiring a valid access token in the Authorization
// header: "Authorization: Bearer <token>"
const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    throw new AppError('You are not logged in. Please log in to continue.', 401);
  }

  const token = header.split(' ')[1];
  const payload = verifyAccessToken(token);

  req.user = { id: payload.sub, role: payload.role };
  next();
});

module.exports = authenticate;
