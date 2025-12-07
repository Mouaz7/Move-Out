"use strict";
/**
 * CSRF Protection Middleware
 * Provides Cross-Site Request Forgery protection using session-based tokens
 */
const crypto = require("crypto");

/**
 * Generate a cryptographically secure CSRF token
 * @returns {string} A 64-character hex token
 */
function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * CSRF Protection Middleware
 * - Generates a CSRF token for each session
 * - Validates the token on POST, PUT, PATCH, DELETE requests
 * - Makes the token available in res.locals for templates
 */
function csrfProtection(req, res, next) {
  // Skip CSRF for API routes that use other auth methods
  if (req.path.startsWith("/api/")) {
    return next();
  }

  // Skip CSRF for OAuth routes (Google callback)
  if (req.path.startsWith("/auth/google")) {
    return next();
  }

  // Ensure session exists before accessing it
  if (!req.session) {
    return next();
  }

  // Generate token if not exists
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateToken();
  }

  // Make token available to templates
  res.locals.csrfToken = req.session.csrfToken;

  // For GET, HEAD, OPTIONS - just provide the token
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  // For state-changing methods, validate the token
  const submittedToken = req.body._csrf || req.headers["x-csrf-token"];

  if (!submittedToken) {
    return res.status(403).render("error", {
      title: "Forbidden",
      message: "CSRF token missing. Please refresh the page and try again.",
      user: req.session?.user || null,
    });
  }

  if (submittedToken !== req.session.csrfToken) {
    // Regenerate token on mismatch to prevent timing attacks
    req.session.csrfToken = generateToken();
    return res.status(403).render("error", {
      title: "Forbidden",
      message: "Invalid CSRF token. Please refresh the page and try again.",
      user: req.session?.user || null,
    });
  }

  // Token is valid - regenerate for next request (token rotation)
  req.session.csrfToken = generateToken();
  res.locals.csrfToken = req.session.csrfToken;

  next();
}

/**
 * Helper to generate CSRF hidden input for EJS templates
 * Usage in EJS: <%- csrfField() %>
 */
function csrfField() {
  return `<input type="hidden" name="_csrf" value="${this.csrfToken}">`;
}

module.exports = {
  csrfProtection,
  csrfField,
  generateToken,
};
