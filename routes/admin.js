"use strict";
/**
 * Admin Routes
 * Handles: user management, sessions, marketing emails
 */
const express = require("express");
const router = express.Router();
const userService = require("../src/services/userService");
const emailService = require("../src/services/emailService");
const isAdmin = require("../middleware/isAdmin"); // Check admin status
const moment = require("moment");

// Store for active sessions (in-memory tracking)
const activeSessions = new Map();

// Export activeSessions for use in other modules
router.activeSessions = activeSessions;

// Helper to add session
router.addSession = (sessionId, userData) => {
  activeSessions.set(sessionId, {
    ...userData,
    loginTime: new Date(),
    lastActivity: new Date()
  });
};

// Helper to remove session
router.removeSession = (sessionId) => {
  activeSessions.delete(sessionId);
};

// Helper to update session activity
router.updateSessionActivity = (sessionId) => {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.lastActivity = new Date();
  }
};

// Route to display all users (including storage usage)
router.get("/users", isAdmin, async (req, res) => {
  const user = req.session.user;
  try {
    const users = await userService.getAllUsers(); // Get users with last_activity and created_at
    res.render("adminUsers", {
      users,
      showDashboard: false,
      showSessions: false,
      activeSessions: [],
      errorMessage: null,
      successMessage: req.query.successMessage || null,
      user,
      title: "Admin Panel - Manage Users",
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.render("adminUsers", {
      users: [],
      showDashboard: false,
      showSessions: false,
      activeSessions: [],
      errorMessage: "Error fetching users.",
      successMessage: null,
      user,
      title: "Admin Panel - Manage Users",
    });
  }
});

// Route to display active sessions
router.get("/sessions", isAdmin, async (req, res) => {
  const user = req.session.user;
  try {
    // Convert Map to array for display
    const sessions = Array.from(activeSessions.entries()).map(([sessionId, data]) => ({
      sessionId: sessionId.substring(0, 8) + '...', // Shortened for display
      fullSessionId: sessionId,
      email: data.email,
      profileName: data.profileName,
      loginTime: data.loginTime,
      lastActivity: data.lastActivity,
      userId: data.id
    }));

    res.render("adminUsers", {
      users: [],
      showDashboard: false,
      showSessions: true,
      activeSessions: sessions,
      errorMessage: null,
      successMessage: req.query.successMessage || null,
      user,
      title: "Admin Panel - Active Sessions",
    });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    res.render("adminUsers", {
      users: [],
      showDashboard: false,
      showSessions: true,
      activeSessions: [],
      errorMessage: "Error fetching sessions.",
      successMessage: null,
      user,
      title: "Admin Panel - Active Sessions",
    });
  }
});

// Route to kick a session (log out user)
router.post("/kick-session", isAdmin, (req, res) => {
  const { session_id } = req.body;
  try {
    activeSessions.delete(session_id);
    res.redirect("/move/admin/sessions?successMessage=User session terminated successfully");
  } catch (error) {
    console.error("Error kicking session:", error);
    res.redirect("/move/admin/sessions?errorMessage=Error terminating session");
  }
});

// Route for admin dashboard
router.get("/user", isAdmin, (req, res) => {
  const user = req.session.user;
  if (user && user.isAdmin) {
    res.render("adminUsers", {
      showDashboard: true,
      showSessions: false,
      activeSessions: [],
      errorMessage: null,
      successMessage: null,
      user,
      title: "Admin Dashboard",
    });
  } else {
    res.status(403).send("<h1>Access Denied</h1><p>You do not have access to the admin dashboard.</p>");
  }
});

// Route to delete a user
router.post("/delete", isAdmin, async (req, res) => {
  const userId = req.body.user_id;
  try {
    await userService.deleteUser(userId);
    res.redirect("/move/admin/users?successMessage=User deleted successfully");
  } catch (error) {
    console.error("Error deleting user:", error);
    const users = await userService.getAllUsers();
    res.render("adminUsers", {
      users,
      showDashboard: false,
      showSessions: false,
      activeSessions: [],
      errorMessage: "Error deleting user.",
      successMessage: null,
      user: req.session.user,
      title: "Admin Panel - Manage Users",
    });
  }
});

// Route to activate/deactivate user
router.post("/toggle-status", isAdmin, async (req, res) => {
  const userId = req.body.user_id;
  try {
    await userService.toggleUserStatus(userId); // Toggle user status
    res.redirect("/move/admin/users?successMessage=User status updated");
  } catch (error) {
    console.error("Error toggling user status:", error);
    const users = await userService.getAllUsers();
    res.render("adminUsers", {
      users,
      showDashboard: false,
      showSessions: false,
      activeSessions: [],
      errorMessage: error.message || "Error toggling user status.",
      successMessage: null,
      user: req.session.user,
      title: "Admin Panel - Manage Users",
    });
  }
});

// Route to send marketing emails
router.post("/send-marketing", isAdmin, async (req, res) => {
  const { subject, message } = req.body;
  const user = req.session.user;
  try {
    await userService.sendMarketingEmails(subject, message); // Send emails
    res.redirect("/move/admin/users?successMessage=Marketing emails sent successfully");
  } catch (error) {
    console.error("Error sending marketing emails:", error);
    res.render("adminUsers", {
      users: [],
      showDashboard: true,
      showSessions: false,
      activeSessions: [],
      errorMessage: "Error sending marketing emails.",
      successMessage: null,
      user,
      title: "Admin Panel - Send Marketing Emails",
    });
  }
});

// Automatic deactivation of users after one month of inactivity
router.get("/deactivate-inactive", isAdmin, async (req, res) => {
  try {
    await userService.deactivateInactiveUsers(); // Handle deactivation
    res.redirect("/move/admin/users?successMessage=Inactive users deactivated successfully");
  } catch (error) {
    console.error("Error deactivating inactive users:", error);
    res.render("adminUsers", {
      users: [],
      showDashboard: true,
      showSessions: false,
      activeSessions: [],
      errorMessage: "Error deactivating inactive users.",
      successMessage: null,
      user: req.session.user,
      title: "Admin Panel - Manage Users",
    });
  }
});

module.exports = router;
