/**
 * Pure client-IP deriver from X-Forwarded-For.
 * No Express dependency — safe to unit- and property-test in isolation.
 *
 * @param {object} req                  - Express/Node request object (needs only
 *                                        req.headers['x-forwarded-for'] and
 *                                        req.socket.remoteAddress /
 *                                        req.connection.remoteAddress).
 * @param {number} trustedProxyDepth    - How many rightmost proxies are trusted.
 *                                        0  => ignore XFF entirely, use socket IP.
 *                                        >= 1 => the rightmost N entries are trusted
 *                                                 proxies; client IP is at index
 *                                                 max(0, xff_ips.length - 1 - N).
 * @returns {string} Client IP address.
 *
 * Requirements: 3.7, 7.11
 */
function clientIp(req, trustedProxyDepth) {
  const socketAddr =
    (req.socket && req.socket.remoteAddress) ||
    (req.connection && req.connection.remoteAddress) ||
    '';

  if (trustedProxyDepth === 0) {
    return socketAddr;
  }

  const xffHeader = req.headers && req.headers['x-forwarded-for'];
  if (!xffHeader || xffHeader.trim() === '') {
    return socketAddr;
  }

  const ips = xffHeader.split(',').map(ip => ip.trim()).filter(ip => ip !== '');
  if (ips.length === 0) {
    return socketAddr;
  }

  // The rightmost `trustedProxyDepth` entries are the trusted proxies themselves.
  // The client IP sits one position to the left of those trusted proxies.
  // Index: ips.length - 1 - trustedProxyDepth, clamped to 0 if negative.
  //
  // Example: XFF="1.2.3.4, 10.0.0.1, 172.16.0.1", depth=1
  //   ips = [1.2.3.4, 10.0.0.1, 172.16.0.1], idx = 3-1-1 = 1 → "10.0.0.1" ✓
  //
  // Example: XFF="1.2.3.4, 10.0.0.1", depth=2
  //   ips = [1.2.3.4, 10.0.0.1], idx = max(0, 2-1-2) = 0 → "1.2.3.4" ✓
  const idx = Math.max(0, ips.length - 1 - trustedProxyDepth);
  return ips[idx];
}

module.exports = { clientIp };
