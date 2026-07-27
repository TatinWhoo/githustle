'use strict';

const { hasPollutionKey } = require('../security/protoScan');

/**
 * Rejects any request body containing __proto__, constructor, or prototype
 * as an own key at any depth. Must run after express.json body parser.
 * Requirement 8.6
 */
function protoPollutionGuard(req, res, next) {
  if (req.body && hasPollutionKey(req.body)) {
    return res.status(400).json({
      status: 'error',
      code: 'INVALID_REQUEST',
      requestId: req.requestId,
    });
  }
  next();
}

module.exports = protoPollutionGuard;
