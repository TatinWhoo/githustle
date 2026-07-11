// src/modules/auth/auth.service.js
const crypto = require('crypto');
const env = require('../../config/env');
const AppError = require('../../utils/AppError');
const {
  hashPassword,
  comparePassword,
  generateRawToken,
  hashToken,
} = require('../../utils/hash');
const { signAccessToken } = require('../../utils/jwt');
const { sendEmail, buildVerificationEmail } = require('../../utils/email');
const repo = require('./auth.repository');

const REFRESH_TOKEN_MAX_AGE_MS = env.REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000;

// Never let password_hash, mfa_secret, or token fields leave this module.
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
    // Same message whether the email exists verified or unverified —
    // don't leak which emails are already registered.
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

  // Always behave as if it succeeded — don't reveal whether the email
  // exists or is already verified. This prevents account enumeration.
  if (!user || user.email_verified) {
    return;
  }

  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + env.EMAIL_VERIFY_EXPIRES_HOURS * 60 * 60 * 1000);

  await repo.setVerificationToken(user.id, tokenHash, expiresAt);

  const { subject, html } = buildVerificationEmail(rawToken);
  await sendEmail({ to: email, subject, html });
}

async function issueTokenPair(user, { ip, userAgent, family }) {
  const accessToken = signAccessToken(user);

  const rawRefreshToken = generateRawToken();
  const refreshTokenHash = hashToken(rawRefreshToken);
  const tokenFamily = family || crypto.randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS);

  await repo.createRefreshToken({
    userId: user.id,
    tokenHash: refreshTokenHash,
    family: tokenFamily,
    expiresAt,
    ip,
    userAgent,
  });

  return { accessToken, rawRefreshToken };
}

async function login({ email, password, ip, userAgent }) {
  const user = await repo.findUserByEmail(email);

  // Same generic error whether the email doesn't exist or the password
  // is wrong — never tell an attacker which part was incorrect.
  const genericError = new AppError('Incorrect email or password.', 401);

  if (!user) throw genericError;

  if (user.status !== 'active') {
    throw new AppError('This account is not active. Contact support.', 403);
  }

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const minutesLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
    throw new AppError(
      `Account temporarily locked due to too many failed attempts. Try again in ${minutesLeft} minute(s).`,
      423, // 423 Locked
      'ACCOUNT_LOCKED'
    );
  }

  const passwordMatches = await comparePassword(password, user.password_hash);

  if (!passwordMatches) {
    const attempts = await repo.incrementFailedAttempts(user.id);

    if (attempts >= env.LOGIN_MAX_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + env.LOGIN_LOCKOUT_MINUTES * 60 * 1000);
      await repo.lockAccount(user.id, lockedUntil);
      throw new AppError(
        `Too many failed attempts. Account locked for ${env.LOGIN_LOCKOUT_MINUTES} minutes.`,
        423,
        'ACCOUNT_LOCKED'
      );
    }

    throw genericError;
  }

  if (!user.email_verified) {
    throw new AppError('Please verify your email before logging in.', 403, 'EMAIL_NOT_VERIFIED');
  }

  await repo.resetLoginAttempts(user.id, ip);

  const { accessToken, rawRefreshToken } = await issueTokenPair(user, { ip, userAgent });

  return { user: toSafeUser(user), accessToken, rawRefreshToken };
}

async function refresh({ rawRefreshToken, ip, userAgent }) {
  if (!rawRefreshToken) {
    throw new AppError('No refresh token provided.', 401);
  }

  const tokenHash = hashToken(rawRefreshToken);
  const stored = await repo.findRefreshTokenByHash(tokenHash);

  if (!stored) {
    throw new AppError('Invalid refresh token.', 401);
  }

  // Reuse of a revoked token means it was copied somewhere it shouldn't
  // be — the legitimate owner already rotated past it, so this is
  // either a stolen token or a replay attack. Burn the whole family.
  if (stored.is_revoked) {
    await repo.revokeFamily(stored.family);
    throw new AppError('Session invalid. Please log in again.', 401, 'TOKEN_REUSE_DETECTED');
  }

  if (new Date(stored.expires_at) < new Date()) {
    throw new AppError('Session expired. Please log in again.', 401);
  }

  const user = await repo.findUserById(stored.user_id);
  if (!user || user.status !== 'active') {
    throw new AppError('Account no longer active.', 403);
  }

  // Rotate: revoke the presented token, issue a brand new one in the
  // same family. If this exact old token is ever seen again, the block
  // above will catch it and revoke everything downstream of it.
  await repo.revokeRefreshToken(stored.id);

  const { accessToken, rawRefreshToken: newRawRefreshToken } = await issueTokenPair(user, {
    ip,
    userAgent,
    family: stored.family,
  });

  return { accessToken, rawRefreshToken: newRawRefreshToken };
}

async function logout({ rawRefreshToken }) {
  if (!rawRefreshToken) return;

  const tokenHash = hashToken(rawRefreshToken);
  const stored = await repo.findRefreshTokenByHash(tokenHash);

  if (stored) {
    await repo.revokeFamily(stored.family);
  }
}

async function getCurrentUser(userId) {
  const user = await repo.findUserById(userId);
  if (!user) {
    throw new AppError('User not found.', 404);
  }
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
  REFRESH_TOKEN_MAX_AGE_MS,
};
