// src/app.js
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const { generalLimiter } = require('./middleware/rateLimiter');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./modules/auth/auth.routes');
const profilesRoutes = require('./modules/profiles/profiles.routes');
const jobsRoutes = require('./modules/jobs/jobs.routes');
const projectsRoutes = require('./modules/projects/projects.routes');
const messagesRoutes = require('./modules/messages/messages.routes');
const { invoiceRouter, timeEntryRouter } = require('./modules/invoices/invoices.routes');
const notificationsRoutes = require('./modules/notifications/notifications.routes');
const aiRoutes = require('./modules/ai/ai.routes');
const adminRoutes = require('./modules/admin.routes');
const disputesRoutes = require('./disputes/disputes.routes');

const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    // Allow cross-origin image loading (avatars, portfolio images)
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(generalLimiter);

// Serve uploaded files (avatars, portfolio images)
app.use(`/${env.UPLOAD_DIR}`, express.static(path.join(process.cwd(), env.UPLOAD_DIR)));

// Health check
app.get('/health', (req, res) => res.json({ ok: true, service: 'githustle-api' }));

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/profiles', profilesRoutes);
app.use('/api/v1/jobs', jobsRoutes);
app.use('/api/v1/projects', projectsRoutes);
app.use('/api/v1/projects', messagesRoutes);
app.use('/api/v1/invoices', invoiceRouter);
app.use('/api/v1/time-entries', timeEntryRouter);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/admin/disputes', disputesRoutes);

// 404 + global error handler (always last)
app.use(notFoundHandler);
app.use(globalErrorHandler);

module.exports = app;
