/**
 * ClerkProvider — deferred stub for Clerk SDK integration.
 *
 * Every method throws NotImplemented until the real Clerk SDK is wired in.
 * Registered at application boot regardless of the AUTH_PROVIDER env value
 * so that misconfiguration surfaces early rather than silently falling through.
 *
 * Replace this file with the real implementation once the Clerk SDK is installed
 * and the required environment variables (CLERK_SECRET_KEY, etc.) are available.
 */

'use strict';

const NOT_IMPLEMENTED_MESSAGE = 'Clerk provider is not yet implemented.';
const NOT_IMPLEMENTED_CODE = 'NOT_IMPLEMENTED';

function notImplemented() {
  const err = new Error(NOT_IMPLEMENTED_MESSAGE);
  err.code = NOT_IMPLEMENTED_CODE;
  return Promise.reject(err);
}

class ClerkProvider {
  /**
   * @param {string} token - Raw Bearer access token from the request.
   * @returns {Promise<import('../authProvider').VerifiedToken>}
   */
  verifyAccessToken(/* token */) {
    return notImplemented();
  }

  /**
   * @param {string} userId
   * @returns {Promise<import('../authProvider').SafeUser>}
   */
  getCurrentUser(/* userId */) {
    return notImplemented();
  }

  /**
   * @param {string} sessionId
   * @returns {Promise<void>}
   */
  signOut(/* sessionId */) {
    return notImplemented();
  }

  /**
   * @param {object} user
   * @param {object} ctx - Request context (ip, userAgent, etc.).
   * @returns {Promise<import('../authProvider').IssuedTokens>}
   */
  mintTokensForUser(/* user, ctx */) {
    return notImplemented();
  }
}

module.exports = new ClerkProvider();
