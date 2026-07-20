// src/queues/overdueReminder.worker.js
// Purpose: BullMQ worker that processes the overdue-check job.
//
// What it does:
//   1. Queries invoices table for status='sent' + due_date < today
//   2. Updates their status to 'overdue'
//   3. Increments reminder_count
//   4. (Future M7): Sends email notification via notification queue
//
// Where to start it:
//   Import and call startOverdueWorker() from server.js after initSocket().
const { Worker } = require('bullmq');
const { connection } = require('./connection');
const invoicesRepo = require('../invoices/invoices.repository');
const { queueEmail } = require('./email.queue');
const notifService = require('../notifications/notifications.service');

function startOverdueWorker() {
    const worker = new Worker(
        'overdue-reminders',
        async (job) => {
            console.log(`[overdue-worker] Processing job ${job.id}...`);

            const overdueInvoices = await invoicesRepo.findOverdueInvoices();
            console.log(`[overdue-worker] Found ${overdueInvoices.length} overdue invoice(s)`);

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

                    // Queue email via Resend (skips if no email address on record)
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
                        });
                    }

                    processed += 1;
                } catch (err) {
                    // Log but don't crash — continue processing remaining invoices
                    console.error(`[overdue-worker] Failed to process invoice ${invoice.id}:`, err.message);
                }
            }

            return { processed, total: overdueInvoices.length };
        },
        {
            connection,
            concurrency: 1,  // Sequential — no need for parallel invoice processing
        }
    );

    worker.on('completed', (job, result) => {
        console.log(`[overdue-worker] Job ${job.id} completed:`, result);
    });

    worker.on('failed', (job, err) => {
        console.error(`[overdue-worker] Job ${job?.id} failed:`, err.message);
    });

    console.log('🔄 Overdue reminder worker started');
    return worker;
}

module.exports = { startOverdueWorker };
