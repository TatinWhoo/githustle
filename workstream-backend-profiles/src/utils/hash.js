// src/utils/hash.js
// Uses bcryptjs — a pure-JS implementation — instead of the native
// `bcrypt` package. Slightly slower per hash, but it has zero native
// build dependencies, which matters once this runs inside a slim Docker
// image in Milestone 10. One less thing that can fail at build time.
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const env = require('../config/env');

// ── Passwords ──────────────────────────────────────────────
// bcrypt is slow on purpose — that's what makes brute-forcing a stolen
// hash expensive. Never swap this for a fast hash like plain SHA-256.

async function hashPassword(plain) {
  return bcrypt.hash(plain, env.BCRYPT_SALT_ROUNDS);
}

async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// ── Opaque tokens (refresh tokens, email verification links) ────
// These are NOT passwords — they're high-entropy random strings, so a
// fast hash is fine here. We hash them purely so a stolen database dump
// doesn't hand over directly-usable tokens. The raw token only ever
// exists in the httpOnly cookie or the one-time email link.

function generateRawToken() {
  return crypto.randomBytes(32).toString('hex'); // 64 hex chars, 256 bits of entropy
}

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

module.exports = { hashPassword, comparePassword, generateRawToken, hashToken };
