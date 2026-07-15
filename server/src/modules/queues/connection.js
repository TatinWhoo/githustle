// src/queues/connection.js
// Purpose: Shared ioredis connection for all BullMQ queues and workers.
//
// Why shared? BullMQ creates its own Redis connections internally, but
// sharing a base config ensures all queues use the same Redis instance.
// We export the connection OPTIONS, not a live connection — BullMQ
// handles connection lifecycle internally.
const env = require('../../config/env');

// BullMQ accepts an ioredis-compatible options object.
// Parse the Redis URL into host/port/password.
const redisUrl = new URL(env.REDIS_URL);

const connection = {
    host: redisUrl.hostname,
    port: Number(redisUrl.port) || 6379,
    password: redisUrl.password || undefined,
    maxRetriesPerRequest: null, // Required by BullMQ (disables auto-retry on reads)
};

module.exports = { connection };
