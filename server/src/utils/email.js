// src/utils/email.js
// Uses RESEND_API_KEY model (matching server .env) with nodemailer fallback.
// In dev with no API key configured, emails print to console instead.
const nodemailer = require('nodemailer');
const env = require('../config/env');

const isSmtpConfigured = Boolean(env.RESEND_API_KEY);

// Resend uses SMTP under the hood — their SMTP endpoint accepts the API key as password.
const transporter = isSmtpConfigured
  ? nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',
        pass: env.RESEND_API_KEY,
      },
    })
  : null;

async function sendEmail({ to, subject, html }) {
  if (!transporter) {
    console.log('\n──────── 📧 DEV EMAIL (no RESEND_API_KEY configured) ────────');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log(html.replace(/<[^>]+>/g, ''));
    console.log('────────────────────────────────────────────────────────────\n');
    return;
  }

  await transporter.sendMail({ from: env.EMAIL_FROM, to, subject, html });
}

function buildVerificationEmail(rawToken) {
  const link = `${env.CLIENT_URL}/verify-email?token=${rawToken}`;
  return {
    subject: 'Verify your GitHustle account',
    html: `
      <p>Welcome to GitHustle!</p>
      <p>Click the link below to verify your email address. This link expires in ${env.EMAIL_VERIFY_EXPIRES_HOURS} hours.</p>
      <p><a href="${link}">${link}</a></p>
    `,
  };
}

module.exports = { sendEmail, buildVerificationEmail };
