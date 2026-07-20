// src/utils/sentry.js
// Purpose: Sentry error tracking. Captures uncaught exceptions and
// unhandled rejections automatically. Also used in errorHandler.js.
//
// Why initialize before everything else?
//   Sentry instruments Node modules at require() time.
//   It must be the first thing loaded in server.js before any other require.
const Sentry = require('@sentry/node');
const env = require('../config/env');

function initSentry() {
    if (!env.SENTRY_DSN) return; // No-op if DSN not configured

    Sentry.init({
        dsn: env.SENTRY_DSN,
        environment: env.NODE_ENV,
        // Capture 100% of transactions in dev, 10% in production
        tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
    });
}

// Capture an error manually (used in errorHandler.js)
function captureError(err, context = {}) {
    if (!env.SENTRY_DSN) return;
    Sentry.withScope((scope) => {
        Object.entries(context).forEach(([k, v]) => scope.setExtra(k, v));
        Sentry.captureException(err);
    });
}

module.exports = { initSentry, captureError };
