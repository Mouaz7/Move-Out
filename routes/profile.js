"use strict";
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");

const { pool, getConnection } = require("../config/db/database");
const requireLogin = require("../middleware/requireLogin");
const { validateProfileUpdate, handleValidationErrors } = require("../middleware/validateInput");

// Password validation helper
function validatePassword(password) {
  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
  return passwordRegex.test(password);
}

// GET /profile
router.get("/", requireLogin, (req, res) => {
  res.render("profile", {
    title: "MoveOut - Profile",
    user: req.user,
    errorMessage: null,
    successMessage: null,
  });
});

// POST /profile/update
router.post("/update", requireLogin, validateProfileUpdate, handleValidationErrors, async (req, res) => {
  const { profileName, email, currentPassword, newPassword } = req.body;
  let client;

  try {
    client = await getConnection();
    const userId = req.user.id;
    const result = await client.query("SELECT * FROM users WHERE user_id = $1", [userId]);
    const user = result.rows[0];

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isPasswordValid) {
      return res.render("profile", {
        title: "MoveOut - Profile",
        user: req.user,
        errorMessage: "Current password is incorrect.",
        successMessage: null,
      });
    }

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
      await client.query("UPDATE users SET password_hash = $1 WHERE user_id = $2", [hashedPassword, userId]);
    }

    await client.query("UPDATE users SET profile_name = $1, email = $2 WHERE user_id = $3", [profileName, email, userId]);

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
    if (client) {
      client.release();
    }
  }
});

// POST /profile/deactivate
router.post("/deactivate", requireLogin, async (req, res) => {
  const userId = req.user.id;
  let client;

  try {
    client = await getConnection();
    await client.query("UPDATE users SET is_active = FALSE WHERE user_id = $1", [userId]);

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
    if (client) {
      client.release();
    }
  }
});

// POST /profile/reactivate
router.post("/reactivate", async (req, res) => {
  const { email } = req.body;
  let client;

  try {
    client = await getConnection();
    const result = await client.query("SELECT * FROM users WHERE email = $1", [email]);

    if (result.rows.length === 0 || result.rows[0].is_active) {
      return res.render("reactivate", {
        title: "MoveOut - Reactivate",
        errorMessage: "Account not found or already active.",
        successMessage: null,
      });
    }

    await client.query("UPDATE users SET is_active = TRUE WHERE email = $1", [email]);

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
    if (client) {
      client.release();
    }
  }
});

// GET /profile/reactivate
router.get("/reactivate", (req, res) => {
  res.render("reactivate", {
    title: "MoveOut - Reactivate",
    errorMessage: null,
    successMessage: null,
  });
});

module.exports = router;
