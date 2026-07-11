// src/app.js
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const { generalLimiter } = require('./middleware/rateLimiter');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./modules/auth/auth.routes');
const profilesRoutes = require('./modules/profiles/profiles.routes');

const app = express();

// Express sits behind a reverse proxy (NGINX) in production — this makes
// req.ip reflect the real client IP from X-Forwarded-For, which matters
// for accurate rate limiting and audit logs later.
app.set('trust proxy', 1);

// ── Global middleware chain ─────────────────────────────────
// Order matters: security headers and parsing happen before anything
// touches user input; rate limiting happens before routes are reached.
app.use(
  helmet({
    // Helmet's default Cross-Origin-Resource-Policy is 'same-origin',
    // which silently blocks <img src="http://localhost:4000/uploads/...">
    // from rendering on a frontend running on a different origin
    // (localhost:5173). Avatars and portfolio images are meant to be
    // publicly loadable cross-origin, so we relax this specifically
    // rather than disabling Helmet's protections everywhere.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true, // allow the httpOnly refresh cookie to be sent
  })
);
app.use(express.json({ limit: '10kb' })); // small limit — auth payloads are tiny
app.use(cookieParser());
app.use(generalLimiter);

// ── Static file serving ─────────────────────────────────────
// Uploaded avatars and portfolio images are served directly from disk.
// This is fine for local development; in production this directory
// would not exist on the app server at all — files would be served
// straight from S3/CDN instead, and this line would be deleted, not
// reconfigured. That's the payoff of routing all file access through
// fileStorage.js: swapping storage backends touches one file, not this one.
app.use(`/${env.UPLOAD_DIR}`, express.static(path.join(process.cwd(), env.UPLOAD_DIR)));

// ── Routes ───────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/profiles', profilesRoutes);

// ── 404 + global error handler (always last in the chain) ──
app.use(notFoundHandler);
app.use(globalErrorHandler);

module.exports = app;
