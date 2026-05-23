import rateLimit from 'express-rate-limit';
import config from '../config/index.js';

/**
 * MIDDLEWARE DIRECTORY - RATE LIMITER
 * Responsibility: Protects the API endpoints from brute-force attacks and DDOS
 * by limiting request rates per IP in a given window using express-rate-limit.
 */

const globalRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    status: 429,
    message: 'Too many requests received from this source. Please retry later.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

export default globalRateLimiter;
