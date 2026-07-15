// src/modules/queues/email.worker.js
// Purpose: BullMQ worker that processes email jobs using Nodemailer + Resend SMTP.
//
// How Resend SMTP works with Nodemailer:
//   - Host:  smtp.resend.com
//   - Port:  465 (SSL) — Resend recommends port 465
//   - User:  'resend'  (literal string, not your email)
//   - Pass:  your RESEND_API_KEY (re_xxxx...)
//
// The transporter is created ONCE at worker startup and reused for all jobs.
// This avoids the overhead of re-authenticating the SMTP connection per email.
//
// Concurrency = 5: Resend free tier rate limit is 100 emails/day.
// In practice this means 5 concurrent sends is more than enough.
const { Worker } = require('bullmq');
const nodemailer = require('nodemailer');
const { connection } = require('./connection');
const env = require('../../config/env');

function startEmailWorker() {
    // Configure Nodemailer to send through Resend's SMTP relay.
    // Why port 465 + secure: true?
    //   Resend's SMTP docs specify port 465 with SSL/TLS (not STARTTLS).
    //   Port 587 with STARTTLS also works, but 465 is more reliable with Resend.
    const transporter = nodemailer.createTransport({
        host: 'smtp.resend.com',
        port: 465,
        secure: true,       // SSL — required for port 465
        auth: {
            user: 'resend',             // literal string — Resend requires this exact value
            pass: env.RESEND_API_KEY,   // your API key from resend.com/api-keys
        },
    });

    const worker = new Worker(
        'emails',
        async (job) => {
            const { to, subject, html } = job.data;

            await transporter.sendMail({
                from: env.RESEND_FROM,   // e.g. "GitHustle <noreply@yourdomain.com>"
                to,
                subject,
                html,
            });

            console.log(`[email-worker] Sent "${subject}" → ${to}`);
        },
        {
            connection,
            concurrency: 5,
        }
    );

    worker.on('completed', (job) => {
        console.log(`[email-worker] Job ${job.id} done`);
    });

    worker.on('failed', (job, err) => {
        console.error(`[email-worker] Job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
    });

    console.log('📧 Email worker started (Resend SMTP)');
    return worker;
}

module.exports = { startEmailWorker };
