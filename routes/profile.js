"use strict";
/**
 * Profile Routes
 * Handles: profile view, update, deactivate, reactivate
 */
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
require("dotenv").config();

const db = require("../config/db/database");
const requireLogin = require("../middleware/requireLogin");

// Import shared validation utilities
const { validatePassword } = require("../utils/validation");

// GET /profile - Show profile page
router.get("/profile", requireLogin, (req, res) => {
  res.render("profile", {
    title: "MoveOut - Profile",
    user: req.user,
    errorMessage: null,
    successMessage: null,
  });
});

// POST /profile/update - Update profile
router.post("/profile/update", requireLogin, async (req, res) => {
  const { profileName, email, currentPassword, newPassword } = req.body;
  let connection;

  try {
    connection = await db.getConnection();
    const userId = req.user.id;
    const [users] = await connection.query("SELECT * FROM users WHERE user_id = ?", [userId]);
    const user = users[0];

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isPasswordValid) {
      return res.render("profile", {
        title: "MoveOut - Profile",
        user: req.user,
        errorMessage: "Current password is incorrect.",
        successMessage: null,
      });
    }

    // Update password if new one provided
    if (newPassword && newPassword.length > 0) {
      if (!validatePassword(newPassword)) {
        return res.render("profile", {
          title: "MoveOut - Profile",
          user: req.user,
          errorMessage: "New password must be at least 8 characters long, contain one uppercase letter, one number, and one special character.",
          successMessage: null,
        });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      await connection.query("UPDATE users SET password_hash = ? WHERE user_id = ?", [hashedPassword, userId]);
    }

    // Update profile info
    await connection.query(
      "UPDATE users SET profile_name = ?, email = ? WHERE user_id = ?",
      [profileName, email, userId]
    );

    // Update session
    req.session.user.profileName = profileName;
    req.session.user.email = email;

    return res.render("profile", {
      title: "MoveOut - Profile",
      user: req.session.user,
      errorMessage: null,
      successMessage: "Profile updated successfully!",
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.render("profile", {
      title: "MoveOut - Profile",
      user: req.user,
      errorMessage: "An error occurred while updating your profile.",
      successMessage: null,
    });
  } finally {
    if (connection) connection.release();
  }
});

// POST /profile/deactivate - Deactivate account
router.post("/profile/deactivate", requireLogin, async (req, res) => {
  const userId = req.user.id;
  let connection;

  try {
    connection = await db.getConnection();
    await connection.query("UPDATE users SET is_active = false WHERE user_id = ?", [userId]);

    req.session.destroy();
    res.clearCookie("connect.sid");
    res.redirect("/move/login");
  } catch (error) {
    console.error("Error deactivating profile:", error);
    res.status(500).render("profile", {
      title: "MoveOut - Profile",
      user: req.user,
      errorMessage: "An error occurred while deactivating your profile.",
      successMessage: null,
    });
  } finally {
    if (connection) connection.release();
  }
});

// GET /profile/reactivate - Show reactivation form
router.get("/profile/reactivate", (req, res) => {
  res.render("reactivate", {
    title: "MoveOut - Reactivate",
    errorMessage: null,
    successMessage: null,
  });
});

// POST /profile/reactivate - Handle reactivation
router.post("/profile/reactivate", async (req, res) => {
  const { email } = req.body;
  let connection;

  try {
    connection = await db.getConnection();
    const [users] = await connection.query("SELECT * FROM users WHERE email = ?", [email]);

    if (users.length === 0 || users[0].is_active) {
      return res.render("reactivate", {
        title: "MoveOut - Reactivate",
        errorMessage: "Account not found or already active.",
        successMessage: null,
      });
    }

    await connection.query("UPDATE users SET is_active = true WHERE email = ?", [email]);

    return res.render("reactivate", {
      title: "MoveOut - Reactivate",
      errorMessage: null,
      successMessage: "Account reactivated successfully! You can now log in.",
    });
  } catch (error) {
    console.error("Error reactivating account:", error);
    res.status(500).render("reactivate", {
      title: "MoveOut - Reactivate",
      errorMessage: "Internal server error occurred.",
      successMessage: null,
    });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;
