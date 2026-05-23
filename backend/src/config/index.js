import env from './env.js';

/**
 * CONFIG DIRECTORY - CONFIGURATION LOADER (index.js)
 * Responsibility: Consolidates validated environment variables and system settings.
 * Serves as the global configuration entry point across the application.
 * Utilizes config/env.js to guarantee zero raw process.env interaction elsewhere.
 */

const config = {
  env: env.nodeEnv,
  port: env.port,
  db: {
    uri: env.mongo.uri,
    options: {
      autoIndex: env.nodeEnv === 'development', // Only auto-build indexes in dev; disable in prod for performance
    },
  },
  redis: {
    url: env.redis.url,
  },
  jwt: {
    secret: env.jwt.secret,
    refreshSecret: env.jwt.refreshSecret,
    accessExpiry: env.jwt.accessExpiry,
    refreshExpiry: env.jwt.refreshExpiry,
  },
  cors: {
    origins: env.cors.origins,
  },
  rateLimit: {
    windowMs: env.rateLimit.windowMs,
    max: env.rateLimit.max,
  }
};

export default config;
