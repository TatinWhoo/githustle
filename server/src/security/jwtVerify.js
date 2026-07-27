'use strict';

const jwt = require('jsonwebtoken');

/**
 * Pure JWT verifier with rotation grace-window support.
 *
 * @param {string} token
 * @param {{
 *   primary: string,
 *   previous?: string,
 *   previousRotatedAt?: string,
 *   graceMinutes?: number,
 *   iss: string,
 *   aud: string,
 *   now?: () => number
 * }} opts
 * @returns {{ ok: true, claims: object } | { ok: false }}
 */
function verify(token, {
  primary,
  previous,
  previousRotatedAt,
  graceMinutes = 60,
  iss,
  aud,
  now = Date.now,
}) {
  const graceActive =
    previous &&
    previous.length > 0 &&
    previousRotatedAt &&
    (now() - Date.parse(previousRotatedAt)) < graceMinutes * 60_000;

  const secrets = graceActive ? [primary, previous] : [primary];

  for (const secret of secrets) {
    try {
      const claims = jwt.verify(token, secret, {
        algorithms: ['HS256'],
        issuer: iss,
        audience: aud,
      });

      // Req 6.5 / 14.1: reject iat in future
      if (claims.iat * 1000 > now()) return { ok: false };

      // Req 10.8: max token lifetime 15 minutes (900 seconds)
      if (claims.exp - claims.iat > 900) return { ok: false };

      return { ok: true, claims };
    } catch (_e) {
      // try next secret
    }
  }

  return { ok: false };
}

module.exports = { verify };
