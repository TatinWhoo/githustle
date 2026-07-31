// src/modules/queues/email.queue.js
// Purpose: BullMQ queue for outgoing transactional emails via Resend.
//
// Security hardening (task 18.1):
//   - Zod schema validation before enqueue (Req 15.3)
//   - 503 QUEUE_UNAVAILABLE on Redis error (Req 15.2)
//   - Retry: 5 attempts, exponential backoff (Req 15.3)
//   - Correlation ID (requestId) propagated through job data (Req 15.4)
//   - Dead-letter: removeOnFail: { count: 100 } retains exhausted jobs (Req 15.5)
//   - Sensitive fields NEVER enqueued — payload is { to, subject, html, requestId } only (Req 15.6)
//     Caller must never pass password, token, apiKey, secret, etc.
'use strict';

const { Queue } = require('bullmq');
const { z } = require('zod');
const { connection } = require('./connection');
const AppError = require('../../utils/AppError');
const logger = require('../../config/logger');

// ── Schema ────────────────────────────────────────────────────────────────────
const emailJobSchema = z.object({
  to: z.union([
    z.string().email(),
    z.array(z.string().email()).min(1),
  ]),
  subject: z.string().min(1).max(500),
  html: z.string().min(1),
  // Correlation ID from upstream request — optional but propagated when present
  requestId: z.string().optional(),
});

// ── Queue ─────────────────────────────────────────────────────────────────────
const emailQueue = connection ? new Queue('emails', { connection }) : null;

// ── Producer ──────────────────────────────────────────────────────────────────
/**
 * Validate payload and enqueue an email job.
 * Throws AppError(422) on invalid payload, AppError(503) if Redis is unreachable.
 *
 * @param {{ to: string|string[], subject: string, html: string, requestId?: string }} payload
 */
async function queueEmail(payload) {
  if (!emailQueue) {
    logger.warn({ requestId: payload?.requestId }, 'Email queue disabled (no Redis) — skipping email');
    return;
  }
  const parsed = emailJobSchema.safeParse(payload);
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    logger.warn({ errors, requestId: payload?.requestId }, 'Email job payload validation failed');
    throw new AppError('Invalid email job payload', 422, 'VALIDATION_ERROR');
  }

  try {
    await emailQueue.add(
      'send-email',
      parsed.data, // validated data only — no raw caller input
      {
        attempts: 5,                                    // Req 15.3: max 5 attempts
        backoff: { type: 'exponential', delay: 5000 },  // 5s → 10s → 20s → 40s → 80s
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 100 },                   // Req 15.5: retain for inspection
      }
    );
  } catch (err) {
    logger.error({ err: err.message, requestId: payload?.requestId }, 'Redis unreachable — cannot enqueue email');
    throw new AppError('Email queue temporarily unavailable', 503, 'QUEUE_UNAVAILABLE');
  }
}

module.exports = { emailQueue, queueEmail, emailJobSchema };
