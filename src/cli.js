"use strict";
const { pool, getConnection } = require("../config/db/database");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const moment = require("moment");
require("dotenv").config();
const QRCode = require("qrcode");

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Send verification email
async function sendVerificationEmail(toEmail, token) {
  const baseUrl = process.env.BASE_URL || "http://localhost:1338";
  const verificationLink = `${baseUrl}/verify-email?token=${token}`;
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject: "Verify Your Email for MoveOut",
    html: `<p>Please click on the following link to verify your email: <a href="${verificationLink}">${verificationLink}</a></p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw new Error("Failed to send verification email.");
  }
}

// Create a new user
async function createUser(name, email, password) {
  let client;
  try {
    client = await getConnection();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const token = crypto.randomBytes(32).toString("hex");

    await client.query("INSERT INTO users (profile_name, email, password_hash, verification_token) VALUES ($1, $2, $3, $4)", [name, email, hashedPassword, token]);
    await sendVerificationEmail(email, token);
  } catch (error) {
    console.error("Error creating user:", error);
    throw new Error("Error creating user.");
  } finally {
    if (client) client.release();
  }
}

// Verify user
async function verifyUser(token) {
  let client;
  try {
    client = await getConnection();
    const result = await client.query("SELECT * FROM users WHERE verification_token = $1", [token]);

    if (result.rows.length > 0) {
      await client.query("UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE verification_token = $1", [token]);
    } else {
      throw new Error("Verification token is invalid.");
    }
  } catch (error) {
    console.error("Error verifying user:", error);
    throw new Error("Error verifying user.");
  } finally {
    if (client) client.release();
  }
}

// Login user
async function loginUser(email, password) {
  let client;
  try {
    client = await getConnection();
    const result = await client.query("SELECT * FROM users WHERE email = $1", [email]);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (isValid) {
        await client.query("UPDATE users SET last_activity = CURRENT_TIMESTAMP WHERE user_id = $1", [user.user_id]);
        return { success: true, user: { id: user.user_id, profile_name: user.profile_name } };
      } else {
        return { success: false, message: "Invalid password." };
      }
    } else {
      return { success: false, message: "User not found." };
    }
  } catch (error) {
    console.error("Error logging in:", error);
    throw new Error("Error during login.");
  } finally {
    if (client) client.release();
  }
}

// Get all users
async function getAllUsers() {
  let client;
  try {
    client = await getConnection();
    const result = await client.query("SELECT user_id, email, profile_name, is_active, last_activity, created_at, storage_usage FROM users");
    return result.rows;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  } finally {
    if (client) client.release();
  }
}

// Activate user
async function activateUser(userId) {
  let client;
  try {
    client = await getConnection();
    await client.query("UPDATE users SET is_active = TRUE WHERE user_id = $1", [userId]);
  } catch (error) {
    console.error("Error activating user:", error);
    throw error;
  } finally {
    if (client) client.release();
  }
}

// Deactivate user
async function deactivateUser(userId) {
  let client;
  try {
    client = await getConnection();
    await client.query("UPDATE users SET is_active = FALSE WHERE user_id = $1", [userId]);
  } catch (error) {
    console.error("Error deactivating user:", error);
    throw error;
  } finally {
    if (client) client.release();
  }
}

// Toggle user status
async function toggleUserStatus(userId) {
  let client;
  try {
    client = await getConnection();
    const result = await client.query("SELECT is_active FROM users WHERE user_id = $1", [userId]);
    const user = result.rows[0];
    const newStatus = !user.is_active;
    const currentTime = moment().format("YYYY-MM-DD HH:mm:ss");
    await client.query("UPDATE users SET is_active = $1, last_activity = $2 WHERE user_id = $3", [newStatus, currentTime, userId]);
  } catch (error) {
    console.error("Error toggling user status:", error);
    throw error;
  } finally {
    if (client) client.release();
  }
}

// Delete user
async function deleteUser(userId) {
  let client;
  try {
    client = await getConnection();
    const result = await client.query("SELECT label_image, content_data FROM boxes WHERE user_id = $1", [userId]);

    result.rows.forEach((box) => {
      if (box.label_image && box.label_image.startsWith("labelImageFile")) {
        const labelImagePath = path.join(__dirname, "../public/style/images", box.label_image);
        fs.unlink(labelImagePath, (err) => {
          if (err) console.error(`Error deleting label image: ${box.label_image}`, err);
        });
      }
      if (box.content_data) {
        const filePath = path.join(__dirname, "../uploads", box.content_data.trim());
        fs.unlink(filePath, (err) => {
          if (err) console.error(`Error deleting file: ${box.content_data}`, err);
        });
      }
    });

    await client.query("DELETE FROM boxes WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM users WHERE user_id = $1", [userId]);
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  } finally {
    if (client) client.release();
  }
}

// Send marketing emails
async function sendMarketingEmails(subject, message) {
  let client;
  try {
    client = await getConnection();
    const result = await client.query("SELECT email FROM users WHERE is_active = TRUE");

    for (const user of result.rows) {
      try {
        await transporter.sendMail({ from: process.env.EMAIL_USER, to: user.email, subject, text: message });
      } catch (error) {
        console.error(`Failed to send email to: ${user.email}`, error);
      }
    }
  } catch (error) {
    console.error("Error sending marketing emails:", error);
    throw error;
  } finally {
    if (client) client.release();
  }
}

// Deactivate inactive users
async function deactivateInactiveUsers() {
  let client;
  try {
    client = await getConnection();
    const oneMonthAgo = moment().subtract(1, "months").format("YYYY-MM-DD HH:mm:ss");
    const result = await client.query("SELECT * FROM users WHERE last_activity < $1 AND is_active = TRUE", [oneMonthAgo]);

    for (const user of result.rows) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: "Account Deactivation Warning",
          text: "Your account has been inactive for a month.",
        });
      } catch (err) {
        console.error(`Failed to send email to: ${user.email}`, err);
      }
      await client.query("UPDATE users SET is_active = FALSE WHERE user_id = $1", [user.user_id]);
    }
  } catch (error) {
    console.error("Error deactivating inactive users:", error);
    throw error;
  } finally {
    if (client) client.release();
  }
}

// Generate QR code
async function generateQRCode(text) {
  try {
    return await QRCode.toDataURL(text);
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw error;
  }
}

// Create a new box
async function createBox(userId, boxName, labelName, labelImage, contentType, contentText, contentFile, isPrivate, pinCode) {
  let client;
  try {
    client = await getConnection();
    const contentData = contentType === "text" ? contentText : contentFile;
    const accessToken = crypto.randomBytes(16).toString("hex");

    const result = await client.query(
      "INSERT INTO boxes (user_id, box_name, label_name, label_image, content_type, content_data, access_token, is_private, pin_code) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING box_id",
      [userId, boxName, labelName, labelImage, contentType, contentData, accessToken, isPrivate, pinCode]
    );
    const boxId = result.rows[0].box_id;

    const baseUrl = process.env.BASE_URL || "http://localhost:1338";
    const boxUrl = `${baseUrl}/move/boxes/qr/${accessToken}`;
    const qrCodeDataUrl = await generateQRCode(boxUrl);

    await client.query("UPDATE boxes SET qr_code = $1 WHERE box_id = $2", [qrCodeDataUrl, boxId]);
    return boxId;
  } catch (error) {
    console.error("Error creating box:", error);
    throw error;
  } finally {
    if (client) client.release();
  }
}

// Get box by token
async function getBoxByToken(accessToken) {
  let client;
  try {
    client = await getConnection();
    const result = await client.query("SELECT * FROM boxes WHERE access_token = $1", [accessToken]);
    return result.rows.length ? result.rows[0] : null;
  } catch (error) {
    console.error("Error fetching box by token:", error);
    throw error;
  } finally {
    if (client) client.release();
  }
}

// Get box by ID
async function getBoxById(boxId, userId) {
  let client;
  try {
    client = await getConnection();
    const result = await client.query("SELECT * FROM boxes WHERE box_id = $1 AND user_id = $2", [boxId, userId]);
    return result.rows.length ? result.rows[0] : null;
  } catch (error) {
    console.error("Error fetching box by ID:", error);
    throw error;
  } finally {
    if (client) client.release();
  }
}

// Get box contents
async function getBoxContents(boxId) {
  let client;
  try {
    client = await getConnection();
    const result = await client.query("SELECT * FROM box_contents WHERE box_id = $1", [boxId]);
    return result.rows;
  } catch (error) {
    console.error("Error fetching box contents:", error);
    throw error;
  } finally {
    if (client) client.release();
  }
}

// Add box content
async function addBoxContent(boxId, contentType, contentData, contentUrl) {
  let client;
  try {
    client = await getConnection();
    await client.query("INSERT INTO box_contents (box_id, content_type, content_data, content_url) VALUES ($1, $2, $3, $4)", [boxId, contentType, contentData, contentUrl]);
  } catch (error) {
    console.error("Error adding box content:", error);
    throw error;
  } finally {
    if (client) client.release();
  }
}

// Get all boxes for a user
async function getAllBoxes(userId) {
  let client;
  try {
    client = await getConnection();
    const result = await client.query("SELECT * FROM boxes WHERE user_id = $1", [userId]);
    return result.rows;
  } catch (error) {
    console.error("Error fetching boxes:", error);
    throw error;
  } finally {
    if (client) client.release();
  }
}

// Update box
async function updateBox(boxId, userId, boxName, labelDesign) {
  let client;
  try {
    client = await getConnection();
    await client.query("UPDATE boxes SET box_name = $1, label_design = $2 WHERE box_id = $3 AND user_id = $4", [boxName, labelDesign, boxId, userId]);
  } catch (error) {
    console.error("Error updating box:", error);
    throw error;
  } finally {
    if (client) client.release();
  }
}

// Delete box
async function deleteBox(boxId, userId) {
  let client;
  try {
    client = await getConnection();
    await client.query("DELETE FROM boxes WHERE box_id = $1 AND user_id = $2", [boxId, userId]);
  } catch (error) {
    console.error("Error deleting box:", error);
    throw error;
  } finally {
    if (client) client.release();
  }
}

// Create or update label
async function createOrUpdateLabel(labelId, labelName, isPrivate, boxId) {
  let client;
  try {
    client = await getConnection();
    const pinCode = isPrivate ? generateSixDigitPin() : null;

    if (labelId) {
      await client.query("UPDATE labels SET label_name = $1, is_private = $2, pin_code = $3 WHERE label_id = $4", [labelName, isPrivate, pinCode, labelId]);
    } else {
      const result = await client.query("INSERT INTO labels (label_name, is_private, pin_code) VALUES ($1, $2, $3) RETURNING label_id", [labelName, isPrivate, pinCode]);
      return result.rows[0].label_id;
    }
  } catch (error) {
    console.error("Error creating/updating label:", error);
    throw error;
  } finally {
    if (client) client.release();
  }
}

// Validate label PIN
async function validateLabelPin(labelId, pinCode) {
  let client;
  try {
    client = await getConnection();
    const result = await client.query("SELECT * FROM labels WHERE label_id = $1 AND pin_code = $2 AND is_private = TRUE", [labelId, pinCode]);
    return result.rows.length > 0;
  } catch (error) {
    console.error("Error validating label PIN:", error);
    throw error;
  } finally {
    if (client) client.release();
  }
}

// Generate six-digit PIN
function generateSixDigitPin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = {
  createUser, verifyUser, loginUser, getAllUsers,
  activateUser, deactivateUser, toggleUserStatus, deleteUser,
  sendMarketingEmails, sendVerificationEmail, deactivateInactiveUsers,
  createBox, addBoxContent, getBoxById, getBoxByToken,
  getAllBoxes, getBoxContents, updateBox, deleteBox,
  generateQRCode, createOrUpdateLabel, validateLabelPin,
};
