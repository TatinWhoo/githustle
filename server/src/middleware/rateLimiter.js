// src/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

function createRateLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 'error', message },
  });
}

const generalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests. Please try again later.',
});

const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts from this IP. Please try again later.',
});

const registerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many accounts created from this IP. Please try again later.',
});

const aiLimiter = createRateLimiter({
  windowMs: 60 * 1000,  // 1 minute
  max: 10,
  message: 'Too many AI requests. Please wait a moment.',
});

module.exports = { generalLimiter, loginLimiter, registerLimiter, aiLimiter };
