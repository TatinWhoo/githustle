'use strict';

const { matches } = require('../security/originMatcher');
const env = require('../config/env');

const allowlist = (env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const devLocalhost = env.NODE_ENV === 'development';

/**
 * CORS middleware using the origin allowlist from CORS_ORIGINS env var.
 * Handles OPTIONS preflight and regular requests.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function corsAllowlist(req, res, next) {
  const origin = req.headers.origin;

  if (!matches(origin, allowlist, { devLocalhost })) {
    return next();
  }

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Request-Id, X-Correlation-ID');
    res.setHeader('Access-Control-Expose-Headers', 'X-Correlation-ID, X-Request-Id');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Expose-Headers', 'X-Correlation-ID, X-Request-Id');
  return next();
}

module.exports = corsAllowlist;
