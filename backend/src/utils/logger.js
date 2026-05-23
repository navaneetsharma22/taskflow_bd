import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config/index.js';

/**
 * UTILS DIRECTORY - ENTERPRISE LOGGER SERVICE (logger.js)
 * Responsibility: Comprehensive Winston logging interface providing:
 *  1. Colored, human-readable console trace outputs in local development.
 *  2. Strict JSON structured files logs in production (ideal for Datadog, ELK, Grafana Loki).
 *  3. Automated, zipped Daily File Rotation for long-term audit compliance.
 *  4. Isolated logging levels (error, warn, info, http, debug).
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_DIR = path.join(__dirname, '../../logs');

// Define corporate severity hierarchy
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Filter severity based on the validated application environment settings
const getLogLevel = () => {
  return config.env === 'development' ? 'debug' : 'info';
};

// Colors for intuitive command-line tracing in development
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'cyan',
};
winston.addColors(colors);

// Development Log Format: Clean, colored lines with precise timestamps
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `[${info.timestamp}] [${info.level}]: ${info.message}${info.stack ? `\nStack: ${info.stack}` : ''}`
  )
);

// Production Log Format: Strict JSON objects for direct pipeline aggregations
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }), // Include stack trace if error instance is passed
  winston.format.json()
);

const transports = [];

// ==========================================
// 1. Console Logging (Enabled in all envs)
// ==========================================
transports.push(
  new winston.transports.Console({
    level: getLogLevel(),
    format: config.env === 'development' ? devFormat : prodFormat,
  })
);

// ==========================================
// 2. Production Daily Log Rotation
// ==========================================
if (config.env === 'production') {
  // Rotated error-only logs
  transports.push(
    new winston.transports.DailyRotateFile({
      level: 'error',
      dirname: LOG_DIR,
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,              // Gzip old logs to save disk spaces
      maxSize: '20m',                   // Rotate log files after 20 Megabytes
      maxFiles: '14d',                  // Retain historical logs for 14 days
      format: prodFormat,
    })
  );

  // Rotated combined logs (capturing all levels)
  transports.push(
    new winston.transports.DailyRotateFile({
      level: 'debug',                   // Captures everything up to debug (based on runtime config)
      dirname: LOG_DIR,
      filename: 'combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: prodFormat,
    })
  );
}

// Create core Winston instance
const winstonInstance = winston.createLogger({
  level: getLogLevel(),
  levels,
  transports,
});

// Reusable Logger Service Interface
const logger = {
  /**
   * Log informational messaging.
   */
  info: (message) => winstonInstance.info(message),

  /**
   * Log system warnings.
   */
  warn: (message) => winstonInstance.warn(message),

  /**
   * Log critical errors. Accepts error instance or plain string.
   */
  error: (message, errorInstance = null) => {
    if (errorInstance instanceof Error) {
      winstonInstance.error(message, { error: errorInstance, stack: errorInstance.stack });
    } else {
      winstonInstance.error(message);
    }
  },

  /**
   * Log HTTP and server request telemetry.
   */
  http: (message) => winstonInstance.http(message),

  /**
   * Log diagnostics developer logs.
   */
  debug: (message) => winstonInstance.debug(message),

  // Expose underlying raw winston instance if required by third-party hook libraries
  stream: {
    write: (message) => winstonInstance.http(message.trim()),
  },
};

export default logger;
