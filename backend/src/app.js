import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import mongoose from 'mongoose';

import config from './config/index.js';
import requestLogger from './middleware/requestLogger.js';
import globalRateLimiter from './middleware/rateLimiter.js';
import notFoundHandler from './middleware/notFound.js';
import globalErrorHandler from './middleware/errorMiddleware.js';
import AppError from './utils/AppError.js';

// Import Domain Module Routers
import authRouter from './modules/auth/routes.js';

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
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
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

/**
 * @route   GET /health
 * @desc    Provides system health and telemetry (database, memory, uptime)
 * @access  Public
 */
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const statusLabels = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const healthInfo = {
    status: dbStatus === 1 ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    database: {
      status: statusLabels[dbStatus] || 'unknown',
      latency: dbStatus === 1 ? 'ok' : 'n/a',
    },
    system: {
      memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
      platform: process.platform,
      nodeVersion: process.version,
    },
  };

  const code = healthInfo.status === 'healthy' ? 200 : 503;
  res.status(code).json(healthInfo);
});

// ==========================================
// 3. Fallbacks and Global Error Pipeline
// ==========================================

// Handle requested paths that do not exist (404 Fallback)
app.all('*', notFoundHandler);

// Register global Express error handling middleware
app.use(globalErrorHandler);

export default app;
