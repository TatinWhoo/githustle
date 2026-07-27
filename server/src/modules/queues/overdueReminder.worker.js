// src/queues/overdueReminder.worker.js
// Purpose: BullMQ worker that processes the overdue-check job.
//
// Security hardening (task 18.1):
//   - Zod schema validated at job start; invalid jobs permanently failed via UnrecoverableError (Req 15.3)
//   - Structured logs include jobId, queue, requestId (Req 15.4)
//   - requestId propagated into queueEmail calls for end-to-end correlation (Req 15.4)
//
// What it does:
//   1. Queries invoices table for status='sent' + due_date < today
//   2. Updates their status to 'overdue'
//   3. Increments reminder_count
//   4. Sends email notification via email queue
'use strict';

const { Worker, UnrecoverableError } = require('bullmq');
const { connection } = require('./connection');
const { overdueJobSchema } = require('./overdueReminder.queue');
const logger = require('../../config/logger');
const invoicesRepo = require('../invoices/invoices.repository');
const { queueEmail } = require('./email.queue');
const notifService = require('../notifications/notifications.service');

function startOverdueWorker() {
  const worker = new Worker(
    'overdue-reminders',
    async (job) => {
      // ── Req 15.3: Schema validation — permanent fail on invalid payload ───────
      const parsed = overdueJobSchema.safeParse(job.data);
      if (!parsed.success) {
        const errors = parsed.error.flatten().fieldErrors;
        logger.error(
          { jobId: job.id, queue: 'overdue-reminders', requestId: job.data?.requestId, errors },
          'Overdue job schema validation failed — permanent fail'
        );
        throw new UnrecoverableError('Job payload failed schema validation');
      }

      const { requestId } = parsed.data;

      // ── Req 15.4: Log job start with correlation fields ───────────────────────
      logger.info({ jobId: job.id, queue: 'overdue-reminders', requestId }, 'Overdue check job started');

      const overdueInvoices = await invoicesRepo.findOverdueInvoices();
      logger.info({ jobId: job.id, queue: 'overdue-reminders', requestId, count: overdueInvoices.length }, 'Found overdue invoices');

      let processed = 0;
      for (const invoice of overdueInvoices) {
        try {
          // Mark as overdue (only if still 'sent' — avoids race with manual payment)
          if (invoice.status === 'sent') {
            await invoicesRepo.updateInvoiceStatus(invoice.id, 'overdue');
          }
          await invoicesRepo.incrementReminderCount(invoice.id);

          // Create in-app notification for the freelancer
          await notifService.notify(
            invoice.freelancer_id,
            'invoice',
            `Invoice ${invoice.invoice_number} is overdue`,
            `Your invoice for project "${invoice.project_title}" is past due. Follow up with your client.`,
            `/invoices/${invoice.id}`
          );

          // Req 15.4: propagate requestId through to email queue
          if (invoice.freelancer_email) {
            await queueEmail({
              to:      invoice.freelancer_email,
              subject: `⚠️ Overdue Invoice: ${invoice.invoice_number}`,
              html: `
                <h2>Invoice Overdue</h2>
                <p>Your invoice <strong>${invoice.invoice_number}</strong> for project
                <em>${invoice.project_title}</em> is past its due date.</p>
                <p>Please follow up with your client.</p>
                <p><a href="${process.env.CLIENT_URL}/invoices/${invoice.id}">View Invoice</a></p>
              `,
              requestId, // Req 15.4: correlation ID propagated into child job
            });
          }

          processed += 1;
        } catch (err) {
          // Log but don't crash — continue processing remaining invoices
          logger.error(
            { jobId: job.id, queue: 'overdue-reminders', requestId, invoiceId: invoice.id, err: err.message },
            'Failed to process overdue invoice'
          );
        }
      }

      // ── Req 15.4: Log completion ──────────────────────────────────────────────
      logger.info(
        { jobId: job.id, queue: 'overdue-reminders', requestId, processed, total: overdueInvoices.length },
        'Overdue check job completed'
      );

      return { processed, total: overdueInvoices.length };
    },
    {
      connection,
      concurrency: 1, // Sequential — no need for parallel invoice processing
    }
  );

  // ── Req 15.4: Event-level logs with correlation fields ────────────────────────
  worker.on('completed', (job, result) => {
    logger.info(
      { jobId: job.id, queue: 'overdue-reminders', requestId: job.data?.requestId, result },
      'Overdue job completed'
    );
  });

  worker.on('failed', (job, err) => {
    logger.error(
      {
        jobId: job?.id,
        queue: 'overdue-reminders',
        requestId: job?.data?.requestId,
        attemptsMade: job?.attemptsMade,
        err: err.message,
      },
      'Overdue job failed'
    );
  });

  logger.info('Overdue reminder worker started');
  return worker;
}

module.exports = { startOverdueWorker };
