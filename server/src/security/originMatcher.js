/**
 * Pure origin-allowlist matcher.
 * No Express dependency — safe to unit- and property-test in isolation.
 *
 * @param {string|undefined|null} origin  - Value of the `Origin` request header.
 * @param {string[]} allowlist            - Configured allowed origins.
 * @param {{ devLocalhost?: boolean }} [opts]
 *   - devLocalhost: when true, `http://localhost:*` in the allowlist acts as a
 *     wildcard matching any `http://localhost:<port>` origin.
 * @returns {boolean}
 */
function matches(origin, allowlist, { devLocalhost = false } = {}) {
  if (!origin) return false;
  if (allowlist.includes(origin)) return true;
  if (devLocalhost) {
    const m = origin.match(/^http:\/\/localhost:(\d+)$/);
    if (m && allowlist.some(e => e === 'http://localhost:*')) return true;
  }
  return false;
}

module.exports = { matches };
