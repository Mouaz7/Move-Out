"use strict";
const express = require("express");
const session = require("express-session");
const path = require("path");
const port = process.env.PORT || 1338;
const app = express();

// Trust proxy for Cloud Run / Load Balancers
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}
const indexRoutes = require("./routes/indexRoutes.js");
const adminRoutes = require("./middleware/adminRoutes");
const cli = require("./src/cli");
require("dotenv").config();
const cron = require("node-cron");
const authRoutes = require("./routes/authRoutes");
const passport = require("passport");
require("./config/db/passport");

// Security middleware imports
const securityHeaders = require("./middleware/securityHeaders");
const { csrfProtection, addCsrfToken } = require("./middleware/csrfProtection");
const httpsRedirect = require("./middleware/httpsRedirect");

// PostgreSQL session store
const pgSession = require("connect-pg-simple")(session);
const { pool } = require("./config/db/database");

// Validate required environment variables
if (!process.env.SESSION_SECRET) {
  console.error("FATAL ERROR: SESSION_SECRET is not defined in environment variables.");
  process.exit(1);
}

// Set up the session store with PostgreSQL
const sessionStore = new pgSession({
  pool: pool,
  tableName: "session",
  createTableIfMissing: true,
});

// Apply HTTPS redirect first (only in production)
app.use(httpsRedirect);

// Apply security headers
app.use(securityHeaders);

// Add session handling to the app
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: "strict",
    },
  })
);

// Middleware for Passport
app.use(passport.initialize());
app.use(passport.session());

// Middleware to handle static files
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Middleware to handle form data and JSON
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Add CSRF protection
app.use(csrfProtection);
app.use(addCsrfToken);

app.use(authRoutes);

// Set the path to views
app.set("views", path.join(__dirname, "views/pages"));
app.set("view engine", "ejs");

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`${new Date().toLocaleString()} - ${req.method} ${req.url}`);
  next();
});

// Make the session available in all views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Use routes
app.use("/move", indexRoutes);
app.use("/move/admin", adminRoutes);

// Handle 404 errors
app.use((req, res, next) => {
  res.status(404).render("error", {
    title: "404 - Not Found",
    message: "Page not found",
    user: req.session ? req.session.user : null,
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error("Global error handler:", {
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    url: req.url,
    method: req.method,
  });

  const user = req.session ? req.session.user : null;

  if (err.code === "EBADCSRFTOKEN") {
    return res.status(403).render("error", {
      title: "Security Error - MoveOut",
      message: "Invalid security token. Please refresh the page and try again.",
      user,
    });
  }

  res.status(err.status || 500).render("error", {
    title: "Error - MoveOut",
    message: process.env.NODE_ENV === "development" ? err.message : "Internal Server Error",
    user,
  });
});

// Schedule deactivation of inactive accounts once a day
cron.schedule("0 0 * * *", async () => {
  try {
    console.log("Running automatic deactivation of inactive accounts...");
    await cli.deactivateInactiveUsers();
    console.log("Automatic deactivation completed.");
  } catch (error) {
    console.error("Error during automatic deactivation:", error);
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}/move`);
});
