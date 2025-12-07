const rateLimit = require("express-rate-limit");

/**
 * Rate limiters for different endpoints
 * Prevents brute force attacks and API abuse
 */

// Login rate limiter - 5 attempts per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per windowMs
  message: "Too many login attempts from this IP, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

// Registration rate limiter - 50 attempts per hour (generous for testing)
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 registration requests per hour
  message: "Too many accounts created from this IP, please try again after an hour",
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiter - 100 requests per 15 minutes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
});

// File upload rate limiter - 10 uploads per 15 minutes
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: "Too many file uploads, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  loginLimiter,
  registrationLimiter,
  apiLimiter,
  uploadLimiter,
};
