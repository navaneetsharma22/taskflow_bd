import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import path from 'path';

import config from './config/index.js';
import requestLogger from './middleware/requestLogger.js';
import globalRateLimiter from './middleware/rateLimiter.js';
import notFoundHandler from './middleware/notFound.js';
import globalErrorHandler from './middleware/errorMiddleware.js';
import AppError from './utils/AppError.js';

// Import Domain Module Routers
import authRouter from './modules/auth/routes.js';
import organizationsRouter from './modules/organizations/routes.js';
import usersRouter from './modules/users/routes.js';
import rolesRouter from './modules/rbac/routes.js';
import projectsRouter from './modules/projects/routes.js';
import tasksRouter from './modules/tasks/routes.js';
import milestonesRouter from './modules/milestones/routes.js';
import analyticsRouter from './modules/analytics/routes.js';
import notificationsRouter from './modules/notifications/routes.js';
import messagesRouter from './modules/messages/routes.js';
import auditRouter from './modules/audit/routes.js';
import uploadsRouter from './modules/uploads/routes.js';
import reportsRouter from './modules/reports/routes.js';
import aiRouter from './modules/ai/routes.js';
import queuesRouter from './modules/queues/routes.js';
import healthRouter from './modules/health/routes.js';
import superadminRouter from './modules/superadmin/routes.js';

/**
 * SRC DIRECTORY - EXPRESS APPLICATION INITIALIZER (app.js)
 * Responsibility: Wires all core application structures: sets global middlewares
 * (Helmet, CORS, Compression, Parsers), attaches rate limiters, mounts routes,
 * exposes health check endpoints, and sets the centralized error handling pipeline.
 * Contains NO startup logic, making it portable for integration testing.
 */

const app = express();

// ==========================================
// 1. Core Security & Performance Middlewares
// ==========================================

// Protect HTTP headers against common security vulnerabilities
app.use(helmet());

// Enable Cross-Origin Resource Sharing based on verified environment settings
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server calls)
      if (!origin || config.cors.origins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new AppError('Blocked by CORS configuration.', 403));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-request-id', 'x-organization-id', 'X-Organization-Id'],
  })
);

// Compress HTTP response sizes for optimized performance
app.use(compression());

// Parse incoming HTTP payload structures (Standard JSON and URL-encoded data)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Custom winston-driven logging middleware for API metrics
app.use(requestLogger);

// Limit requesting frequency from individual IPs to block bruteforce/DDoS attempts
app.use('/api', globalRateLimiter);

// ==========================================
// 2. Domain & Application Routes
// ==========================================

// Mount Authentication & Tenant Workspace workflows
app.use('/api/auth', authRouter);

// Mount Super Admin management endpoints (must be before tenant-specific mounters)
app.use('/api/superadmin', superadminRouter);

// Mount Tenant Settings & Customizations workflows
app.use('/api/organizations', organizationsRouter);

// Mount User Profiles & Employee Directory workflows
app.use('/api/users', usersRouter);

// Mount Dynamic Roles, Custom Permissions & Assignment workflows
app.use('/api/roles', rolesRouter);

// Mount Projects Workspaces & Health Scoring workflows
app.use('/api/projects', projectsRouter);

// Mount Tasks, subtasks, comments, and attachments workflows
app.use('/api/tasks', tasksRouter);

// Mount Milestones, target tracking, progress maps, and warning alerts workflows
app.use('/api/milestones', milestonesRouter);

// Mount Analytics business intelligence aggregations and productivity velocity trends
app.use('/api/analytics', analyticsRouter);

// Mount Notifications dispatcher, background queues, and read states tracking
app.use('/api/notifications', notificationsRouter);

// Mount Real-time Messaging direct messages, projects chats, and task discussions workflows
app.use('/api/messages', messagesRouter);

// Mount Security Audit logging compliance monitoring workspaces
app.use('/api/audit', auditRouter);

// Mount Multipart File Upload and image optimization gateway routers
app.use('/api/uploads', uploadsRouter);

// Mount PDF/CSV Executive and Project Reports generation workflows
app.use('/api/reports', reportsRouter);

// Mount Generative AI sprints reviews, deadline risks, workload predictions, and reports text insights
app.use('/api/ai', aiRouter);

// Mount Redis-backed queues and failed jobs administrative consoles
app.use('/api/queues', queuesRouter);

// Mount Public Health Probe diagnostics console (Kubernetes / AWS ALB accessible)
app.use('/api/health', healthRouter);

// Expose public uploads folder for local simulated object storage access
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

// ==========================================
// 3. Fallbacks and Global Error Pipeline
// ==========================================

// Handle requested paths that do not exist (404 Fallback)
app.all('*', notFoundHandler);

// Register global Express error handling middleware
app.use(globalErrorHandler);

export default app;
