// src/middleware/errorHandler.js
'use strict';

const AppError = require('../utils/AppError');
const env = require('../config/env');
const { captureError } = require('../utils/sentry');
const logger = require('../config/logger');

// ── SQL keyword sequences that should never appear in a client response body ──
const SQL_PATTERN = /\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN|CONSTRAINT|pg_|column|table)\b/i;

// Stack-trace frame pattern
const STACK_FRAME_RE = /\bat [^\s]+:\d+:\d+\b/;

// node_modules leak
const NODE_MODULES_RE = /node_modules\//;

// Absolute cwd path leak  (e.g. C:\Users\... or /home/user/...)
const CWD = process.cwd().replace(/\\/g, '/');
const cwdRe = new RegExp(CWD.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

/**
 * Assert the serialized response body contains no internal details.
 * In dev/test: throw so the bug is caught immediately.
 * In prod: return false so caller falls back to bare generic 500.
 *
 * @param {string} bodyStr  - JSON.stringify of the response body object
 * @param {Error}  original - the original error (used to check SQL from err.message)
 * @returns {boolean} true if clean, false if leak detected
 */
function assertBodyClean(bodyStr, original) {
  const leaks = [];

  if (STACK_FRAME_RE.test(bodyStr)) leaks.push('stack frame');
  if (NODE_MODULES_RE.test(bodyStr)) leaks.push('node_modules path');
  if (cwdRe.test(bodyStr)) leaks.push('cwd absolute path');

  // Check if any SQL keyword from the *original* error message leaked into body
  if (original && original.message && SQL_PATTERN.test(original.message)) {
    // The original error had SQL keywords — verify none slipped into the body
    if (SQL_PATTERN.test(bodyStr)) leaks.push('SQL keyword sequence');
  }

  if (leaks.length === 0) return true;

  if (env.NODE_ENV === 'production') {
    logger.error({ leaks }, 'errorHandler: body leak detected, sending bare 500');
    return false;
  }
  // dev/test — throw so CI catches it
  throw new Error(`errorHandler body-leak detected: ${leaks.join(', ')}`);
}

/**
 * Build a safe response body object, run the post-serialize guard, and send.
 * Never writes to res before Logger + Sentry have captured the error.
 */
function sendSafe(res, statusCode, bodyObj, originalErr) {
  const bodyStr = JSON.stringify(bodyObj);
  const clean = assertBodyClean(bodyStr, originalErr);
  if (!clean) {
    // Bare fallback — no requestId to avoid potential leak path
    const requestId = res.locals?.requestId || undefined;
    return res.status(500).json({
      status: 'error',
      message: 'Something went wrong. Please try again.',
      ...(requestId ? { requestId } : {}),
    });
  }
  return res.status(statusCode).json(bodyObj);
}

// ── Not-found handler ─────────────────────────────────────────────────────────
function notFoundHandler(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
function globalErrorHandler(err, req, res, next) {
  const requestId = req.id || res.locals?.requestId || undefined;
  const reqLog = req.log || logger;

  // ── 1. Postgres unique-violation (23505) ────────────────────────────────────
  if (err.code === '23505') {
    // Capture to Logger/Sentry first (non-sensitive; pg error only, not user data)
    reqLog.warn({ err: { code: err.code }, requestId }, 'pg unique violation');
    return sendSafe(
      res,
      409,
      { status: 'error', message: 'A record with this value already exists.', requestId },
      err
    );
  }

  // ── 2. JWT errors ───────────────────────────────────────────────────────────
  // Must NOT include err.message or err.name in the body.
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    reqLog.warn({ errName: err.name, requestId }, 'JWT validation failure');
    return sendSafe(
      res,
      401,
      { status: 'error', message: 'Authentication required.', requestId },
      err
    );
  }

  // ── 3. Operational AppError ─────────────────────────────────────────────────
  if (err.isOperational) {
    reqLog.warn({ err: { statusCode: err.statusCode, code: err.code }, requestId }, err.message);
    const body = {
      status: 'error',
      message: err.message,
      requestId,
      ...(err.code ? { code: err.code } : {}),
      ...(err.fieldErrors ? { errors: err.fieldErrors } : {}),
    };
    return sendSafe(res, err.statusCode, body, err);
  }

  // ── 4. Unhandled / programmer error ────────────────────────────────────────
  // Capture to Logger + Sentry BEFORE touching res.
  reqLog.error({ err, requestId }, 'Unexpected error');
  captureError(err, {
    method: req.method,
    url: req.originalUrl,
    requestId,
  });

  const message = 'Something went wrong. Please try again.';
  return sendSafe(res, 500, { status: 'error', message, requestId }, err);
}

module.exports = { notFoundHandler, globalErrorHandler };
