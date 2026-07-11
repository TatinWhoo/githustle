// src/utils/email.js
const nodemailer = require('nodemailer');
const env = require('../config/env');

// In development, if no SMTP credentials are configured, we log the
// email to the console instead of failing. This lets you test the full
// registration → verification flow without standing up a mail server.
const isSmtpConfigured = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);

const transporter = isSmtpConfigured
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    })
  : null;

async function sendEmail({ to, subject, html }) {
  if (!transporter) {
    console.log('\n──────── 📧 DEV EMAIL (no SMTP configured) ────────');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log(html.replace(/<[^>]+>/g, '')); // strip tags for terminal readability
    console.log('────────────────────────────────────────────────────\n');
    return;
  }

  await transporter.sendMail({ from: env.EMAIL_FROM, to, subject, html });
}

function buildVerificationEmail(rawToken) {
  const link = `${env.CLIENT_URL}/verify-email?token=${rawToken}`;
  return {
    subject: 'Verify your WorkStream account',
    html: `
      <p>Welcome to WorkStream!</p>
      <p>Click the link below to verify your email address. This link expires in ${env.EMAIL_VERIFY_EXPIRES_HOURS} hours.</p>
      <p><a href="${link}">${link}</a></p>
    `,
  };
}

module.exports = { sendEmail, buildVerificationEmail };
