const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');

// Skapa logs directory om den inte finns
const logsDir = path.join(__dirname, '../logs');

// Konfigurera daily rotation för olika log-nivåer
const fileRotateTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logsDir, 'application-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxFiles: '14d', // Behåll logs i 14 dagar
  maxSize: '20m', // Max 20MB per fil
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
});

const securityRotateTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logsDir, 'security-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxFiles: '30d', // Behåll security logs i 30 dagar
  maxSize: '20m',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  level: 'warn', // Endast warnings och errors
});

// Skapa winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'move-out-app' },
  transports: [
    fileRotateTransport,
    securityRotateTransport,
  ],
});

// Lägg till console logging i development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

// Audit logging funktioner
const auditLogger = {
  // Log misslyckade login-försök
  logFailedLogin: (email, ip, reason = 'Invalid credentials') => {
    logger.warn('Failed login attempt', {
      event: 'LOGIN_FAILED',
      email,
      ip,
      reason,
      timestamp: new Date().toISOString(),
    });
  },

  // Log lyckade logins
  logSuccessfulLogin: (userId, email, ip) => {
    logger.info('Successful login', {
      event: 'LOGIN_SUCCESS',
      userId,
      email,
      ip,
      timestamp: new Date().toISOString(),
    });
  },

  // Log lösenordsändringar
  logPasswordChange: (userId, email, ip) => {
    logger.warn('Password changed', {
      event: 'PASSWORD_CHANGE',
      userId,
      email,
      ip,
      timestamp: new Date().toISOString(),
    });
  },

  // Log kontodeaktivering
  logAccountDeactivation: (userId, email, reason = 'User requested') => {
    logger.warn('Account deactivated', {
      event: 'ACCOUNT_DEACTIVATED',
      userId,
      email,
      reason,
      timestamp: new Date().toISOString(),
    });
  },

  // Log admin åtgärder
  logAdminAction: (adminId, action, targetUserId, details = {}) => {
    logger.warn('Admin action performed', {
      event: 'ADMIN_ACTION',
      adminId,
      action,
      targetUserId,
      details,
      timestamp: new Date().toISOString(),
    });
  },

  // Log registrering
  logRegistration: (email, ip, verified = false) => {
    logger.info('New user registration', {
      event: 'USER_REGISTRATION',
      email,
      ip,
      verified,
      timestamp: new Date().toISOString(),
    });
  },

  // Log email verification
  logEmailVerification: (email, success = true) => {
    logger.info('Email verification attempt', {
      event: 'EMAIL_VERIFICATION',
      email,
      success,
      timestamp: new Date().toISOString(),
    });
  },

  // Log rate limit violations
  logRateLimitViolation: (ip, endpoint) => {
    logger.warn('Rate limit exceeded', {
      event: 'RATE_LIMIT_VIOLATION',
      ip,
      endpoint,
      timestamp: new Date().toISOString(),
    });
  },

  // Log CSRF violations
  logCsrfViolation: (ip, url) => {
    logger.warn('CSRF token validation failed', {
      event: 'CSRF_VIOLATION',
      ip,
      url,
      timestamp: new Date().toISOString(),
    });
  },

  // Generisk security event logging
  logSecurityEvent: (eventType, details) => {
    logger.warn('Security event', {
      event: eventType,
      ...details,
      timestamp: new Date().toISOString(),
    });
  },
};

module.exports = { logger, auditLogger };
