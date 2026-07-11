// src/app.js
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const { generalLimiter } = require('./middleware/rateLimiter');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./modules/auth/auth.routes');

const app = express();

// Express sits behind a reverse proxy (NGINX) in production — this makes
// req.ip reflect the real client IP from X-Forwarded-For, which matters
// for accurate rate limiting and audit logs later.
app.set('trust proxy', 1);

// ── Global middleware chain ─────────────────────────────────
// Order matters: security headers and parsing happen before anything
// touches user input; rate limiting happens before routes are reached.
app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true, // allow the httpOnly refresh cookie to be sent
  })
);
app.use(express.json({ limit: '10kb' })); // small limit — auth payloads are tiny
app.use(cookieParser());
app.use(generalLimiter);

// ── Routes ───────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);

// ── 404 + global error handler (always last in the chain) ──
app.use(notFoundHandler);
app.use(globalErrorHandler);

module.exports = app;
