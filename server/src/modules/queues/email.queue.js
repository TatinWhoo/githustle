// src/modules/queues/email.queue.js
// Purpose: BullMQ queue for outgoing transactional emails via Resend.
//
// Why a queue instead of calling Resend inline?
//   - Email delivery can take 100–500ms (network call to Resend API).
//   - Failures (network hiccup, Resend rate limit) should retry automatically.
//   - Queuing keeps socket/invoice handlers instant and decoupled from email.
//
// Job payload: { to, subject, html }
// The worker (email.worker.js) handles the actual Nodemailer send to Resend SMTP.
const { Queue } = require('bullmq');
const { connection } = require('./connection');

const emailQueue = new Queue('emails', { connection });

// Purpose: Add an email job with retry + backoff config.
// `to`      — recipient address (string or array for multiple recipients)
// `subject` — plain-text subject
// `html`    — HTML email body
async function queueEmail({ to, subject, html }) {
    await emailQueue.add(
        'send-email',
        { to, subject, html },
        {
            attempts: 3,                                   // retry on Resend SMTP failure
            backoff: { type: 'exponential', delay: 5000 }, // 5s → 10s → 20s
            removeOnComplete: 200,
            removeOnFail: 100,
        }
    );
}

module.exports = { emailQueue, queueEmail };
