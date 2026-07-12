// src/modules/auth/auth.repository.js
// All raw SQL for auth lives here. Services never write SQL directly.
const { query } = require('../../config/database');

async function findUserByEmail(email) {
  const { rows } = await query(
    `SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL`,
    [email]
  );
  return rows[0] || null;
}

async function findUserById(id) {
  const { rows } = await query(
    `SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  return rows[0] || null;
}

async function createUser({ email, passwordHash, role, verifyTokenHash, verifyExpiresAt }) {
  const { rows } = await query(
    `INSERT INTO users (email, password_hash, role, email_verify_token, email_verify_expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, role, status, email_verified, created_at`,
    [email, passwordHash, role, verifyTokenHash, verifyExpiresAt]
  );
  return rows[0];
}

async function findUserByVerifyTokenHash(tokenHash) {
  const { rows } = await query(
    `SELECT * FROM users
     WHERE email_verify_token = $1
       AND email_verify_expires_at > NOW()
       AND deleted_at IS NULL`,
    [tokenHash]
  );
  return rows[0] || null;
}

async function markEmailVerified(userId) {
  await query(
    `UPDATE users
     SET email_verified = TRUE,
         email_verify_token = NULL,
         email_verify_expires_at = NULL
     WHERE id = $1`,
    [userId]
  );
}

async function setVerificationToken(userId, tokenHash, expiresAt) {
  await query(
    `UPDATE users
     SET email_verify_token = $2, email_verify_expires_at = $3
     WHERE id = $1`,
    [userId, tokenHash, expiresAt]
  );
}

async function incrementFailedAttempts(userId) {
  const { rows } = await query(
    `UPDATE users
     SET failed_login_attempts = failed_login_attempts + 1
     WHERE id = $1
     RETURNING failed_login_attempts`,
    [userId]
  );
  return rows[0].failed_login_attempts;
}

async function lockAccount(userId, lockedUntil) {
  await query(
    `UPDATE users
     SET locked_until = $2, failed_login_attempts = 0
     WHERE id = $1`,
    [userId, lockedUntil]
  );
}

async function resetLoginAttempts(userId, ip) {
  await query(
    `UPDATE users
     SET failed_login_attempts = 0,
         locked_until = NULL,
         last_login_at = NOW(),
         last_login_ip = $2
     WHERE id = $1`,
    [userId, ip]
  );
}

async function createRefreshToken({ userId, tokenHash, family, expiresAt, ip, userAgent }) {
  const { rows } = await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, family, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, family`,
    [userId, tokenHash, family, expiresAt, ip, userAgent]
  );
  return rows[0];
}

async function findRefreshTokenByHash(tokenHash) {
  const { rows } = await query(
    `SELECT * FROM refresh_tokens WHERE token_hash = $1`,
    [tokenHash]
  );
  return rows[0] || null;
}

async function revokeRefreshToken(id) {
  await query(`UPDATE refresh_tokens SET is_revoked = TRUE WHERE id = $1`, [id]);
}

async function revokeFamily(family) {
  await query(`UPDATE refresh_tokens SET is_revoked = TRUE WHERE family = $1`, [family]);
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  findUserByVerifyTokenHash,
  markEmailVerified,
  setVerificationToken,
  incrementFailedAttempts,
  lockAccount,
  resetLoginAttempts,
  createRefreshToken,
  findRefreshTokenByHash,
  revokeRefreshToken,
  revokeFamily,
};
