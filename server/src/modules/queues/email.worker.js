// src/modules/queues/email.worker.js
// Purpose: BullMQ worker that processes email jobs using Nodemailer + Resend SMTP.
//
// Security hardening (task 18.1):
//   - Zod schema validated at job start; invalid jobs permanently failed via UnrecoverableError (Req 15.3)
//   - Structured logs include jobId, queue, requestId for correlation (Req 15.4)
//   - RESEND_API_KEY read from Config_Loader at execution time — never stored in job payload (Req 15.6)
//
// How Resend SMTP works with Nodemailer:
//   - Host:  smtp.resend.com
//   - Port:  465 (SSL) — Resend recommends port 465
//   - User:  'resend'  (literal string, not your email)
//   - Pass:  your RESEND_API_KEY (re_xxxx...)
//
// The transporter is created ONCE at worker startup and reused for all jobs.
// Concurrency = 5: Resend free tier rate limit is 100 emails/day.
'use strict';

const { Worker, UnrecoverableError } = require('bullmq');
const nodemailer = require('nodemailer');
const { connection } = require('./connection');
const { emailJobSchema } = require('./email.queue');
const env = require('../../config/env');
const logger = require('../../config/logger');

function startEmailWorker() {
  if (!connection) {
    logger.warn('Email worker disabled (no Redis)');
    return null;
  }
  // RESEND_API_KEY read from Config_Loader at worker startup — never from job payload (Req 15.6)
  const transporter = nodemailer.createTransport({
    host: 'smtp.resend.com',
    port: 465,
    secure: true,     // SSL — required for port 465
    auth: {
      user: 'resend', // literal string — Resend requires this exact value
      pass: env.RESEND_API_KEY,
    },
  });

  const worker = new Worker(
    'emails',
    async (job) => {
      // ── Req 15.3: Schema validation — permanent fail on invalid payload ───────
      const parsed = emailJobSchema.safeParse(job.data);
      if (!parsed.success) {
        const errors = parsed.error.flatten().fieldErrors;
        logger.error(
          { jobId: job.id, queue: 'emails', requestId: job.data?.requestId, errors },
          'Email job schema validation failed — permanent fail'
        );
        // UnrecoverableError: BullMQ will not retry this job
        throw new UnrecoverableError('Job payload failed schema validation');
      }

      const { to, subject, html, requestId } = parsed.data;

      // ── Req 15.4: Log job start with correlation fields ───────────────────────
      logger.info({ jobId: job.id, queue: 'emails', requestId }, 'Email job started');

      await transporter.sendMail({
        from: env.RESEND_FROM,
        to,
        subject,
        html,
      });

      // ── Req 15.4: Log completion ──────────────────────────────────────────────
      logger.info({ jobId: job.id, queue: 'emails', requestId, subject }, 'Email sent');
    },
    {
      connection,
      concurrency: 5,
    }
  );

  // ── Req 15.4: Event-level logs with correlation fields ────────────────────────
  worker.on('completed', (job) => {
    logger.info(
      { jobId: job.id, queue: 'emails', requestId: job.data?.requestId },
      'Email job completed'
    );
  });

  worker.on('failed', (job, err) => {
    logger.error(
      {
        jobId: job?.id,
        queue: 'emails',
        requestId: job?.data?.requestId,
        attemptsMade: job?.attemptsMade,
        err: err.message,
      },
      'Email job failed'
    );
  });

  logger.info('Email worker started');
  return worker;
}

module.exports = { startEmailWorker };
