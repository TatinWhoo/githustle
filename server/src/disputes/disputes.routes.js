const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const auditLog = require('../middleware/auditLog');
const controller = require('./disputes.controller');
const {
    disputeIdParamSchema, listDisputesQuerySchema,
    resolveDisputeSchema, disputeMessageSchema,
} = require('./disputes.validation');

const router = express.Router();

// All dispute admin routes require admin role
router.use(authenticate, requireRole('admin'));

router.get('/',
    validate(listDisputesQuerySchema, 'query'),
    controller.listDisputes);

router.get('/:disputeId',
    validate(disputeIdParamSchema, 'params'),
    controller.getDispute);

router.patch('/:disputeId/assign',
    validate(disputeIdParamSchema, 'params'),
    auditLog('dispute.assign', 'dispute', (req) => req.params.disputeId),
    controller.assignToAdmin);

router.patch('/:disputeId/resolve',
    validate(disputeIdParamSchema, 'params'),
    validate(resolveDisputeSchema),
    auditLog('dispute.resolve', 'dispute', (req) => req.params.disputeId),
    controller.resolveDispute);

router.get('/:disputeId/messages',
    validate(disputeIdParamSchema, 'params'),
    controller.getMessages);

router.post('/:disputeId/messages',
    validate(disputeIdParamSchema, 'params'),
    validate(disputeMessageSchema),
    controller.addMessage);

module.exports = router;
