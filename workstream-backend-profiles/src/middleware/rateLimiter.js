// src/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

// Factory so each route can define its own window/limit/message.
// Note: this uses express-rate-limit's default in-memory store, which
// only works correctly on a single instance. Once WorkStream scales to
// multiple Node processes (Phase 05 of the roadmap), this needs a Redis
// store so all instances share the same counters.
function createRateLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true, // return RateLimit-* headers
    legacyHeaders: false,
    message: { status: 'error', message },
  });
}

// General-purpose limiter applied to the whole API.
const generalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests. Please try again later.',
});

// Tighter limiter specifically for login — slows down credential
// stuffing at the network layer, before account lockout even kicks in.
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts from this IP. Please try again later.',
});

// Registration abuse (bot signups) gets its own, stricter limiter.
const registerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many accounts created from this IP. Please try again later.',
});

module.exports = { generalLimiter, loginLimiter, registerLimiter };
