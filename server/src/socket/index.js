// src/socket/index.js
// Purpose: All Socket.io logic in one place.
//   - Creates the io Server instance attached to the HTTP server
//   - Authenticates the socket handshake using the same JWT as REST routes
//   - Manages per-project rooms
//   - Handles all real-time events: send_message, typing, mark_read
//   - Optionally connects the Redis adapter for multi-instance pub/sub
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const Redis = require('ioredis');
const { verifyAccessToken } = require('../utils/jwt');
const env = require('../config/env');
const messagesService = require('../modules/messages/messages.service');
const projectsRepo = require('../modules/projects/projects.repository');

// ─────────────────────────────────────────────────────────────────────────────
// SOCKET ROOM NAMING CONVENTION
// Purpose: Consistent string key so all event emissions target the right room.
// Format: "project:<uuid>"
// Example: "project:550e8400-e29b-41d4-a716-446655440000"
// ─────────────────────────────────────────────────────────────────────────────

function projectRoom(projectId) {
    return `project:${projectId}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// INITIALIZE: called once from server.js with the http.Server instance
// ─────────────────────────────────────────────────────────────────────────────

// Module-level reference to the io instance.
// Set by initSocket() so that getIo() can be called from any module
// (e.g., notifications.service) without circular imports.
let _io = null;

async function initSocket(httpServer) {
    // ── Create the Socket.io server ──────────────────────────────────────────
    // cors: must match CLIENT_URL so the browser WebSocket upgrade isn't blocked.
    // transports: prefer websocket, fall back to polling (useful behind some proxies).
    const io = new Server(httpServer, {
        cors: {
            origin: env.CLIENT_URL,
            credentials: true,
        },
        transports: ['websocket', 'polling'],
    });

    // ── Redis adapter (optional — skip if REDIS_URL is not set) ──────────────
    // Why Redis adapter?
    //   Without it, socket.io rooms are in-process only. If you run 2+ Node
    //   instances behind a load balancer, a user on instance A can't receive
    //   messages from a user on instance B. The Redis adapter uses Redis pub/sub
    //   to broadcast events across all instances.
    //
    // ioredis usage notes:
    //   - `new Redis(url)` auto-connects on construction (no .connect() call needed).
    //   - `.duplicate()` creates a second connection with the same config.
    //   - Error handlers MUST be attached immediately to prevent Node from crashing
    //     on unhandled 'error' events when Redis is unreachable.
    if (env.REDIS_URL) {
        try {
            const pubClient = new Redis(env.REDIS_URL, { lazyConnect: true });
            const subClient = pubClient.duplicate();

            // Prevent unhandled error crashes when Redis is down
            pubClient.on('error', (err) => console.warn('Redis pub error:', err.message));
            subClient.on('error', (err) => console.warn('Redis sub error:', err.message));

            // lazyConnect: true means we must call .connect() manually,
            // which lets us properly await and catch connection failures.
            await Promise.all([pubClient.connect(), subClient.connect()]);
            io.adapter(createAdapter(pubClient, subClient));
            console.log('✅ Socket.io Redis adapter connected');
        } catch (err) {
            // Don't crash the server if Redis is unavailable in development
            console.warn('⚠️  Socket.io Redis adapter failed, running without it:', err.message);
        }
    }

    // ── Authentication middleware ─────────────────────────────────────────────
    // Purpose: Verify the JWT on every socket connection BEFORE the handshake
    // completes. If the token is missing or expired, the connection is refused
    // with an authentication error — the socket never opens.
    //
    // Token delivery: the React client sends the access token via:
    //   socket = io(SERVER_URL, { auth: { token: accessToken } })
    // We read it from socket.handshake.auth.token.
    //
    // Why not cookies? Socket.io's websocket transport doesn't send httpOnly
    // cookies on all browsers. The auth object is the standard approach.
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }
        try {
            // verifyAccessToken throws if expired or invalid
            const payload = verifyAccessToken(token);
            // Attach user info to the socket object — available in all event handlers
            socket.user = { id: payload.sub, role: payload.role };
            next();
        } catch (err) {
            next(new Error('Authentication error: Invalid or expired token'));
        }
    });

    // ── Connection handler ────────────────────────────────────────────────────
    io.on('connection', (socket) => {
        const userId = socket.user.id;
        console.log(`Socket connected: userId=${userId} socketId=${socket.id}`);

        // Join a personal room keyed by user ID.
        // This lets notifications.service push directly to one user
        // without broadcasting or iterating socket IDs.
        socket.join(`user:${userId}`);

        // ── join_project ────────────────────────────────────────────────────────
        // Event: client emits when navigating to a project chat page.
        // Server validates membership, then adds the socket to the room.
        // Only project members (client + freelancer) can join — no outsiders.
        //
        // Why validate again here and not just trust the JWT?
        //   The JWT proves identity, not project membership. A logged-in user
        //   could manually emit join_project with someone else's projectId.
        socket.on('join_project', async ({ projectId }) => {
            try {
                if (!projectId) throw new Error('projectId required');
                const project = await projectsRepo.findProjectById(projectId);
                if (!project) throw new Error('Project not found');
                if (project.client_id !== userId && project.freelancer_id !== userId) {
                    throw new Error('Not a project member');
                }

                socket.join(projectRoom(projectId));
                // Track which rooms this socket is in (useful for cleanup on disconnect)
                socket.currentProjectId = projectId;

                socket.emit('joined_project', { projectId });
            } catch (err) {
                socket.emit('error', { message: err.message });
            }
        });

        // ── send_message ────────────────────────────────────────────────────────
        // Event: freelancer or client sends a message.
        // Server saves to DB, then broadcasts to the full project room
        // (including the sender — so all tabs/devices of the sender see it too).
        //
        // Why save to DB before emitting?
        //   If we emit first and the DB write fails, one side sees a message
        //   that doesn't exist. DB-first guarantees consistency.
        socket.on('send_message', async (data) => {
            try {
                // data: { projectId, content, msgType?, replyToId?, fileUrl?, fileName?,
                //          fileSizeBytes?, mimeType? }
                const message = await messagesService.sendMessage(userId, data.projectId, data);

                // Emit to ALL sockets in the room (including the sender's other devices)
                io.to(projectRoom(data.projectId)).emit('new_message', message);
            } catch (err) {
                // Send error only back to this socket (not the whole room)
                socket.emit('message_error', { message: err.message });
            }
        });

        // ── typing_start / typing_stop ──────────────────────────────────────────
        // Purpose: Real-time "User is typing..." indicator.
        // We relay the event to the room but exclude the sender's own socket
        // (you don't want to see "You are typing" in your own UI).
        //
        // socket.to(room) = broadcast to room EXCLUDING this socket
        // io.to(room)     = broadcast to room INCLUDING this socket
        socket.on('typing_start', ({ projectId }) => {
            socket.to(projectRoom(projectId)).emit('user_typing', {
                userId,
                projectId,
            });
        });

        socket.on('typing_stop', ({ projectId }) => {
            socket.to(projectRoom(projectId)).emit('user_stopped_typing', {
                userId,
                projectId,
            });
        });

        // ── mark_read ───────────────────────────────────────────────────────────
        // Purpose: When a user opens the chat, mark all unread messages as read.
        // Emits 'messages_read' to the OTHER party so they can update their
        // "Delivered / Seen" status icons.
        socket.on('mark_read', async ({ projectId }) => {
            try {
                const markedIds = await messagesService.markRead(userId, projectId);
                if (markedIds.length > 0) {
                    // Tell the other party that this user has read their messages
                    socket.to(projectRoom(projectId)).emit('messages_read', {
                        userId,
                        projectId,
                        messageIds: markedIds, // frontend uses these to flip read indicators
                    });
                }
            } catch (err) {
                socket.emit('error', { message: err.message });
            }
        });

        // ── disconnect ──────────────────────────────────────────────────────────
        // Purpose: Clean up typing indicator if the user disconnects mid-type.
        // Socket.io auto-removes the socket from all rooms on disconnect —
        // we just need to notify the other party to clear the typing indicator.
        socket.on('disconnect', () => {
            if (socket.currentProjectId) {
                socket.to(projectRoom(socket.currentProjectId)).emit('user_stopped_typing', {
                    userId,
                    projectId: socket.currentProjectId,
                });
            }
            console.log(`Socket disconnected: userId=${userId} socketId=${socket.id}`);
        });
    });

    _io = io; // store for getIo()
    return io; // return so server.js can use it if needed
}

// Purpose: Returns the active io instance.
// Called from notifications.service.js to emit real-time pushes.
// Returns null if initSocket() hasn't run yet (e.g., test environments).
function getIo() {
    return _io;
}

module.exports = { initSocket, getIo };
