'use strict';

/**
 * Local JWT AuthProvider — implements the AuthProvider interface for local
 * (email/password) authentication backed by HS256 JWTs and rotating secrets.
 *
 * Cookie attributes the CALLER (auth controller/route) MUST apply when writing
 * the refresh token to the client:
 *   HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth
 * This provider returns raw token values only — it does NOT set cookies.
 */

const env = require('../../../config/env');
const AppError = require('../../../utils/AppError');
const jwtVerify = require('../../../security/jwtVerify');
const authService = require('../auth.service');

/**
 * Verify an access token using the hardened jwtVerify module (alg=HS256,
 * iss/aud checks, iat-in-future guard, max-lifetime 900 s, rotation grace).
 *
 * @param {string} token
 * @returns {Promise<{ userId: string, role: string, sessionId: string|undefined, exp: number }>}
 * @throws {AppError} 401 if token is missing, malformed, or verification fails
 */
async function verifyAccessToken(token) {
  if (!token) {
    throw new AppError('Authentication required.', 401);
  }

  const result = jwtVerify.verify(token, {
    primary: env.JWT_ACCESS_SECRET,
    previous: env.JWT_PREVIOUS_ACCESS_SECRET,
    previousRotatedAt: env.JWT_PREVIOUS_SECRET_ROTATED_AT,
    graceMinutes: env.JWT_PREVIOUS_SECRET_GRACE_MINUTES,
    iss: env.JWT_ISSUER,
    aud: env.JWT_AUDIENCE,
  });

  if (!result.ok) {
    throw new AppError('Authentication required.', 401);
  }

  const { claims } = result;
  return {
    userId: claims.sub,
    role: claims.role,
    sessionId: claims.sid ?? undefined,
    exp: claims.exp,
  };
}

/**
 * Retrieve a sanitised user object by id.
 *
 * @param {string} userId
 * @returns {Promise<SafeUser>}
 */
async function getCurrentUser(userId) {
  return authService.getCurrentUser(userId);
}

/**
 * Revoke the session associated with the given raw refresh token.
 * The sessionId parameter carries the raw refresh token value (from the
 * HttpOnly cookie) — the service hashes it and revokes the entire token family.
 *
 * @param {string} sessionId - raw refresh token string
 * @returns {Promise<void>}
 */
async function signOut(sessionId) {
  await authService.logout({ rawRefreshToken: sessionId });
}

/**
 * Issue a fresh access/refresh token pair for an authenticated user.
 *
 * Refresh token cookie attributes the caller MUST set:
 *   HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth
 *
 * @param {{ id: string, role: string }} user
 * @param {{ ip?: string, userAgent?: string }} opts
 * @returns {Promise<{
 *   accessToken: string,
 *   refreshToken: string,
 *   accessExpiresAt: number,
 *   refreshExpiresAt: number,
 *   tokenFamilyId: string
 * }>}
 */
async function mintTokensForUser(user, { ip, userAgent } = {}) {
  const { accessToken, rawRefreshToken, tokenFamilyId } = await authService.issueTokenPair(user, {
    ip,
    userAgent,
    family: undefined, // new family on each fresh mint
  });

  const accessExpiresAt = Date.now() + 15 * 60 * 1000;
  const refreshExpiresAt =
    Date.now() + env.REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000;

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    accessExpiresAt,
    refreshExpiresAt,
    tokenFamilyId,
  };
}

module.exports = {
  verifyAccessToken,
  getCurrentUser,
  signOut,
  mintTokensForUser,
};
