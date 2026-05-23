import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { User } from '../modules/auth/model.js';
import logger from '../utils/logger.js';

/**
 * SOCKETS INFRASTRUCTURE - REAL-TIME WORKSPACES (index.js)
 * Responsibility: Outlines standard real-time socket connections, including:
 *   1. Socket Authentication: Handshake JWT token evaluations.
 *   2. Tenant Isolation: Multi-tenant partitioning using scoped rooms.
 *   3. Connection Tracking: In-memory live socket indexing mapping user sessions.
 *   4. Decoupled real-time emit triggers (emitToTenant, emitToUser).
 */

let io = null;

// Connection tracker: Maps UserId (String) -> Set of active socket IDs (Strings)
const activeConnections = new Map();

/**
 * Initializer function attaching socket.io to Node HTTP server
 */
export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*', // Dynamic configurations supported
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000, // safety timeouts
  });

  // ==========================================
  // 1. Socket Authentication Middleware
  // ==========================================
  io.use(async (socket, next) => {
    try {
      // Resolve token from auth handshake or query headers
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
      if (!token) {
        return next(new Error('Authentication failed. Token not provided.'));
      }

      // Remove "Bearer " prefix if present
      const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;

      // Validate JWT signature
      const decoded = jwt.verify(cleanToken, config.jwt.secret);
      
      // Load User to secure active status and organization boundaries
      const user = await User.findById(decoded.id).select('+organizationId');
      if (!user) {
        return next(new Error('User account not found.'));
      }

      if (user.status === 'SUSPENDED') {
        return next(new Error('User account has been suspended.'));
      }

      // Bind security details directly to socket session
      socket.user = {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      };
      socket.organizationId = user.organizationId.toString();

      next();
    } catch (err) {
      logger.error(`Socket Auth: Handshake failed. Error: ${err.message}`);
      return next(new Error('Authentication failed. Invalid token.'));
    }
  });

  // ==========================================
  // 2. Real-time Connection Lifecycle
  // ==========================================
  io.on('connection', (socket) => {
    const userId = socket.user._id;
    const orgId = socket.organizationId;

    // A. Multi-tenant Room Join
    socket.join(`tenant:${orgId}`);
    // B. User Room Join
    socket.join(`user:${userId}`);

    // C. Connection Tracking
    if (!activeConnections.has(userId)) {
      activeConnections.set(userId, new Set());
    }
    activeConnections.get(userId).add(socket.id);

    logger.info(`Socket Connected: User [${socket.user.name}] joined Tenant Room: [tenant:${orgId}] (Active Sockets: ${activeConnections.get(userId).size})`);

    // D. Echo / Ping tests supporting real-time diagnostics
    socket.on('diagnostics:ping', (data) => {
      socket.emit('diagnostics:pong', { timestamp: new Date(), ...data });
    });

    // E. Connection Cleanups on Disconnect
    socket.on('disconnect', () => {
      const userSockets = activeConnections.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          activeConnections.delete(userId);
        }
      }
      logger.warn(`Socket Disconnected: User [${socket.user.name}] departed. (Active tracks remaining: ${userSockets ? userSockets.size : 0})`);
    });
  });

  logger.info('⚡ [TaskFlow Sockets]: WebSockets server successfully initialized.');
  return io;
};

// ==========================================
// 3. Isolated Emitters Utility Functions
// ==========================================

/**
 * Emits dynamic event securely within tenant boundaries
 */
export const emitToTenant = (organizationId, eventName, payload) => {
  if (!io) {
    logger.warn('Socket Emitter: Cannot emit to tenant. Socket server is not initialized yet.');
    return;
  }
  const orgStr = organizationId.toString();
  io.to(`tenant:${orgStr}`).emit(eventName, payload);
  logger.debug(`Socket Emit: Broadcasted [${eventName}] to [tenant:${orgStr}]`);
};

/**
 * Emits dynamic event directly to specific User active socket clients
 */
export const emitToUser = (userId, eventName, payload) => {
  if (!io) {
    logger.warn('Socket Emitter: Cannot emit to user. Socket server is not initialized.');
    return;
  }
  const userStr = userId.toString();
  io.to(`user:${userStr}`).emit(eventName, payload);
  logger.debug(`Socket Emit: Targeted [${eventName}] to [user:${userStr}]`);
};

/**
 * Utility to query real-time connections statistics
 */
export const getActiveConnectionsCount = () => {
  return activeConnections.size;
};
