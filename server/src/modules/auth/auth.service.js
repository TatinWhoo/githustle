// src/modules/auth/auth.service.js
const crypto = require('crypto');
const env = require('../../config/env');
const AppError = require('../../utils/AppError');
const { hashPassword, comparePassword, generateRawToken, hashToken } = require('../../utils/hash');
const { signAccessToken } = require('../../utils/jwt');
const { sendEmail, buildVerificationEmail } = require('../../utils/email');
const repo = require('./auth.repository');

const REFRESH_TOKEN_MAX_AGE_MS = env.REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000;

// Pre-computed dummy hash for timing equalization on unknown-email path.
// Initialized lazily on first login attempt to avoid blocking module load.
let _dummyHash = null;
async function getDummyHash() {
  if (!_dummyHash) _dummyHash = await hashPassword('GitHustle_dummy_timing_equalization_v1');
  return _dummyHash;
}

function toSafeUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    emailVerified: user.email_verified,
    createdAt: user.created_at,
  };
}

async function register({ email, password, role }) {
  const existing = await repo.findUserByEmail(email);
  if (existing) {
    throw new AppError('Could not create account with these details.', 409);
  }

  const passwordHash = await hashPassword(password);
  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + env.EMAIL_VERIFY_EXPIRES_HOURS * 60 * 60 * 1000);

  const user = await repo.createUser({
    email,
    passwordHash,
    role,
    verifyTokenHash: tokenHash,
    verifyExpiresAt: expiresAt,
  });

  const { subject, html } = buildVerificationEmail(rawToken);
  await sendEmail({ to: email, subject, html });

  return toSafeUser(user);
}

async function verifyEmail(rawToken) {
  const tokenHash = hashToken(rawToken);
  const user = await repo.findUserByVerifyTokenHash(tokenHash);

  if (!user) {
    throw new AppError('Verification link is invalid or has expired.', 400);
  }

  await repo.markEmailVerified(user.id);
  return { email: user.email };
}

async function resendVerification(email) {
  const user = await repo.findUserByEmail(email);
  if (!user || user.email_verified) return;

  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + env.EMAIL_VERIFY_EXPIRES_HOURS * 60 * 60 * 1000);

  await repo.setVerificationToken(user.id, tokenHash, expiresAt);

  const { subject, html } = buildVerificationEmail(rawToken);
  await sendEmail({ to: email, subject, html });
}

/**
 * Issues a new access + refresh token pair.
 * @param {{ id: string, role: string }} user
 * @param {{ ip?: string, userAgent?: string, family?: string, parentId?: string }} opts
 * @returns {{ accessToken: string, rawRefreshToken: string, tokenFamilyId: string }}
 */
async function issueTokenPair(user, { ip, userAgent, family, parentId } = {}) {
  const accessToken = signAccessToken(user);

  const rawRefreshToken = generateRawToken();
  const refreshTokenHash = hashToken(rawRefreshToken);
  const tokenFamilyId = family || crypto.randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS);

  await repo.createRefreshTokenV2({
    userId: user.id,
    tokenHash: refreshTokenHash,
    tokenFamilyId,
    parentId: parentId || null,
    expiresAt,
    ip,
    userAgent,
  });

  return { accessToken, rawRefreshToken, tokenFamilyId };
}

