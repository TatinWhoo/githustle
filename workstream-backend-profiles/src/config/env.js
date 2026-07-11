// src/config/env.js
// Validates and exports all environment variables on startup.
// If anything required is missing or malformed, the app refuses to boot —
// fail fast at startup, not three hours later in production.

require('dotenv').config();
const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_URL: z.string().url(),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN_DAYS: z.coerce.number().int().positive().default(7),

  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  LOGIN_LOCKOUT_MINUTES: z.coerce.number().int().positive().default(15),

  EMAIL_VERIFY_EXPIRES_HOURS: z.coerce.number().int().positive().default(24),

  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().int().optional().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  EMAIL_FROM: z.string().default('WorkStream <no-reply@workstream.dev>'),

  // File uploads — defaulted so an existing .env from Milestone 1
  // doesn't need to be touched for this milestone to work.
  UPLOAD_DIR: z.string().default('uploads'),
  AVATAR_MAX_SIZE_MB: z.coerce.number().positive().default(5),
  PORTFOLIO_IMAGE_MAX_SIZE_MB: z.coerce.number().positive().default(8),
  PUBLIC_API_URL: z.string().url().default('http://localhost:4000'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

module.exports = parsed.data;
