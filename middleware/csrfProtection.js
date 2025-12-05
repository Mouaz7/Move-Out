const csurf = require("csurf");

// Configure CSRF protection
const csrfProtection = csurf({
  cookie: false, // Use session-based CSRF (since we're using express-session)
});

// Middleware to add CSRF token to all responses
const addCsrfToken = (req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
};

module.exports = {
  csrfProtection,
  addCsrfToken,
};
