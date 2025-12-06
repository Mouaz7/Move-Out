"use strict";
const helmet = require("helmet");
const cors = require("cors");
const crypto = require("crypto");

/**
 * Security middleware configuration
 * Includes helmet.js for HTTP security headers, CORS, and CSP with nonces
 */
function configureSecurityMiddleware(app) {
  // Generate CSP nonce for each request
  app.use((req, res, next) => {
    res.locals.cspNonce = crypto.randomBytes(16).toString("base64");
    next();
  });

  // Helmet.js for security headers with dynamic CSP nonce
  app.use((req, res, next) => {
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            `'nonce-${res.locals.cspNonce}'`,
            "'unsafe-hashes'", // For inline event handlers hashes
          ],
          scriptSrcAttr: ["'unsafe-inline'"], // Required for onclick, onchange etc.
          styleSrc: [
            "'self'",
            "'unsafe-inline'", // CSS needs inline for dynamic themes
            "https://fonts.googleapis.com",
            "https://cdnjs.cloudflare.com",
          ],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
    })(req, res, next);
  });

  // CORS configuration
  const corsOptions = {
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.ALLOWED_ORIGINS?.split(",") || true
        : ["http://localhost:1338", "http://localhost:3000"],
    credentials: true,
    optionsSuccessStatus: 200,
  };

  app.use(cors(corsOptions));

  // Additional security headers
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
    next();
  });
}

module.exports = configureSecurityMiddleware;
