'use strict';

/**
 * Rate Limiter Middleware
 *
 * Implements per-route and per-user rate limits backed by Redis in production,
 * with in-memory fallback when Redis is unreachable.
 *
 * Limits (all per-window, key scheme in parentheses):
 *   Global:         300 / 15min  per IP
 *   Login (IP):      10 / 15min  per IP
 *   Login (email):    5 / 15min  per email
 *   Register:         5 / 60min  per IP
 *   Password-reset:   3 / 60min  per IP  +  3 / 60min per email
 *   Refresh:         60 / 15min  per IP
 *   Auth (user):    120 / 1min   per authenticated user id
 *   Unauth (IP):    120 / 1min   per IP
 *
 * Requirements: 7.1–7.12
 */

const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const Redis = require('ioredis');
const { keyFor } = require('../security/rateLimitKey');
const { query } = require('../config/database');
const logger = require('../config/logger');
const env = require('../config/env');

// ── Redis client (shared, lazy-connected) ─────────────────────────────────────

let redisClient = null;
let redisAvailable = false;

/**
 * Returns a connected ioredis client for the store, or null on failure.
 * Fallback to in-memory limits is handled by createLimiter.
 */
async function getRedisClient() {
  if (redisClient) return redisClient;

  try {
    const client = new Redis(env.REDIS_URL, {
      // Don't auto-reconnect forever — let the fallback kick in
      maxRetriesPerRequest: 2,
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    client.on('error', (err) => {
      if (redisAvailable) {
        logger.error({ err }, 'rate-limiter: Redis connection error, falling back to in-memory limits');
      }
      redisAvailable = false;
    });

    client.on('ready', () => {
      redisAvailable = true;
      logger.info('rate-limiter: Redis store connected');
    });

    await client.connect();
    redisClient = client;
    return client;
  } catch (err) {
    logger.error({ err }, 'rate-limiter: Redis unreachable at startup, using in-memory limits (degraded mode)');
    redisAvailable = false;
    return null;
  }
}

// ── Audit helper ─────────────────────────────────────────────────────────────

/**
 * Inserts a `rate_limit_exceeded` Security_Event into audit_logs.
 * Fire-and-forget — never blocks the 429 response.
 */
function emitRateLimitEvent({ req, limitName, identifier }) {
  const ip = req.ip || '';
  const userAgent = (req.headers['user-agent'] || '').slice(0, 512);
  const requestId = req.id || '';

  query(
    `INSERT INTO audit_logs
       (actor_user_id, event_type, outcome, request_id, ip, user_agent, metadata)
     VALUES
       ($1, 'rate_limit_exceeded', 'failure', $2, $3, $4, $5)`,
    [
      req.user ? req.user.id : null,
      requestId,
      ip,
      userAgent,
      JSON.stringify({ route: req.path, limitName, identifier }),
    ],
  ).catch((dbErr) => {
    logger.warn({ dbErr }, 'rate-limiter: failed to write audit log');
  });
}

// ── Store builder ─────────────────────────────────────────────────────────────

/**
 * Builds a RedisStore if the store is configured to use Redis AND a client is
 * available.  Returns undefined (falls back to in-memory) otherwise.
 */
function buildStore(client, prefix) {
  if (!client || !redisAvailable) return undefined;
  return new RedisStore({
    // ioredis adapter: map sendCommand(...args) -> client.call(command, ...rest)
    sendCommand: (...args) => client.call(...args),
    prefix,
  });
}

// ── Generic limiter factory ───────────────────────────────────────────────────

/**
 * Creates an express-rate-limit instance.
 *
 * @param {object} opts
 * @param {number}   opts.windowMs
 * @param {number}   opts.max
 * @param {string}   opts.limitName   - Human-readable identifier for the audit log
 * @param {'ip'|'user'|'email'|'ip+email'} opts.scheme
 * @param {string}   [opts.storePrefix]
 * @param {object}   [opts.redisClient]
 */
function createLimiter({ windowMs, max, limitName, scheme, storePrefix, redisClient: client }) {
  const useRedis =
    (env.RATE_LIMIT_STORE === 'redis' || env.NODE_ENV === 'production') && !!client;

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,

    // Key derivation via security/rateLimitKey.js (Req 7.11)
    keyGenerator: (req) => keyFor(req, scheme, env.TRUSTED_PROXY_DEPTH),

    // Redis store or in-memory fallback
    store: useRedis ? buildStore(client, storePrefix) : undefined,

    // 429 body (Req 7.10)
    handler: (req, res) => {
      const identifier = keyFor(req, scheme, env.TRUSTED_PROXY_DEPTH);

      // Emit Security_Event (Req 7.12)
      emitRateLimitEvent({ req, limitName, identifier });

      const retryAfter = Math.ceil((res.getHeader('X-RateLimit-Reset') - Date.now() / 1000) || windowMs / 1000);

      res.set('Retry-After', String(Math.max(1, retryAfter)));
      res.status(429).json({
        status: 'error',
        message: 'Too many requests. Please try again later.',
        code: 'RATE_LIMITED',
        requestId: req.id || '',
      });
    },

    skip: () => false,
  });
}

// ── Initialise limiters (Redis client injected lazily) ────────────────────────

/**
 * We export factory functions that accept the (possibly null) Redis client.
 * `initRateLimiters()` is called once at boot from app.js after the Redis
 * client has had a chance to connect.  Until then, all limiters operate
 * in-memory.
 */
let _generalLimiter = null;
let _loginIpLimiter = null;
let _loginEmailLimiter = null;
let _registerLimiter = null;
let _passwordResetIpLimiter = null;
let _passwordResetEmailLimiter = null;
let _refreshLimiter = null;
let _authUserLimiter = null;
let _unauthIpLimiter = null;
let _aiLimiter = null;

