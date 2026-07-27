'use strict';

const fs = require('fs');
const path = require('path');

// Load common passwords list at module load time
const COMMON_PASSWORDS_PATH = path.join(
  __dirname,
  '../modules/auth/common-passwords.txt'
);

let _commonPasswords = null;

function getCommonPasswords() {
  if (_commonPasswords) return _commonPasswords;
  try {
    const text = fs.readFileSync(COMMON_PASSWORDS_PATH, 'utf8');
    _commonPasswords = new Set(
      text
        .split('\n')
        .map((p) => p.trim().toLowerCase())
        .filter(Boolean)
    );
  } catch {
    _commonPasswords = new Set();
  }
  return _commonPasswords;
}

const RULES = [
  {
    id: 'MIN_LENGTH',
    test: (p) => p.length >= 12,
    message: 'Password must be at least 12 characters.',
  },
  {
    id: 'UPPERCASE',
    test: (p) => /[A-Z]/.test(p),
    message: 'Password must contain at least one uppercase letter.',
  },
  {
    id: 'LOWERCASE',
    test: (p) => /[a-z]/.test(p),
    message: 'Password must contain at least one lowercase letter.',
  },
  {
    id: 'DIGIT',
    test: (p) => /[0-9]/.test(p),
    message: 'Password must contain at least one digit.',
  },
  {
    id: 'NON_ALPHANUMERIC',
    test: (p) => /[^A-Za-z0-9]/.test(p),
    message: 'Password must contain at least one special character.',
  },
  {
    id: 'NOT_COMMON',
    test: (p) => !getCommonPasswords().has(p.toLowerCase()),
    message: 'Password is too common.',
  },
];

/**
 * Validates a password against all policy rules.
 *
 * @param {string} p - The candidate password.
 * @returns {{ ok: true } | { ok: false, failedRules: Array<{ id: string, message: string }> }}
 */
function validatePassword(p) {
  if (typeof p !== 'string') {
    return {
      ok: false,
      failedRules: RULES.map((r) => ({ id: r.id, message: r.message })),
    };
  }
  const failedRules = RULES.filter((r) => !r.test(p)).map((r) => ({
    id: r.id,
    message: r.message,
  }));
  if (failedRules.length === 0) return { ok: true };
  return { ok: false, failedRules };
}

module.exports = { validatePassword, RULES };
