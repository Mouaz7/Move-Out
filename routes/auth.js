"use strict";
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
require("dotenv").config();

const { pool, getConnection } = require("../config/db/database");
const { loginLimiter, registerLimiter, verificationLimiter } = require("../middleware/rateLimiter");
const {
  validateRegistration,
  validateLogin,
  validateVerificationCode,
  handleValidationErrors,
} = require("../middleware/validateInput");
const { auditLogger } = require("../middleware/auditLogger");

// Email transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Password validation helper
function validatePassword(password) {
  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
  return passwordRegex.test(password);
}

// GET /register
router.get("/register", (req, res) => {
  res.render("register", { title: "Move - Register", errorMessage: null });
});

// POST /register
router.post("/register", registerLimiter, validateRegistration, handleValidationErrors, async (req, res) => {
  const { name, email, psw, psw_repeat } = req.body;
  const isGmailUser = email.endsWith("@gmail.com");

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

  let client;
  try {
    client = await getConnection();
    const result = await client.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length > 0) {
      return res.status(400).render("register", {
        title: "Move - Register",
        errorMessage: "Email already registered.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(psw, salt);
    const isVerified = isGmailUser ? true : false;
    const verificationCode = isGmailUser ? null : Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpiry = isGmailUser ? null : new Date(Date.now() + 24 * 60 * 60 * 1000);

    await client.query(
      "INSERT INTO users (email, password_hash, profile_name, is_verified, verification_code, verification_code_expires_at) VALUES ($1, $2, $3, $4, $5, $6)",
      [email, hashedPassword, name, isVerified, verificationCode, verificationExpiry]
    );

    if (!isGmailUser) {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your MoveOut Verification Code",
        text: `Your verification code is: ${verificationCode}`,
      };
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log("Error sending email: ", error);
          return res.status(500).render("register", {
            title: "Move - Register",
            errorMessage: "Error sending verification email.",
          });
        }
        return res.render("verify", {
          title: "Move - Verify",
          email: email,
          successMessage: "Registration successful! Please enter the verification code sent to your email.",
          errorMessage: null,
          verified: false,
        });
      });
    } else {
      auditLogger.logRegistration(email, req.ip, true);
      res.redirect("/move/login");
    }
  } catch (error) {
    console.error("Error during registration process:", error);
    res.status(500).render("register", {
      title: "Move - Register",
      errorMessage: "Internal Server Error.",
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// GET /verify
router.get("/verify", (req, res) => {
  res.render("verify", {
    title: "Move - Verify",
    email: "",
    errorMessage: null,
    successMessage: null,
    verified: false,
  });
});

// POST /verify-code
router.post("/verify-code", verificationLimiter, validateVerificationCode, handleValidationErrors, async (req, res) => {
  const { email, verificationCode } = req.body;
  let client;

  try {
    client = await getConnection();
    const result = await client.query("SELECT * FROM users WHERE email = $1 AND verification_code = $2", [email, verificationCode]);

    if (result.rows.length === 0) {
      auditLogger.logEmailVerification(email, false);
      return res.status(400).render("verify", {
        title: "Move - Verify",
        email: email,
        errorMessage: "Invalid verification code.",
        successMessage: null,
        verified: false,
      });
    }

    const user = result.rows[0];

    if (user.verification_code_expires_at) {
      const now = new Date();
      const expiryDate = new Date(user.verification_code_expires_at);

      if (now > expiryDate) {
        return res.status(400).render("verify", {
          title: "Move - Verify",
          email: email,
          errorMessage: "Verification code has expired. Please request a new code.",
          successMessage: null,
          verified: false,
        });
      }
    }

    await client.query("UPDATE users SET is_verified = TRUE, verification_code = NULL, verification_code_expires_at = NULL WHERE email = $1", [email]);
    auditLogger.logEmailVerification(email, true);

    return res.render("verify", {
      title: "Move - Verify",
      email: email,
      successMessage: "Verification successful! You will be redirected to the About page shortly.",
      errorMessage: null,
      verified: true,
    });
  } catch (error) {
    console.error("Error during verification process:", error);
    res.status(500).render("verify", {
      title: "Move - Verify",
      email: email,
      errorMessage: "Internal Server Error",
      successMessage: null,
      verified: false,
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// GET /login
router.get("/login", (req, res) => {
  if (req.session.user) {
    return res.redirect("/move/about");
  }
  res.render("login", { title: "MoveOut - Login", errorMessage: null });
});

// POST /login
router.post("/login", loginLimiter, validateLogin, handleValidationErrors, async (req, res) => {
  const { email, psw } = req.body;
  let client;

  try {
    client = await getConnection();
    const result = await client.query("SELECT * FROM users WHERE email = $1", [email]);

    if (result.rows.length === 0) {
      auditLogger.logFailedLogin(email, req.ip, 'User not found');
      return res.status(400).render("login", {
        title: "MoveOut - Login",
        errorMessage: "User not found.",
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      auditLogger.logFailedLogin(email, req.ip, 'Account deactivated');
      return res.status(400).render("login", {
        title: "MoveOut - Login",
        errorMessage: "Your account is deactivated. Please contact support to reactivate.",
      });
    }

    const isValidPassword = await bcrypt.compare(psw, user.password_hash);

    if (!isValidPassword) {
      auditLogger.logFailedLogin(email, req.ip, 'Invalid password');
      return res.status(400).render("login", {
        title: "MoveOut - Login",
        errorMessage: "Invalid password.",
      });
    }

    req.session.user = {
      id: user.user_id,
      profileName: user.profile_name,
      email: user.email,
      isAdmin: user.is_admin,
    };

    auditLogger.logSuccessfulLogin(user.user_id, user.email, req.ip);

    res.render("about", {
      title: "MoveOut - About",
      user: req.session.user,
    });
  } catch (error) {
    console.error("Error during login process:", error);
    res.status(500).render("login", {
      title: "MoveOut - Login",
      errorMessage: "Internal Server Error",
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// GET /logout
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.render("login", {
        title: "MoveOut - Login",
        errorMessage: "Internal Server Error",
      });
    }
    res.clearCookie("connect.sid");
    res.redirect("/move/login");
  });
});

module.exports = router;
