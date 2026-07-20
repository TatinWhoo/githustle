// src/modules/ai/ai.controller.js
const asyncHandler = require('../../middleware/asyncHandler');
const service = require('./ai.service');

// ─────────────────────────────────────────────────────────────────────────────
// SSE STREAMING — Proposal Generator
// ─────────────────────────────────────────────────────────────────────────────
//
// How SSE works here:
//   1. Set response headers for SSE (text/event-stream, no caching)
//   2. Get the Anthropic stream from the service
//   3. Listen for 'text' events and write each chunk as an SSE data line
//   4. On 'end', send a [DONE] event and close the connection
//   5. On client disconnect (req.on('close')), abort the stream
//
// Why SSE instead of WebSocket?
//   SSE is simpler for unidirectional server→client streaming.
//   The client uses EventSource or fetch() with ReadableStream.
//   No socket upgrade handshake, works through all proxies/CDNs.
// ─────────────────────────────────────────────────────────────────────────────

const generateProposal = asyncHandler(async (req, res) => {
    // Set SSE headers BEFORE starting to stream
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable NGINX buffering for SSE
    });

    const stream = await service.generateProposal(req.user.id, req.body);

    // Pipe Claude's text chunks to the client as SSE events
    stream.on('text', (text) => {
        // SSE format: "data: <payload>\n\n"
        // Each chunk is a partial token from Claude's response.
        res.write(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`);
    });

    stream.on('end', () => {
        // Signal completion so the client knows to close the EventSource
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        res.end();
    });

    stream.on('error', (err) => {
        console.error('[ai] Stream error:', err.message);
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'AI generation failed. Please try again.' })}\n\n`);
        res.end();
    });

    // If the client disconnects mid-stream, abort the Claude request
    // to avoid wasting API tokens on a response nobody will read.
    req.on('close', () => {
        stream.controller?.abort();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// NON-STREAMING — Contract Analyzer + Follow-Up Email
// ─────────────────────────────────────────────────────────────────────────────

const analyzeContract = asyncHandler(async (req, res) => {
    const result = await service.analyzeContract(req.user.id, req.body.contractText);
    res.status(200).json({ status: 'success', data: { analysis: result } });
});

const draftFollowUp = asyncHandler(async (req, res) => {
    const result = await service.draftFollowUp(req.user.id, req.body);
    res.status(200).json({ status: 'success', data: result });
});

module.exports = { generateProposal, analyzeContract, draftFollowUp };
