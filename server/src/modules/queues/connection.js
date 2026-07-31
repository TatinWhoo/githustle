// src/modules/queues/connection.js
// Purpose: Shared ioredis connection config for all BullMQ queues and workers.
//
// Security hardening (task 18.1):
//   - TLS enabled in production (rediss:// forces TLS via ioredis tls option)
//   - Password extracted from validated REDIS_URL (Config_Loader already gates)
//   - No plaintext fallback at runtime; if REDIS_URL lacks rediss:// in prod,
//     Config_Loader will have already exited before this module is required
//
// Dev note: if REDIS_URL is empty, `connection` is exported as null.
// Queue/worker files check for null and skip initialisation.
'use strict';

const env = require('../../config/env');
const logger = require('../../config/logger');

if (!env.REDIS_URL) {
  logger.warn('[queues/connection] REDIS_URL not set — queues and workers disabled');
  module.exports = { connection: null };
  return;
}

let redisUrl;
try {
  redisUrl = new URL(env.REDIS_URL);
} catch (err) {
  logger.error({ err: err.message }, '[queues/connection] Invalid REDIS_URL — cannot parse');
  throw new Error('Invalid REDIS_URL: ' + err.message);
}

const isTls = redisUrl.protocol === 'rediss:';

const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port) || (isTls ? 6380 : 6379),
  password: redisUrl.password || undefined,
  maxRetriesPerRequest: null, // Required by BullMQ (disables auto-retry on reads)
  // Enable TLS when scheme is rediss:// (required in production per Config_Loader)
  ...(isTls && { tls: {} }),
};

module.exports = { connection };
