'use strict';
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { z } = require('zod');

// ── Duplicate-assignment pre-parser (task 1.2) ────────────────────────────────
const dotenvScanPath = path.join(__dirname, 'dotenvScan.js');
if (fs.existsSync(dotenvScanPath)) {
  const { scanDotenv } = require('./dotenvScan');
  const envFilePath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envFilePath)) {
    scanDotenv(fs.readFileSync(envFilePath, 'utf8'));
  }
}

// ── TRUSTED_PROXY_DEPTH — fallback with warn (not in Zod schema to avoid hard exit) ──
let TRUSTED_PROXY_DEPTH = parseInt(process.env.TRUSTED_PROXY_DEPTH, 10);
if (!Number.isInteger(TRUSTED_PROXY_DEPTH) || TRUSTED_PROXY_DEPTH < 1 || TRUSTED_PROXY_DEPTH > 5) {
  console.warn(`[env] TRUSTED_PROXY_DEPTH invalid or missing (got "${process.env.TRUSTED_PROXY_DEPTH}"), falling back to 1`);
  TRUSTED_PROXY_DEPTH = 1;
}

// ── DATABASE_URL selector (DB_TARGET switch) ──────────────────────────────────
// Reads DB_TARGET ('local' | 'cloud') and picks between DATABASE_URL_LOCAL /
// DATABASE_URL_CLOUD. If DATABASE_URL is set directly, that takes precedence.
// Missing values fall through to Zod validation below with a clear error.
const DB_TARGET = (process.env.DB_TARGET || '').toLowerCase();
if (!process.env.DATABASE_URL) {
  if (DB_TARGET === 'local' && process.env.DATABASE_URL_LOCAL) {
    process.env.DATABASE_URL = process.env.DATABASE_URL_LOCAL;
  } else if (DB_TARGET === 'cloud' && process.env.DATABASE_URL_CLOUD) {
    process.env.DATABASE_URL = process.env.DATABASE_URL_CLOUD;
  }
}
if (DB_TARGET === 'local' || DB_TARGET === 'cloud') {
  console.log(`[env] DB_TARGET=${DB_TARGET}`);
}

