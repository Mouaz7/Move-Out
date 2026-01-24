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

const db = require("../config/db/database");
const { loginLimiter, registrationLimiter } = require("../middleware/rateLimiter");
const { 
  validateRegistration, 
  validateLogin, 
  validateVerificationCode,
  handleValidationErrors 
} = require("../middleware/validator");

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
async function sendEmailAsync(mailOptions) {
  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully to:", mailOptions.to);
    return true;
  } catch (error) {
    console.error("Error sending email:", error.message);
    return false;
  }
}

// GET /register - Show registration form
router.get("/register", (req, res) => {
  res.render("register", { title: "Move - Register", errorMessage: null });
});

// POST /register - Handle registration
router.post("/register", registrationLimiter, async (req, res) => {
  const { name, email, psw, psw_repeat } = req.body;
  const isGmailUser = email.endsWith("@gmail.com");

  // Validate password
  if (!validatePassword(psw)) {
    return res.status(400).render("register", {
      title: "Move - Register",
      errorMessage: "Password must be at least 8 characters long, contain one uppercase letter, one number, and one special character.",
    });
  }

  if (psw !== psw_repeat) {
    return res.status(400).render("register", {
      title: "Move - Register",
      errorMessage: "Passwords do not match.",
    });
  }

  let connection;
  try {
    connection = await db.getConnection();
    const [users] = await connection.query("SELECT * FROM users WHERE email = ?", [email]);
    
    if (users.length > 0) {
      return res.status(400).render("register", {
        title: "Move - Register",
        errorMessage: "Email already registered.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(psw, salt);
    const isVerified = isGmailUser ? 1 : 0; // Use 1/0 instead of true/false for SQLite
    const verificationCode = isGmailUser ? null : Math.floor(100000 + Math.random() * 900000).toString();

    await connection.query(
      "INSERT INTO users (email, password_hash, profile_name, is_verified, verification_code) VALUES (?, ?, ?, ?, ?)",
      [email, hashedPassword, name, isVerified, verificationCode]
    );

    // Send verification email for non-Gmail users (non-blocking)
    if (!isGmailUser) {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your MoveOut Verification Code",
        text: `Your verification code is: ${verificationCode}`,
      };
      
      // Send email without blocking - if it fails, user can still verify later
      const emailSent = await sendEmailAsync(mailOptions);
      
      return res.render("verify", {
        title: "Move - Verify",
        email: email,
        successMessage: emailSent 
          ? "Registration successful! Please enter the verification code sent to your email."
          : "Registration successful! Email delivery may be delayed. Your verification code was generated - please contact support if you don't receive it.",
        errorMessage: null,
        verified: false,
      });
    } else {
      res.redirect("/move/login");
    }
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).render("register", {
      title: "Move - Register",
      errorMessage: "Internal Server Error.",
    });
  } finally {
    if (connection) connection.release();
  }
});

// GET /verify - Show verification form
router.get("/verify", (req, res) => {
  res.render("verify", {
    title: "Move - Verify",
    email: "",
    errorMessage: null,
    successMessage: null,
    verified: false,
  });
});

// POST /verify-code - Handle email verification
router.post("/verify-code", async (req, res) => {
  const { email, verificationCode } = req.body;
  let connection;

  try {
    connection = await db.getConnection();
    const [users] = await connection.query(
      "SELECT * FROM users WHERE email = ? AND verification_code = ?",
      [email, verificationCode]
    );

    if (users.length === 0) {
      return res.status(400).render("verify", {
        title: "Move - Verify",
        email: email,
        errorMessage: "Invalid verification code.",
        successMessage: null,
        verified: false,
      });
    }

    await connection.query(
      "UPDATE users SET is_verified = 1, verification_code = NULL WHERE email = ?",
      [email]
    );

    return res.render("verify", {
      title: "Move - Verify",
      email: email,
      successMessage: "Verification successful! You will be redirected shortly.",
      errorMessage: null,
      verified: true,
    });
  } catch (error) {
    console.error("Error during verification:", error);
    res.status(500).render("verify", {
      title: "Move - Verify",
      email: email,
      errorMessage: "Internal Server Error",
      successMessage: null,
      verified: false,
    });
  } finally {
    if (connection) connection.release();
  }
});

// GET /login - Show login form
router.get("/login", (req, res) => {
  if (req.session.user) {
    return res.redirect("/move/about");
  }
  
  // Handle error query parameter (from Google OAuth deactivated account redirect)
  let errorMessage = null;
  if (req.query.error === "deactivated") {
    errorMessage = "Your account has been deactivated by an administrator. Please contact support for assistance.";
  }
  
  res.render("login", { title: "MoveOut - Login", errorMessage });
});

// POST /login - Handle login with account lockout security
router.post("/login", loginLimiter, async (req, res) => {
  const { email, psw } = req.body;
  let connection;
  
  const MAX_FAILED_ATTEMPTS = 5;
  const LOCKOUT_DURATION_MINUTES = 15;

  try {
    connection = await db.getConnection();
    const [users] = await connection.query("SELECT * FROM users WHERE email = ?", [email]);

    if (users.length === 0) {
      return res.status(400).render("login", {
        title: "MoveOut - Login",
        errorMessage: "User not found.",
      });
    }

    const user = users[0];

    // Check if account is locked
    if (user.locked_until) {
      const lockExpiry = new Date(user.locked_until);
      if (lockExpiry > new Date()) {
        const minutesLeft = Math.ceil((lockExpiry - new Date()) / (1000 * 60));
        return res.status(403).render("login", {
          title: "MoveOut - Login",
          errorMessage: `Account is locked due to too many failed attempts. Try again in ${minutesLeft} minute(s).`,
        });
      } else {
        // Lock expired, reset counters
        await connection.query(
          "UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE email = ?",
          [email]
        );
        user.failed_login_attempts = 0;
        user.locked_until = null;
      }
    }

    // Check if account is deactivated (handle both boolean and integer types)
    // Relaxed check: treat 1, true, "1", "true" as active
    const isActive = user.is_active == 1 || user.is_active === true || user.is_active === "true";
    console.log(`Login attempt for ${email}: is_active = ${user.is_active} (type: ${typeof user.is_active}), isActive = ${isActive}`);
    
    if (!isActive) {
      return res.status(403).render("login", {
        title: "MoveOut - Login",
        errorMessage: "Your account has been deactivated by an administrator. Please contact support for assistance.",
      });
    }

    const isValidPassword = await bcrypt.compare(psw, user.password_hash);
    if (!isValidPassword) {
      // Increment failed attempts
      const newAttempts = (user.failed_login_attempts || 0) + 1;
      
      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        // Lock the account
        const lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
        await connection.query(
          "UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE email = ?",
          [newAttempts, lockUntil.toISOString(), email]
        );
        return res.status(403).render("login", {
          title: "MoveOut - Login",
          errorMessage: `Too many failed attempts. Account locked for ${LOCKOUT_DURATION_MINUTES} minutes.`,
        });
      } else {
        await connection.query(
          "UPDATE users SET failed_login_attempts = ? WHERE email = ?",
          [newAttempts, email]
        );
        const attemptsLeft = MAX_FAILED_ATTEMPTS - newAttempts;
        return res.status(400).render("login", {
          title: "MoveOut - Login",
          errorMessage: `Invalid password. ${attemptsLeft} attempt(s) remaining before account lock.`,
        });
      }
    }

    // Successful login - reset failed attempts
    await connection.query(
      "UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE email = ?",
      [email]
    );

    // Create session
    req.session.user = {
      id: user.user_id,
      profileName: user.profile_name,
      email: user.email,
      isAdmin: user.is_admin,
    };

    // Track active session
    const adminRoutes = require("./admin");
    adminRoutes.addSession(req.sessionID, req.session.user);

    // Save session before redirect (important for external session stores)
    req.session.save((err) => {
      if (err) {
        console.error("Error saving session:", err);
        return res.status(500).render("login", {
          title: "MoveOut - Login",
          errorMessage: "Session error. Please try again.",
        });
      }
      res.redirect("/move/about");
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).render("login", {
      title: "MoveOut - Login",
      errorMessage: "Internal Server Error",
    });
  } finally {
    if (connection) connection.release();
  }
});

// GET /logout - Handle logout
router.get("/logout", (req, res) => {
  const sessionId = req.sessionID;
  
  // Remove from active sessions tracker
  const adminRoutes = require("./admin");
  adminRoutes.removeSession(sessionId);
  
  req.session.destroy((err) => {
    if (err) {
      console.error("Error during logout:", err);
    }
    res.clearCookie("connect.sid");
    res.redirect("/move/login");
  });
});

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
