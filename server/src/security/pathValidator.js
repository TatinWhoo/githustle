'use strict';

const SAFE_SUBDIRS = new Set(['avatars', 'portfolio']);

/**
 * Returns true iff `s` is one of the whitelisted literal subdir names.
 * Rejects anything containing '..', '/', '\', null bytes, or any value
 * not in the compile-time SAFE_SUBDIRS set.
 *
 * @param {string} s
 * @returns {boolean}
 *
 * Requirements: 9.6
 */
function isSafeSubdir(s) {
  if (typeof s !== 'string') return false;
  if (s.includes('..')) return false;
  if (s.includes('/')) return false;
  if (s.includes('\\')) return false;
  if (s.includes('\0')) return false;
  return SAFE_SUBDIRS.has(s);
}

module.exports = { isSafeSubdir, SAFE_SUBDIRS };
