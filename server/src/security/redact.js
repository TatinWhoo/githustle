'use strict';

/**
 * Sensitive keys to redact — case-insensitive comparison is applied at runtime.
 * This list drives both the runtime `redact()` function and the pino REDACT_PATHS
 * export used by the logger.
 */
const SENSITIVE_KEYS = [
  'password',
  'password_hash',
  'token',
  'refreshToken',
  'accessToken',
  'verifyToken',
  'apiKey',
  'secret',
  'authorization',
  'cookie',
];

/**
 * Lower-cased set for O(1) case-insensitive look-up.
 * @type {Set<string>}
 */
const SENSITIVE_LOWER = new Set(SENSITIVE_KEYS.map((k) => k.toLowerCase()));

const REDACTED = '[REDACTED]';

/**
 * Deep, idempotent redaction.
 *
 * Rules:
 *   - Primitives (string, number, boolean, null, undefined) → returned as-is.
 *   - Arrays → each element recursed; non-sensitive array items are byte-preserved.
 *   - Plain objects → each key recursed; value at a sensitive key is replaced with
 *     `[REDACTED]` regardless of its original type. Already-redacted values are
 *     left as-is (idempotency).
 *   - Non-plain objects (Date, RegExp, Buffer, class instances) → returned as-is;
 *     their internals are not traversed because they carry no enumerable own key
 *     named after a sensitive field in practice, and mutating them would change
 *     their identity.
 *
 * The function is pure — it creates a new object/array rather than mutating the
 * input, so the caller's original data is unchanged.
 *
 * @param {unknown} obj - Value to redact.
 * @param {string[]} [sensitiveKeys=SENSITIVE_KEYS] - Keys whose values should be
 *   replaced. Comparison is case-insensitive. Defaults to the built-in list.
 * @returns {unknown} Redacted copy (primitives returned directly).
 */
function redact(obj, sensitiveKeys = SENSITIVE_KEYS) {
  // Build a lower-cased lookup set from the supplied key list.
  // When called with the default list we reuse the module-level set to avoid
  // re-allocating on every call in the hot path.
  const lowerKeys =
    sensitiveKeys === SENSITIVE_KEYS
      ? SENSITIVE_LOWER
      : new Set(sensitiveKeys.map((k) => k.toLowerCase()));

  return _redact(obj, lowerKeys);
}

/**
 * Internal recursive worker.
 * @param {unknown} value
 * @param {Set<string>} lowerKeys
 * @returns {unknown}
 */
function _redact(value, lowerKeys) {
  // Primitives — return as-is (handles undefined, null, number, boolean, string,
  // bigint, symbol).
  if (value === null || typeof value !== 'object') {
    return value;
  }

  // Arrays — recurse each element without key-sensitivity.
  if (Array.isArray(value)) {
    return value.map((el) => _redact(el, lowerKeys));
  }

  // Plain objects only — skip exotic objects (Date, Buffer, RegExp, Map, Set …).
  if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
    return value;
  }

  const result = {};
  for (const key of Object.keys(value)) {
    if (lowerKeys.has(key.toLowerCase())) {
      // Already redacted → keep sentinel to preserve idempotency without
      // wrapping `[REDACTED]` inside `[REDACTED]`.
      result[key] = REDACTED;
    } else {
      result[key] = _redact(value[key], lowerKeys);
    }
  }
  return result;
}

/**
 * Flat array of dot-notation pino redact paths.
 *
 * pino's `redact` option accepts an array of paths in the form:
 *   'password'           — top-level key
 *   '*.password'         — key at any single level of nesting
 *   'req.body.password'  — specific nested path
 *
 * We generate three path variants per sensitive key so that pino catches
 * the value wherever it appears in a typical log object:
 *   1. Top-level: `password`
 *   2. One level deep wildcard: `*.password`
 *   3. `req.body.<key>` — the most common Express request body location
 *   4. `req.headers.<key>` — for authorization / cookie
 *   5. `body.<key>` — common pattern when the body is logged directly
 *
 * @type {string[]}
 */
const REDACT_PATHS = SENSITIVE_KEYS.flatMap((key) => [
  key,
  `*.${key}`,
  `*.*.${key}`,
  `req.body.${key}`,
  `req.headers.${key}`,
  `body.${key}`,
]);

module.exports = { redact, REDACT_PATHS, SENSITIVE_KEYS };
