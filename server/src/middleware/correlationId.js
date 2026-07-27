'use strict';

const crypto = require('crypto');
const logger = require('../config/logger');
const Sentry = require('@sentry/node');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function correlationId(req, res, next) {
  const incoming = req.headers['x-request-id'];
  const requestId =
    typeof incoming === 'string' && incoming.length < 128 && UUID_RE.test(incoming)
      ? incoming
      : crypto.randomUUID();

  req.requestId = requestId;
  req.log = logger.child({ requestId });

  try {
    Sentry.getCurrentScope().setTag('requestId', requestId);
  } catch (_) {
    // Sentry not initialized — safe to ignore
  }

  res.setHeader('X-Request-Id', requestId);
  next();
}

module.exports = correlationId;
