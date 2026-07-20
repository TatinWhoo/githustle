const asyncHandler = require('../middleware/asyncHandler');
const service = require('./disputes.service');

const listDisputes = asyncHandler(async (req, res) => {
    const result = await service.listDisputes(req.query);
    res.status(200).json({ status: 'success', data: result });
});

const getDispute = asyncHandler(async (req, res) => {
    const dispute = await service.getDispute(req.params.disputeId);
    res.status(200).json({ status: 'success', data: { dispute } });
});

const assignToAdmin = asyncHandler(async (req, res) => {
    const dispute = await service.assignToAdmin(req.user.id, req.params.disputeId);
    res.status(200).json({ status: 'success', data: { dispute } });
});

const resolveDispute = asyncHandler(async (req, res) => {
    const dispute = await service.resolveDispute(req.user.id, req.params.disputeId, req.body.resolution);
    res.status(200).json({ status: 'success', data: { dispute } });
});

const getMessages = asyncHandler(async (req, res) => {
    const messages = await service.getMessages(req.params.disputeId);
    res.status(200).json({ status: 'success', data: { messages } });
});

const addMessage = asyncHandler(async (req, res) => {
    const message = await service.addAdminMessage(req.user.id, req.params.disputeId, req.body.content);
    res.status(201).json({ status: 'success', data: { message } });
});

module.exports = { listDisputes, getDispute, assignToAdmin, resolveDispute, getMessages, addMessage };
