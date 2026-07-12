// src/utils/hash.js
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const env = require('../config/env');

async function hashPassword(plain) {
  return bcrypt.hash(plain, env.BCRYPT_SALT_ROUNDS);
}

async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

function generateRawToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

module.exports = { hashPassword, comparePassword, generateRawToken, hashToken };
