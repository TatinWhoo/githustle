// src/app.js
const express = require('express');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const correlationId = require('./middleware/correlationId');
const securityHeaders = require('./middleware/securityHeaders');
const corsAllowlist = require('./middleware/corsAllowlist');
const staticUploads = require('./middleware/staticUploads');
const { generalLimiter, perRequestLimiter, initRateLimiters } = require('./middleware/rateLimiter');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');
const { mountAll } = require('./utils/appMount');
const authRoutes = require('./modules/auth/auth.routes');
const profilesRoutes = require('./modules/profiles/profiles.routes');
const jobsRoutes = require('./modules/jobs/jobs.routes');
const projectsRoutes = require('./modules/projects/projects.routes');
const messagesRoutes = require('./modules/messages/messages.routes');
const { invoiceRouter, timeEntryRouter } = require('./modules/invoices/invoices.routes');
const notificationsRoutes = require('./modules/notifications/notifications.routes');
const aiRoutes = require('./modules/ai/ai.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const disputesRoutes = require('./modules/disputes/disputes.routes');
const logsRoutes = require('./modules/logs/logs.routes');

const app = express();

app.set('trust proxy', env.TRUSTED_PROXY_DEPTH);

app.use(correlationId);
app.use(securityHeaders);
app.use(corsAllowlist);
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
// TODO task 7.1: wire protoPollutionGuard here
app.use(generalLimiter);
app.use(perRequestLimiter);

// Serve uploaded files (avatars, portfolio images)
app.use('/uploads', staticUploads);

// Health check — not an API route, kept outside mountAll
app.get('/health', (req, res) => res.json({ ok: true, service: 'githustle-api' }));

// API routes
// messagesRoutes duplicates '/api/v1/projects' — mountAll will log a warning and
// mount it at '/api/v1/projects-messages' (its routes are /:projectId/messages/*)
mountAll(app, [
  { path: '/api/v1/auth',           router: authRoutes,          moduleName: 'auth' },
  { path: '/api/v1/profiles',       router: profilesRoutes,      moduleName: 'profiles' },
  { path: '/api/v1/jobs',           router: jobsRoutes,          moduleName: 'jobs' },
  { path: '/api/v1/projects',       router: projectsRoutes,      moduleName: 'projects' },
  { path: '/api/v1/projects',       router: messagesRoutes,      moduleName: 'messages' },
  { path: '/api/v1/invoices',       router: invoiceRouter,       moduleName: 'invoices' },
  { path: '/api/v1/time-entries',   router: timeEntryRouter,     moduleName: 'time-entries' },
  { path: '/api/v1/notifications',  router: notificationsRoutes, moduleName: 'notifications' },
  { path: '/api/v1/ai',             router: aiRoutes,            moduleName: 'ai' },
  { path: '/api/v1/admin',          router: adminRoutes,         moduleName: 'admin' },
  { path: '/api/v1/disputes',       router: disputesRoutes,      moduleName: 'disputes' },
  { path: '/api/v1/logs',           router: logsRoutes,          moduleName: 'logs' },
]);

// 404 + global error handler (always last)
app.use(notFoundHandler);
app.use(globalErrorHandler);

module.exports = app;