function buildAllLimiters(client) {
  _generalLimiter = createLimiter({
    windowMs: 15 * 60 * 1000,
    max: 300,
    limitName: 'global',
    scheme: 'ip',
    storePrefix: 'rl:global:',
    redisClient: client,
  });

  _loginIpLimiter = createLimiter({
    windowMs: 15 * 60 * 1000,
    max: 10,
    limitName: 'login_ip',
    scheme: 'ip',
    storePrefix: 'rl:login:ip:',
    redisClient: client,
  });

  _loginEmailLimiter = createLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    limitName: 'login_email',
    scheme: 'email',
    storePrefix: 'rl:login:em:',
    redisClient: client,
  });

  _registerLimiter = createLimiter({
    windowMs: 60 * 60 * 1000,
    max: 5,
    limitName: 'register',
    scheme: 'ip',
    storePrefix: 'rl:register:',
    redisClient: client,
  });

  _passwordResetIpLimiter = createLimiter({
    windowMs: 60 * 60 * 1000,
    max: 3,
    limitName: 'password_reset_ip',
    scheme: 'ip',
    storePrefix: 'rl:pwreset:ip:',
    redisClient: client,
  });

  _passwordResetEmailLimiter = createLimiter({
    windowMs: 60 * 60 * 1000,
    max: 3,
    limitName: 'password_reset_email',
    scheme: 'email',
    storePrefix: 'rl:pwreset:em:',
    redisClient: client,
  });

  _refreshLimiter = createLimiter({
    windowMs: 15 * 60 * 1000,
    max: 60,
    limitName: 'refresh',
    scheme: 'ip',
    storePrefix: 'rl:refresh:',
    redisClient: client,
  });

  _authUserLimiter = createLimiter({
    windowMs: 60 * 1000,
    max: 120,
    limitName: 'auth_user',
    scheme: 'user',
    storePrefix: 'rl:auth:user:',
    redisClient: client,
  });

  _unauthIpLimiter = createLimiter({
    windowMs: 60 * 1000,
    max: 120,
    limitName: 'unauth_ip',
    scheme: 'ip',
    storePrefix: 'rl:unauth:ip:',
    redisClient: client,
  });

  _aiLimiter = createLimiter({
    windowMs: 60 * 1000,
    max: 10,
    limitName: 'ai_ip',
    scheme: 'ip',
    storePrefix: 'rl:ai:',
    redisClient: client,
  });
}

// Build in-memory limiters immediately (no Redis yet)
buildAllLimiters(null);

/**
 * Call once at boot (after event loop starts) to wire Redis-backed stores.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
let _initialized = false;
async function initRateLimiters() {
  if (_initialized) return;
  _initialized = true;

  if (env.RATE_LIMIT_STORE !== 'redis' && env.NODE_ENV !== 'production') {
    logger.info('rate-limiter: running with in-memory store (RATE_LIMIT_STORE != redis)');
    return;
  }

  const client = await getRedisClient();
  if (client) {
    buildAllLimiters(client);
    logger.info('rate-limiter: Redis-backed store active');
  } else {
    logger.warn('rate-limiter: degraded — Redis unreachable, using in-memory limits');
  }
}

// ── Proxy objects ─────────────────────────────────────────────────────────────
// Each export is a stable middleware reference that delegates to the current
// (possibly rebuilt) limiter instance.  This lets app.js import before
// initRateLimiters() runs without capturing a stale reference.

const generalLimiter       = (req, res, next) => _generalLimiter(req, res, next);
const loginIpLimiter       = (req, res, next) => _loginIpLimiter(req, res, next);
const loginEmailLimiter    = (req, res, next) => _loginEmailLimiter(req, res, next);
const registerLimiter      = (req, res, next) => _registerLimiter(req, res, next);
const passwordResetIpLimiter    = (req, res, next) => _passwordResetIpLimiter(req, res, next);
const passwordResetEmailLimiter = (req, res, next) => _passwordResetEmailLimiter(req, res, next);
const refreshLimiter       = (req, res, next) => _refreshLimiter(req, res, next);
const authUserLimiter      = (req, res, next) => _authUserLimiter(req, res, next);
const unauthIpLimiter      = (req, res, next) => _unauthIpLimiter(req, res, next);
const aiLimiter            = (req, res, next) => _aiLimiter(req, res, next);

/**
 * Combined login limiter: runs both IP and email limiters in sequence.
 * Whichever trips first returns 429 (Req 7.3).
 */
const loginLimiter = [loginIpLimiter, loginEmailLimiter];

/**
 * Combined password-reset limiter: IP AND email (Req 7.5).
 */
const passwordResetLimiter = [passwordResetIpLimiter, passwordResetEmailLimiter];

/**
 * Per-request dynamic limiter: 120/min per user-id if authenticated,
 * 120/min per IP if not (Req 7.7, 7.8).
 */
const perRequestLimiter = (req, res, next) => {
  if (req.user && req.user.id) {
    return _authUserLimiter(req, res, next);
  }
  return _unauthIpLimiter(req, res, next);
};

module.exports = {
  initRateLimiters,
  generalLimiter,
  loginLimiter,
  loginIpLimiter,
  loginEmailLimiter,
  registerLimiter,
  passwordResetLimiter,
  passwordResetIpLimiter,
  passwordResetEmailLimiter,
  refreshLimiter,
  authUserLimiter,
  unauthIpLimiter,
  perRequestLimiter,
  aiLimiter,
};