async function login({ email, password, ip, userAgent }) {
  const startTime = Date.now();

  // Enforces wall-clock minimum on every exit path (success, 401, 423, 403).
  // tolerance: LOGIN_TIMING_BUDGET_MS ± 50 ms — floor is budget - 50.
  async function enforceTimingBudget() {
    const elapsed = Date.now() - startTime;
    const minTime = env.LOGIN_TIMING_BUDGET_MS - 50;
    if (elapsed < minTime) {
      await new Promise((resolve) => setTimeout(resolve, minTime - elapsed));
    }
  }

  // Single error instance used for both unknown-email and wrong-password paths
  // so message, status, and code are byte-identical (requirement 6.13).
  const genericError = new AppError('Incorrect email or password.', 401);

  try {
    const user = await repo.findUserByEmail(email);

    // ── Unknown email path (12.2) ─────────────────────────────────────────────
    // Run dummy bcrypt compare to equalize timing with the known-user wrong-password path.
    if (!user) {
      await comparePassword(password, await getDummyHash());
      await repo.insertAuditLog({
        userId: null,
        eventType: 'login_failure',
        outcome: 'failure',
        requestId: null,
        ip,
        userAgent,
        metadata: { reason: 'invalid_credentials' },
      });
      throw genericError;
    }

    // ── Inactive account ──────────────────────────────────────────────────────
    if (user.status !== 'active') {
      throw new AppError('This account is not active. Contact support.', 403);
    }

    // ── Already-locked account (12.1) ─────────────────────────────────────────
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      await repo.insertAuditLog({
        userId: user.id,
        eventType: 'login_failure',
        outcome: 'failure',
        requestId: null,
        ip,
        userAgent,
        metadata: { reason: 'account_locked' },
      });
      throw new AppError(
        `Account temporarily locked. Try again in ${minutesLeft} minute(s).`,
        423,
        'ACCOUNT_LOCKED'
      );
    }

    // ── Password check ────────────────────────────────────────────────────────
    const passwordMatches = await comparePassword(password, user.password_hash);

    if (!passwordMatches) {
      const attempts = await repo.incrementFailedAttempts(user.id);

      if (attempts >= env.LOGIN_MAX_ATTEMPTS) {
        // Threshold reached — lock account and emit two audit events (12.1).
        const lockedUntil = new Date(Date.now() + env.LOGIN_LOCKOUT_MINUTES * 60 * 1000);
        await repo.lockAccount(user.id, lockedUntil);
        await repo.insertAuditLog({
          userId: user.id,
          eventType: 'account_locked',
          outcome: 'failure',
          requestId: null,
          ip,
          userAgent,
          metadata: { reason: 'too_many_failed_attempts', lockedUntilIso: lockedUntil.toISOString() },
        });
        await repo.insertAuditLog({
          userId: user.id,
          eventType: 'login_failure',
          outcome: 'failure',
          requestId: null,
          ip,
          userAgent,
          metadata: { reason: 'account_locked' },
        });
        throw new AppError(
          `Too many failed attempts. Account locked for ${env.LOGIN_LOCKOUT_MINUTES} minutes.`,
          423,
          'ACCOUNT_LOCKED'
        );
      }

      await repo.insertAuditLog({
        userId: user.id,
        eventType: 'login_failure',
        outcome: 'failure',
        requestId: null,
        ip,
        userAgent,
        metadata: { reason: 'invalid_credentials' },
      });
      throw genericError;
    }

    // ── Email not verified ────────────────────────────────────────────────────
    if (!user.email_verified) {
      await repo.insertAuditLog({
        userId: user.id,
        eventType: 'login_failure',
        outcome: 'failure',
        requestId: null,
        ip,
        userAgent,
        metadata: { reason: 'email_not_verified' },
      });
      throw new AppError('Please verify your email before logging in.', 403, 'EMAIL_NOT_VERIFIED');
    }

    // ── Success (12.1) ────────────────────────────────────────────────────────
    await repo.resetLoginAttempts(user.id, ip);

    const { accessToken, rawRefreshToken } = await issueTokenPair(user, { ip, userAgent });

    await repo.insertAuditLog({
      userId: user.id,
      eventType: 'login_success',
      outcome: 'success',
      requestId: null,
      ip,
      userAgent,
      metadata: {},
    });

    return { user: toSafeUser(user), accessToken, rawRefreshToken };
  } finally {
    await enforceTimingBudget();
  }
}