// ── Schema ────────────────────────────────────────────────────────────────────
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  // CORS & URLs
  CLIENT_URL: z.string().url(),
  PUBLIC_API_URL: z.string().url().default('http://localhost:4000'),
  CORS_ORIGINS: z.string().optional().default(''),

  // Database
  DATABASE_URL: z.string().min(1),
  ADMIN_DATABASE_URL: z.string().optional().default(''),

  // Redis
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),
  REDIS_PASSWORD: z.string().optional().default(''),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_PREVIOUS_ACCESS_SECRET: z.string().optional().default(''),
  JWT_PREVIOUS_SECRET_ROTATED_AT: z.string().optional().default(''),
  JWT_PREVIOUS_SECRET_GRACE_MINUTES: z.coerce.number().int().positive().default(60),
  JWT_ISSUER: z.string().default('githustle'),
  JWT_AUDIENCE: z.string().default('githustle-api'),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN_DAYS: z.coerce.number().int().positive().default(7),

  // Auth provider
  AUTH_PROVIDER: z.enum(['local', 'clerk']).default('local'),

  // Password hashing
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  // Account lockout
  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  LOGIN_LOCKOUT_MINUTES: z.coerce.number().int().positive().default(15),
  LOGIN_TIMING_BUDGET_MS: z.coerce.number().int().positive().default(200),

  // Email verification
  EMAIL_VERIFY_EXPIRES_HOURS: z.coerce.number().int().positive().default(24),

  // Email (Resend)
  RESEND_API_KEY: z.string().optional().default(''),
  RESEND_FROM: z.string().optional().default('GitHustle <no-reply@githustle.com>'),
  EMAIL_FROM: z.string().optional().default('GitHustle <no-reply@githustle.com>'),

  // AI (Anthropic Claude)
  ANTHROPIC_API_KEY: z.string().optional().default(''),
  AI_MONTHLY_QUOTA: z.preprocess(
    (val) => (val === '' || val === undefined ? undefined : val),
    z.coerce.number().int().min(1).default(5)
  ),

  // reCAPTCHA
  RECAPTCHA_SECRET_KEY: z.string().optional().default(''),

  // File uploads
  UPLOAD_DIR: z.string().default('uploads'),
  MAX_FILE_SIZE: z.coerce.number().positive().default(5242880),
  PORTFOLIO_IMAGE_MAX_SIZE_MB: z.coerce.number().positive().default(8),

  // Sentry
  SENTRY_DSN: z.string().optional().default(''),

  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Rate limiting
  RATE_LIMIT_STORE: z.enum(['memory', 'redis']).default('redis'),

  // Database pool
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  DB_IDLE_TX_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
})
.superRefine((data, ctx) => {
  // Production: PUBLIC_API_URL must start with https://
  if (data.NODE_ENV === 'production' && !data.PUBLIC_API_URL.startsWith('https://')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['PUBLIC_API_URL'],
      message: 'In production, PUBLIC_API_URL must start with https://',
    });
  }

  // Production: REDIS_URL must use rediss:// scheme with non-empty password
  if (data.NODE_ENV === 'production') {
    if (!data.REDIS_URL.startsWith('rediss://')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['REDIS_URL'],
        message: 'In production, REDIS_URL must use the rediss:// scheme',
      });
    } else {
      try {
        const redisUrlParsed = new URL(data.REDIS_URL);
        if (!redisUrlParsed.password || redisUrlParsed.password === '') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['REDIS_URL'],
            message: 'In production, REDIS_URL must include a non-empty password',
          });
        }
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['REDIS_URL'],
          message: 'REDIS_URL is not a valid URL',
        });
      }
    }
  }

  // JWT_ACCESS_SECRET length >= 32 (redundant with schema min(32) but explicit)
  if (data.JWT_ACCESS_SECRET && data.JWT_ACCESS_SECRET.length < 32) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['JWT_ACCESS_SECRET'],
      message: 'JWT_ACCESS_SECRET must be at least 32 characters',
    });
  }

  // Production: BCRYPT_SALT_ROUNDS must be >= 12
  if (data.NODE_ENV === 'production' && data.BCRYPT_SALT_ROUNDS < 12) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['BCRYPT_SALT_ROUNDS'],
      message: 'In production, BCRYPT_SALT_ROUNDS must be >= 12',
    });
  }
});

// ── Parse ─────────────────────────────────────────────────────────────────────
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[env] Invalid environment configuration. Offending variables:');
  const fieldErrors = parsed.error.flatten().fieldErrors;
  for (const field of Object.keys(fieldErrors)) {
    console.error(`  - ${field}`);
  }
  process.exit(1);
}

// ── Secret classification ─────────────────────────────────────────────────────
const SECRET_VARS = new Set([
  'JWT_ACCESS_SECRET',
  'JWT_PREVIOUS_ACCESS_SECRET',
  'DATABASE_URL',
  'REDIS_URL',
  'RESEND_API_KEY',
  'ANTHROPIC_API_KEY',
  'SENTRY_DSN',
  'RECAPTCHA_SECRET_KEY',
  'ADMIN_DATABASE_URL',
]);

// ── JWT rotation grace-window helper ──────────────────────────────────────────
/**
 * Returns true iff the JWT rotation grace window is currently active.
 * @param {Object} opts
 * @param {string} opts.previous       - JWT_PREVIOUS_ACCESS_SECRET value
 * @param {string} opts.previousRotatedAt - ISO-8601 timestamp when rotation occurred
 * @param {number} opts.graceMinutes   - grace window in minutes
 * @param {function} [opts.now]        - function returning current time in ms (default: Date.now)
 * @returns {boolean}
 */
function isGraceWindowActive({ previous, previousRotatedAt, graceMinutes, now = Date.now }) {
  if (!previous || !previousRotatedAt) return false;
  return (now() - Date.parse(previousRotatedAt)) < graceMinutes * 60_000;
}

// ── Export ────────────────────────────────────────────────────────────────────
module.exports = { ...parsed.data, TRUSTED_PROXY_DEPTH, SECRET_VARS, isGraceWindowActive };
