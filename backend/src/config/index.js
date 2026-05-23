import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * CONFIG DIRECTORY - CONFIGURATION LOADER
 * Responsibility: Consolidates, parses, and validates all environment variables.
 * Acts as the single source of truth for app settings, preventing direct use of process.env.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  db: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/taskflow',
    options: {
      autoIndex: true, // Auto build indexes in Mongoose (turn off in large prod DBs if manual index building is preferred)
    },
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'fallback_access_secret_for_dev_only',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_for_dev_only',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  cors: {
    origins: process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',') 
      : ['http://localhost:3000', 'http://localhost:5173'],
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // limit each IP
  }
};

export default config;