async function refresh({ rawRefreshToken, ip, userAgent }) {
  if (!rawRefreshToken) throw new AppError('No refresh token provided.', 401);

  const tokenHash = hashToken(rawRefreshToken);
  const stored = await repo.findRefreshTokenByHashV2(tokenHash);

  if (!stored) throw new AppError('Invalid refresh token.', 401);

  // Reuse detection — revoked or already-rotated token used again
  if (stored.state === 'revoked') {
    await repo.revokeFamilyV2(stored.token_family_id);
    await repo.insertAuditLog({
      userId: stored.user_id,
      eventType: 'refresh_token_reuse_detected',
      outcome: 'failure',
      ip,
      userAgent,
      metadata: { tokenFamilyId: stored.token_family_id, state: stored.state },
    });
    throw new AppError('Session invalid. Please log in again.', 401, 'SESSION_REVOKED');
  }

  if (stored.state === 'rotated') {
    await repo.revokeFamilyV2(stored.token_family_id);
    await repo.insertAuditLog({
      userId: stored.user_id,
      eventType: 'refresh_token_reuse_detected',
      outcome: 'failure',
      ip,
      userAgent,
      metadata: { tokenFamilyId: stored.token_family_id, state: stored.state },
    });
    throw new AppError('Session invalid. Please log in again.', 401, 'TOKEN_REUSE_DETECTED');
  }

  if (new Date(stored.expires_at) < new Date()) {
    throw new AppError('Session expired. Please log in again.', 401);
  }

  const user = await repo.findUserById(stored.user_id);
  if (!user || user.status !== 'active') throw new AppError('Account no longer active.', 403);

  // Mark current token as rotated (not active anymore)
  await repo.markTokenRotated(stored.id);

  // Issue new pair in same family, with parentId pointing to current token
  const { accessToken, rawRefreshToken: newRawRefreshToken } = await issueTokenPair(user, {
    ip,
    userAgent,
    family: stored.token_family_id,
    parentId: stored.id,
  });

  return { accessToken, rawRefreshToken: newRawRefreshToken };
}

async function logout({ rawRefreshToken }) {
  if (!rawRefreshToken) return;
  const tokenHash = hashToken(rawRefreshToken);
  const stored = await repo.findRefreshTokenByHashV2(tokenHash);
  if (stored) await repo.revokeFamilyV2(stored.token_family_id);
}

/**
 * Changes a user's password and revokes all their active refresh tokens.
 * @param {string} userId
 * @param {string} newPassword
 */
async function changePassword(userId, newPassword) {
  const passwordHash = await hashPassword(newPassword);
  await require('../../config/database').query(
    `UPDATE users SET password_hash = $2 WHERE id = $1`,
    [userId, passwordHash]
  );
  await repo.revokeAllUserTokens(userId);
}

/**
 * Initiates a password reset flow.
 * Always returns success message — never reveals whether email exists.
 * @param {{ email: string }} params
 */
async function requestPasswordReset({ email }) {
  const user = await repo.findUserByEmail(email);

  if (user && user.status === 'active') {
    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes

    await repo.setPasswordResetToken(user.id, tokenHash, expiresAt);

    const link = `${env.CLIENT_URL}/reset-password?token=${rawToken}`;
    await sendEmail({
      to: email,
      subject: 'Reset your GitHustle password',
      html: `
        <p>You requested a password reset for your GitHustle account.</p>
        <p>Click the link below to set a new password. This link expires in 60 minutes.</p>
        <p><a href="${link}">${link}</a></p>
        <p>If you did not request this, you can safely ignore this email.</p>
      `,
    });
  }

  return { message: 'If that email exists, a password reset link has been sent.' };
}

/**
 * Completes the password reset flow.
 * @param {{ rawToken: string, newPassword: string }} params
 */
async function resetPassword({ rawToken, newPassword }) {
  const tokenHash = hashToken(rawToken);
  const user = await repo.findUserByPasswordResetToken(tokenHash);

  if (!user) {
    throw new AppError('Invalid or expired reset token.', 400, 'INVALID_RESET_TOKEN');
  }

  const passwordHash = await hashPassword(newPassword);
  await require('../../config/database').query(
    `UPDATE users SET password_hash = $2 WHERE id = $1`,
    [user.id, passwordHash]
  );

  await repo.clearPasswordResetToken(user.id);
  await repo.revokeAllUserTokens(user.id);
}

async function getCurrentUser(userId) {
  const user = await repo.findUserById(userId);
  if (!user) throw new AppError('User not found.', 404);
  return toSafeUser(user);
}

module.exports = {
  register,
  verifyEmail,
  resendVerification,
  login,
  refresh,
  logout,
  getCurrentUser,
  issueTokenPair,
  changePassword,
  requestPasswordReset,
  resetPassword,
  REFRESH_TOKEN_MAX_AGE_MS,
};
