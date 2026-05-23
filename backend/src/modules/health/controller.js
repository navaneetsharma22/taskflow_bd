import mongoose from 'mongoose';
import cacheManager from '../../utils/cache.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { successResponse, errorResponse } from '../../utils/responseHelper.js';

/**
 * HEALTH CHECK MODULE - BOUNDARY CONTROLLERS (controller.js)
 * Responsibility: Wires absolute high-fidelity system diagnostics:
 *   1. MongoDB persistence readiness status.
 *   2. Redis caching availability.
 *   3. Host system health metrics (uptime, memory limits).
 * Returns HTTP 503 if critical dependencies are down, ideal for cloud load balancers.
 */

export const checkHealth = asyncHandler(async (req, res) => {
  const healthDetails = {
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date(),
    memory: {
      rssMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
      heapTotalMb: Math.round(process.memoryUsage().heapTotal / (1024 * 1024)),
      heapUsedMb: Math.round(process.memoryUsage().heapUsed / (1024 * 1024)),
    },
    services: {
      database: 'DOWN',
      cache: 'DOWN',
    }
  };

  // 1. Check MongoDB ready state (1 = CONNECTED)
  const isDbConnected = mongoose.connection.readyState === 1;
  healthDetails.services.database = isDbConnected ? 'UP' : 'DOWN';

  // 2. Check Caching Connection state
  const isCacheConnected = !cacheManager.isMockActive;
  healthDetails.services.cache = isCacheConnected ? 'UP' : 'DOWN (FALLBACK_ACTIVE)';

  // Determine overall status
  const isSystemHealthy = isDbConnected; // DB is critical

  if (isSystemHealthy) {
    return successResponse(res, 'TaskFlow Backend service is completely healthy and operational.', healthDetails, 200);
  } else {
    // Return 503 Service Unavailable if critical database link is severed
    res.setHeader('Retry-After', '30');
    return res.status(503).json({
      success: false,
      message: 'TaskFlow Backend is currently degraded or experiencing outage.',
      data: healthDetails,
    });
  }
});
