'use strict';

const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Returns true iff `value` contains at least one own key named
 * `__proto__`, `constructor`, or `prototype` at any depth.
 *
 * Uses `Object.keys()` (own enumerable keys only, not inherited).
 * JSON-parsed request bodies cannot be circular, but a WeakSet guard
 * is included for safety so the function never hangs on hand-crafted objects.
 *
 * @param {unknown} value
 * @param {WeakSet} [_seen]
 * @returns {boolean}
 */
function hasPollutionKey(value, _seen = new WeakSet()) {
  if (value === null || typeof value !== 'object') return false;
  if (_seen.has(value)) return false;
  _seen.add(value);
  if (Array.isArray(value)) {
    return value.some(item => hasPollutionKey(item, _seen));
  }
  for (const key of Object.keys(value)) {
    if (FORBIDDEN.has(key)) return true;
    if (hasPollutionKey(value[key], _seen)) return true;
  }
  return false;
}

module.exports = { hasPollutionKey };
