"use strict";
const express = require("express");
const session = require("express-session");
const path = require("path");
const port = process.env.PORT || 1338;
const app = express();

// Trust first proxy (Render, Heroku, etc.) - required for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Import modular routes
const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const boxRoutes = require("./routes/boxes");
const publicRoutes = require("./routes/public");
const adminRoutes = require("./routes/admin");
const googleAuthRoutes = require("./routes/authRoutes");

// Other imports
const cli = require("./src/cli");
require("dotenv").config();
const cron = require("node-cron");
const passport = require("passport");
require("./config/db/passport");

// Security middleware
const configureSecurityMiddleware = require("./middleware/security");
const { apiLimiter } = require("./middleware/rateLimiter");
const { csrfProtection } = require("./middleware/csrf");
const db = require("./config/db/database");

// Security middleware - must be early in middleware chain
configureSecurityMiddleware(app);

// HTTPS redirect in production
if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    if (req.header("x-forwarded-proto") !== "https") {
      res.redirect(`https://${req.header("host")}${req.url}`);
    } else {
      next();
    }
  });
}

// Rate limiting for all API routes
app.use("/move", apiLimiter);

// Session store configuration
// Uses PostgreSQL store in production, memory store in development
const pgSession = require("connect-pg-simple")(session);
const { Pool } = require("pg");

let sessionStore;
if (process.env.NODE_ENV === "production" && process.env.SUPABASE_DB_URL) {
  // Production: Use PostgreSQL session store
  const pgPool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  sessionStore = new pgSession({
    pool: pgPool,
    tableName: "session", // Will be created automatically
    createTableIfMissing: true,
  });
}

app.use(
  session({
    store: sessionStore, // undefined in dev = memory store, pgSession in prod
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    },
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// CSRF protection middleware
app.use(csrfProtection);

// Middleware to handle static files (CSS, JS, images, etc.)
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Middleware to handle form data and JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// Set the path to views
app.set("views", path.join(__dirname, "views/pages"));
// Set the view engine to EJS
app.set("view engine", "ejs");

// Log incoming requests (only in development) - minimal logging
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    // Only log page requests, not static files
    if (!req.url.includes('.') && !req.url.includes('well-known')) {
      console.log(`${req.method} ${req.url}`);
    }
    next();
  });
}

// Make session and CSRF token available in all views (EJS)
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.csrfToken = req.session.csrfToken || "";
  next();
});

// Health check endpoint for Cloud Run and monitoring
app.get("/health", async (req, res) => {
  const dbHealth = await db.healthCheck();
  res.status(dbHealth.status === "healthy" ? 200 : 503).json({
    status: dbHealth.status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbHealth,
  });
});

// ===== ROUTES =====

// Public routes (about page, QR access, root redirect)
app.use("/move", publicRoutes);

// Authentication routes (login, register, logout, verify)
app.use("/move", authRoutes);

// Profile routes (view, update, deactivate)
app.use("/move", profileRoutes);

// Box routes (CRUD, file uploads, labels)
app.use("/move/boxes", boxRoutes);

// Admin routes
app.use("/move/admin", adminRoutes);

// Google OAuth routes
app.use(googleAuthRoutes);

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
  console.error("Error:", err.message);
  const user = req.session ? req.session.user : null;
  res.status(500).render("error", {
    title: "Error - MoveOut", // Add title
    message: "Internal Server Error", // Define message here
    user, // Make user info available in the view
  });
});

// Schedule deactivation of inactive accounts once a day
cron.schedule("0 0 * * *", async () => {
  // Runs every day at 00:00
  try {
    await cli.deactivateInactiveUsers();
  } catch (error) {
    console.error("Error during automatic deactivation:", error.message);
  }
});

// Graceful shutdown handler
process.on("SIGTERM", async () => {
  await db.closeConnections();
  process.exit(0);
});

// Start the server
const server = app.listen(port, "0.0.0.0", () => {
  console.log(`✓ Server running on http://localhost:${port}/move`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`✓ Database: ${db.isUsingSQLite() ? "SQLite (local)" : "PostgreSQL (cloud)"}`);
});
