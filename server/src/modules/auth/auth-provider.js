'use strict';

/**
 * Auth Provider Abstraction Layer
 *
 * Isolates identity operations behind a stable contract so swapping
 * LocalJwtProvider → ClerkProvider touches one adapter only.
 *
 * Requirements: 17.1, 17.4, 17.5
 */

/**
 * @typedef {Object} SafeUser
 * @property {string} id
 * @property {string} email
 * @property {'freelancer'|'client'|'admin'} role
 * @property {boolean} emailVerified
 * @property {boolean} active
 */

/**
 * @typedef {Object} VerifiedToken
 * @property {string} userId
 * @property {string} role
 * @property {string} sessionId
 * @property {number} exp
 */

/**
 * @typedef {Object} IssuedTokens
 * @property {string} accessToken
 * @property {string} refreshToken       - opaque, plain, sent to browser as cookie only
 * @property {Date}   accessExpiresAt
 * @property {Date}   refreshExpiresAt
 * @property {string} tokenFamilyId
 */

/**
 * @typedef {Object} AuthProvider
 * @property {(token: string) => Promise<VerifiedToken>}                                       verifyAccessToken
 * @property {(userId: string) => Promise<SafeUser>}                                           getCurrentUser
 * @property {(sessionId: string) => Promise<void>}                                            signOut
 * @property {(user: SafeUser, ctx: {ip:string, userAgent:string}) => Promise<IssuedTokens>}   mintTokensForUser
 */

/**
 * Provider registry.
 * Populated at boot by calling `register(name, provider)` for every known adapter.
 *
 * @type {Map<string, AuthProvider>}
 */
const registry = new Map();

/**
 * The active provider selected by `AUTH_PROVIDER`.
 * Set by `select(name)` at boot — before the HTTP listener opens.
 *
 * @type {AuthProvider|null}
 */
let active = null;

/**
 * Register a named adapter.
 * Called at boot for every known adapter regardless of AUTH_PROVIDER,
 * so that all implementations are import-verified in the same process. (Req 17.5)
 *
 * @param {string}       name     - e.g. 'local' | 'clerk'
 * @param {AuthProvider} provider - concrete adapter instance
 */
function register(name, provider) {
  registry.set(name, provider);
}

/**
 * Select the active provider by name.
 * Throws synchronously if `name` is not in the registry so the process
 * crashes before the HTTP listener opens. (Req 17.4)
 *
 * @param {string} name - must match a previously registered adapter
 * @throws {Error} if name is not registered
 */
function select(name) {
  if (!registry.has(name)) {
    const known = [...registry.keys()].join(', ') || '(none registered)';
    throw new Error(
      `AUTH_PROVIDER="${name}" is not a registered auth adapter. ` +
      `Known providers: ${known}. ` +
      `Check your AUTH_PROVIDER environment variable and ensure every adapter is registered before select() is called.`
    );
  }
  active = registry.get(name);
}

module.exports = {
  registry,
  get active() { return active; },
  register,
  select,
};
