"use strict";
/**
 * Authentication Routes
 * Handles: register, login, logout, email verification
 */
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
require("dotenv").config();

const { loginLimiter, registrationLimiter } = require("../middleware/rateLimiter");
// Import controller
const authController = require("../controllers/authController");


// Import shared validation utilities
const { validatePassword } = require("../utils/validation");

// Email transporter with timeout settings
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // Timeout settings to prevent hanging
  connectionTimeout: 10000, // 10 seconds to connect
  greetingTimeout: 10000,   // 10 seconds for greeting
  socketTimeout: 15000,     // 15 seconds for socket
});

// Async email sending helper that doesn't block
// Helper function removed (moved to emailService)

// GET /register - Show registration form
router.get("/register", authController.getRegister);

// POST /register - Handle registration
router.post("/register", registrationLimiter, authController.postRegister);

// GET /verify - Show verification form
router.get("/verify", authController.getVerify);

// POST /verify-code - Handle email verification
router.post("/verify-code", authController.postVerifyCode);

// GET /login - Show login form
router.get("/login", authController.getLogin);

// POST /login - Handle login with account lockout security
router.post("/login", loginLimiter, authController.postLogin);

// GET /logout - Handle logout
router.get("/logout", authController.logout);

// Export password validation for testing
router.validatePassword = validatePassword;

// ===== PASSWORD RESET =====

// GET /forgot-password - Show forgot password form
router.get("/forgot-password", (req, res) => {
  res.render("forgot_password", { 
    title: "MoveOut - Forgot Password", 
    errorMessage: null,
    successMessage: null 
  });
});

// POST /forgot-password - Send reset code
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  let connection;

  try {
    connection = await db.getConnection();
    const [users] = await connection.query("SELECT * FROM users WHERE email = ?", [email]);

    if (users.length === 0) {
      return res.render("forgot_password", {
        title: "MoveOut - Forgot Password",
        errorMessage: "No account found with this email.",
        successMessage: null,
      });
    }

    // Generate reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await connection.query(
      "UPDATE users SET reset_code = ?, reset_code_expiry = ? WHERE email = ?",
      [resetCode, resetExpiry.toISOString(), email]
    );

    // Send email (non-blocking)
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "MoveOut - Password Reset Code",
      text: `Your password reset code is: ${resetCode}\n\nThis code expires in 15 minutes.`,
    };

    const emailSent = await sendEmailAsync(mailOptions);

    res.render("reset_password", {
      title: "MoveOut - Reset Password",
      email: email,
      errorMessage: null,
      successMessage: emailSent 
        ? "Reset code sent to your email!"
        : "Reset code generated. Email delivery may be delayed - please check your spam folder.",
    });
  } catch (error) {
    console.error("Error during password reset:", error);
    res.render("forgot_password", {
      title: "MoveOut - Forgot Password",
      errorMessage: "An error occurred. Please try again.",
      successMessage: null,
    });
  } finally {
    if (connection) connection.release();
  }
});

// POST /reset-password - Verify code and reset password
router.post("/reset-password", async (req, res) => {
  const { email, resetCode, newPassword, confirmPassword } = req.body;
  let connection;

  if (newPassword !== confirmPassword) {
    return res.render("reset_password", {
      title: "MoveOut - Reset Password",
      email: email,
      errorMessage: "Passwords do not match.",
      successMessage: null,
    });
  }

  if (!validatePassword(newPassword)) {
    return res.render("reset_password", {
      title: "MoveOut - Reset Password",
      email: email,
      errorMessage: "Password must be at least 8 characters with uppercase, number, and special character.",
      successMessage: null,
    });
  }

  try {
    connection = await db.getConnection();
    const [users] = await connection.query(
      "SELECT * FROM users WHERE email = ? AND reset_code = ?",
      [email, resetCode]
    );

    if (users.length === 0) {
      return res.render("reset_password", {
        title: "MoveOut - Reset Password",
        email: email,
        errorMessage: "Invalid reset code.",
        successMessage: null,
      });
    }

    const user = users[0];
    const expiry = new Date(user.reset_code_expiry);
    if (expiry < new Date()) {
      return res.render("reset_password", {
        title: "MoveOut - Reset Password",
        email: email,
        errorMessage: "Reset code has expired. Please request a new one.",
        successMessage: null,
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await connection.query(
      "UPDATE users SET password_hash = ?, reset_code = NULL, reset_code_expiry = NULL WHERE email = ?",
      [hashedPassword, email]
    );

    res.render("login", {
      title: "MoveOut - Login",
      errorMessage: null,
      successMessage: "Password reset successfully! You can now log in.",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.render("reset_password", {
      title: "MoveOut - Reset Password",
      email: email,
      errorMessage: "An error occurred. Please try again.",
      successMessage: null,
    });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;
