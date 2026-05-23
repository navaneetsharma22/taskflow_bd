import express from 'express';
import * as healthController from './controller.js';

/**
 * HEALTH CHECK MODULE - ROUTER (routes.js)
 * Responsibility: Exposes public diagnostics endpoints for external load-balancers,
 * auto-scaler metrics, and server orchestration probes (Kubernetes, AWS ALB).
 */

const router = express.Router();

// Publicly exposed diagnostics check (No authorization guards)
router.get('/', healthController.checkHealth);

export default router;
