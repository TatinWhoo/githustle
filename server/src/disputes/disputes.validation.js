const { z } = require('zod');

const disputeIdParamSchema = z.object({
    disputeId: z.string().uuid(),
});

const listDisputesQuerySchema = z.object({
    status: z.enum(['open', 'under_review', 'resolved', 'escalated', 'closed']).optional(),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
});

const resolveDisputeSchema = z.object({
    resolution: z.string().trim().min(10).max(2000),
});

const disputeMessageSchema = z.object({
    content: z.string().trim().min(1).max(2000),
});

module.exports = {
    disputeIdParamSchema, listDisputesQuerySchema,
    resolveDisputeSchema, disputeMessageSchema,
};
