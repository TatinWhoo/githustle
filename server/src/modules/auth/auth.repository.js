// src/modules/auth/auth.repository.js
// All raw SQL for auth lives here. Services never write SQL directly.
const { query } = require('../../config/database');
const { redact } = require('../../security/redact');

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

// ── Legacy refresh token functions (kept for backward compat) ─────────────────

async function createRefreshToken({ userId, tokenHash, family, expiresAt, ip, userAgent }) {
  // Thin wrapper — delegates to V2 so new columns are populated.
  return createRefreshTokenV2({
    userId,
    tokenHash,
    tokenFamilyId: family,
    parentId: null,
    expiresAt,
    ip,
    userAgent,
  });
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

// ── V2 refresh token functions (state machine) ────────────────────────────────

async function createRefreshTokenV2({ userId, tokenHash, tokenFamilyId, parentId, expiresAt, ip, userAgent }) {
  const { rows } = await query(
    `INSERT INTO refresh_tokens
       (user_id, token_hash, family, token_family_id, parent_id, expires_at, ip_address, user_agent, state, issued_at)
     VALUES ($1, $2, $3, $3, $4, $5, $6, $7, 'active', NOW())
     RETURNING id, token_family_id, state`,
    [userId, tokenHash, tokenFamilyId, parentId, expiresAt, ip, userAgent]
  );
  return rows[0];
}

async function findRefreshTokenByHashV2(tokenHash) {
  const { rows } = await query(
    `SELECT * FROM refresh_tokens WHERE token_hash = $1`,
    [tokenHash]
  );
  return rows[0] || null;
}

async function markTokenRotated(id) {
  await query(
    `UPDATE refresh_tokens SET state = 'rotated' WHERE id = $1 AND state = 'active'`,
    [id]
  );
}

async function revokeFamilyV2(tokenFamilyId) {
  await query(
    `UPDATE refresh_tokens
     SET state = 'revoked', revoked_at = NOW()
     WHERE token_family_id = $1 AND state != 'revoked'`,
    [tokenFamilyId]
  );
}

async function revokeAllUserTokens(userId) {
  await query(
    `UPDATE refresh_tokens
     SET state = 'revoked', revoked_at = NOW()
     WHERE user_id = $1 AND state != 'revoked'`,
    [userId]
  );
}

// ── Audit log ─────────────────────────────────────────────────────────────────

async function insertAuditLog({ userId, eventType, outcome, requestId, ip, userAgent, metadata }) {
  const safeMetadata = metadata ? redact(metadata) : null;
  await query(
    `INSERT INTO audit_logs
       (user_id, action, event_type, outcome, request_id, ip_address, user_agent, metadata)
     VALUES ($1, $2, $2, $3, $4, $5, $6, $7)`,
    [userId || null, eventType, outcome || null, requestId || null, ip || null, userAgent || null, safeMetadata ? JSON.stringify(safeMetadata) : null]
  );
}

// ── Password reset ────────────────────────────────────────────────────────────

async function setPasswordResetToken(userId, tokenHash, expiresAt) {
  await query(
    `UPDATE users SET password_reset_token = $2, password_reset_expires_at = $3 WHERE id = $1`,
    [userId, tokenHash, expiresAt]
  );
}

async function findUserByPasswordResetToken(tokenHash) {
  const { rows } = await query(
    `SELECT id, email, status FROM users
     WHERE password_reset_token = $1
       AND password_reset_expires_at > NOW()
       AND deleted_at IS NULL`,
    [tokenHash]
  );
  return rows[0] || null;
}

async function clearPasswordResetToken(userId) {
  await query(
    `UPDATE users SET password_reset_token = NULL, password_reset_expires_at = NULL WHERE id = $1`,
    [userId]
  );
}

module.exports = {
  // User
  findUserByEmail,
  findUserById,
  createUser,
  findUserByVerifyTokenHash,
  markEmailVerified,
  setVerificationToken,
  incrementFailedAttempts,
  lockAccount,
  resetLoginAttempts,
  // Refresh tokens — legacy
  createRefreshToken,
  findRefreshTokenByHash,
  revokeRefreshToken,
  revokeFamily,
  // Refresh tokens — V2
  createRefreshTokenV2,
  findRefreshTokenByHashV2,
  markTokenRotated,
  revokeFamilyV2,
  revokeAllUserTokens,
  // Audit
  insertAuditLog,
  // Password reset
  setPasswordResetToken,
  findUserByPasswordResetToken,
  clearPasswordResetToken,
};
