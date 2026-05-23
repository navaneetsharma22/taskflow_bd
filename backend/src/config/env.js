import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * CONFIG DIRECTORY - ENVIRONMENT VALIDATOR (env.js)
 * Responsibility: Loads, parses, and strictly validates crucial system environment variables.
 * Fails the application startup instantly if any required variable is missing or malformed,
 * preventing execution in a compromised state.
 * No direct process.env usage is permitted elsewhere in the codebase.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load raw environment variables from root .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

const requiredVars = [
  'PORT',
  'MONGO_URI',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'REDIS_URL',
  'NODE_ENV',
];

// Accumulate validation error details to print a unified report if multiple validations fail
const validationErrors = [];

const validateEnv = () => {
  // 1. Assert existence of all mandatory keys
  for (const key of requiredVars) {
    if (!process.env[key]) {
      validationErrors.push(`Missing essential environment variable: [${key}]`);
    }
  }

  // If any are completely missing, exit immediately with the missing keys report
  if (validationErrors.length > 0) {
    printFailReportAndExit();
  }

  // 2. Validate values and types
  const NODE_ENV = process.env.NODE_ENV;
  if (!['development', 'production', 'test'].includes(NODE_ENV)) {
    validationErrors.push(
      `Invalid NODE_ENV value: "${NODE_ENV}". Expected: 'development', 'production', or 'test'.`
    );
  }

  const PORT = parseInt(process.env.PORT, 10);
  if (isNaN(PORT) || PORT <= 0 || PORT > 65535) {
    validationErrors.push(`Invalid PORT structure: "${process.env.PORT}". Must be a valid integer between 1 and 65535.`);
  }

  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI.startsWith('mongodb://') && !MONGO_URI.startsWith('mongodb+srv://')) {
    validationErrors.push(
      `Invalid MONGO_URI protocol: "${MONGO_URI}". Must start with "mongodb://" or "mongodb+srv://".`
    );
  }

  const REDIS_URL = process.env.REDIS_URL;
  if (!REDIS_URL.startsWith('redis://') && !REDIS_URL.startsWith('rediss://')) {
    validationErrors.push(
      `Invalid REDIS_URL protocol: "${REDIS_URL}". Must start with "redis://" or "rediss://".`
    );
  }

  const JWT_SECRET = process.env.JWT_SECRET;
  if (JWT_SECRET.length < 16) {
    validationErrors.push('Security Warning: JWT_SECRET must be at least 16 characters long for secure signing.');
  }

  const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
  if (JWT_REFRESH_SECRET.length < 16) {
    validationErrors.push('Security Warning: JWT_REFRESH_SECRET must be at least 16 characters long for secure signing.');
  }

  // If any format or validation failed, report and exit
  if (validationErrors.length > 0) {
    printFailReportAndExit();
  }
};

const printFailReportAndExit = () => {
  console.error('\n================================================================');
  console.error('⛔ FATAL: BACKEND BOOTSTRAP FAILURE (ENVIRONMENT VALIDATION)');
  console.error('================================================================');
  validationErrors.forEach((err) => {
    console.error(` ❌ ${err}`);
  });
  console.error('================================================================\n');
  console.error('Please inspect your local root .env file and try starting again.\n');
  process.exit(1);
};

// Run validation during module loading
validateEnv();

// Export strictly typed, verified configuration tokens
const env = {
  nodeEnv: process.env.NODE_ENV,
  port: parseInt(process.env.PORT, 10),
  mongo: {
    uri: process.env.MONGO_URI,
  },
  redis: {
    url: process.env.REDIS_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  cors: {
    origins: process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',') 
      : ['http://localhost:3000', 'http://localhost:5173'],
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  }
};

export default env;
