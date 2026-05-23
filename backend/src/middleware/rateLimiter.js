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

/**
 * Strict Auth Rate Limiter
 * Applies aggressive limits to authentication endpoints to prevent
 * credential stuffing, brute-force, and enumeration attacks.
 * 5 requests per minute per IP.
 */
export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: {
    status: 429,
    message: 'Too many authentication attempts. Please wait before trying again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export default globalRateLimiter;

