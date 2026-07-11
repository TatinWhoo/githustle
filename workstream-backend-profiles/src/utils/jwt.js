// src/utils/jwt.js
const jwt = require('jsonwebtoken');
const env = require('../config/env');

// Access tokens are short-lived, stateless JWTs. They are NEVER stored
// in the database — that statelessness is the entire point. Anything
// that needs to be revocable (sessions, refresh tokens) is opaque and
// DB-backed instead — see utils/hash.js.

function signAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_EXPIRES_IN,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

module.exports = { signAccessToken, verifyAccessToken };
