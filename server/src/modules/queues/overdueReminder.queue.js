// src/queues/overdueReminder.queue.js
// Purpose: Define the BullMQ queue and a helper function to schedule the
// repeating overdue-check job.
//
// Security hardening (task 18.1):
//   - Zod schema for job payload (Req 15.3)
//   - 503 QUEUE_UNAVAILABLE on Redis error (Req 15.2)
//   - Retry: 5 attempts, exponential backoff (Req 15.3)
//   - requestId propagated through job data (Req 15.4)
//   - Dead-letter: removeOnFail: { count: 100 } retains exhausted jobs (Req 15.5)
'use strict';

const { Queue } = require('bullmq');
const { z } = require('zod');
const { connection } = require('./connection');
const AppError = require('../../utils/AppError');
const logger = require('../../config/logger');

// ── Schema ────────────────────────────────────────────────────────────────────
// Payload is minimal — worker queries DB directly; only correlation ID travels
const overdueJobSchema = z.object({
  requestId: z.string().optional(),
});

// ── Queue ─────────────────────────────────────────────────────────────────────
const overdueQueue = new Queue('overdue-reminders', { connection });

// ── Producer ──────────────────────────────────────────────────────────────────
/**
 * Schedule a repeating overdue-check job (every 6 hours).
 * Removes existing repeatable jobs first to prevent duplicates on restart.
 *
 * @param {{ requestId?: string }} [opts]
 */
async function scheduleOverdueCheck({ requestId } = {}) {
  // Remove any existing repeating jobs first to prevent duplicates on restart.
  const existingJobs = await overdueQueue.getRepeatableJobs();
  for (const job of existingJobs) {
    await overdueQueue.removeRepeatableByKey(job.key);
  }

  try {
    await overdueQueue.add(
      'check-overdue',
      // Req 15.4: correlation ID in job data; Req 15.6: no sensitive fields
      { requestId },
      {
        repeat: { pattern: '0 */6 * * *' },            // every 6 hours at minute 0
        attempts: 5,                                    // Req 15.3: max 5 attempts
        backoff: { type: 'exponential', delay: 10000 }, // 10s → 20s → 40s → 80s → 160s
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 100 },                   // Req 15.5: retain exhausted jobs
      }
    );
  } catch (err) {
    logger.error({ err: err.message, requestId }, 'Redis unreachable — cannot schedule overdue check');
    throw new AppError('Overdue reminder queue temporarily unavailable', 503, 'QUEUE_UNAVAILABLE');
  }

  logger.info({ requestId }, 'Overdue reminder job scheduled');
}

module.exports = { overdueQueue, scheduleOverdueCheck, overdueJobSchema };
