/**
 * securityHeaders.js
 * Express middleware that sets explicit security headers on every response.
 */

/**
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function securityHeaders(req, res, next) {
  // Prevent MIME-type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Disallow framing entirely
  res.setHeader('X-Frame-Options', 'DENY');

  // Limit referrer information to origin only on cross-origin requests
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Disable browser features not needed by this API
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );

  // Prevent window.opener access across origins
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

  // Restrict cross-origin resource sharing at the response level
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');

  // Restrictive CSP — set unconditionally; static-file middleware may override if needed
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
  );

  // Remove server-identity leak header
  res.removeHeader('X-Powered-By');

  next();
}

module.exports = securityHeaders;
