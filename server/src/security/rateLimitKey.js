'use strict';

const { clientIp } = require('./ipFromXff');

/**
 * Derives a rate-limit key for a request based on the scheme.
 *
 * Schemes:
 *   'ip'       -> `ip:<clientIp>`
 *   'user'     -> `u:<userId>` if authenticated, else `ip:<clientIp>`
 *   'email'    -> `em:<email>` (lowercased)
 *   'ip+email' -> `ipem:<clientIp>:<email>` (lowercased)
 *
 * @param {object} req                - Express request object
 * @param {'ip'|'user'|'email'|'ip+email'} scheme
 * @param {number} trustedProxyDepth  - Passed to clientIp
 * @returns {string}
 */
function keyFor(req, scheme, trustedProxyDepth) {
  const ip = clientIp(req, trustedProxyDepth);
  const email = ((req.body && req.body.email) || '').toLowerCase();

  switch (scheme) {
    case 'ip':
      return `ip:${ip}`;
    case 'user':
      return req.user ? `u:${req.user.id}` : `ip:${ip}`;
    case 'email':
      return `em:${email}`;
    case 'ip+email':
      return `ipem:${ip}:${email}`;
    default:
      throw new Error(`unknown rate-limit scheme: ${scheme}`);
  }
}

module.exports = { keyFor };
