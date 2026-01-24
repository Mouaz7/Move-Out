"use strict";
const path = require("path");
const fs = require("fs");
const moment = require("moment");
const db = require("../../config/db/database");
const { transporter } = require("./emailService");
require("dotenv").config();

/**
 * Find user by email
 * @param {string} email 
 * @returns {Promise<Object|null>}
 */
async function findUserByEmail(email) {
  let connection;
  try {
    connection = await db.getConnection();
    const [users] = await connection.query("SELECT * FROM users WHERE email = ?", [email]);
    return users.length > 0 ? users[0] : null;
  } catch (error) {
    console.error("Error finding user by email:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Create new user
 * @param {Object} userData 
 * @returns {Promise<number>} insertId
 */
async function createUser({ email, passwordHash, profileName, isVerified, verificationCode }) {
  let connection;
  try {
    connection = await db.getConnection();
    const [result] = await connection.query(
      "INSERT INTO users (email, password_hash, profile_name, is_verified, verification_code) VALUES (?, ?, ?, ?, ?)",
      [email, passwordHash, profileName, isVerified, verificationCode]
    );
    return result.insertId;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Update user verification status
 * @param {string} email 
 */
async function markUserAsVerified(email) {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.query(
      "UPDATE users SET is_verified = 1, verification_code = NULL WHERE email = ?",
      [email]
    );
  } catch (error) {
    console.error("Error verifying user:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Get all users
 * @returns {Promise<Array>}
 */
async function getAllUsers() {
  let connection;
  try {
    connection = await db.getConnection();
    const [users] = await connection.query("SELECT user_id, email, profile_name, is_active, last_activity, created_at, storage_usage FROM users");
    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Activate a user
 * @param {number} userId 
 */
async function activateUser(userId) {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.query("UPDATE users SET is_active = TRUE WHERE user_id = ?", [userId]);
  } catch (error) {
    console.error("Error activating user:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Deactivate a user
 * @param {number} userId 
 */
async function deactivateUser(userId) {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.query("UPDATE users SET is_active = FALSE WHERE user_id = ?", [userId]);
  } catch (error) {
    console.error("Error deactivating user:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Toggle user active status
 * @param {number} userId 
 */
async function toggleUserStatus(userId) {
  let connection;
  try {
    connection = await db.getConnection();
    const [users] = await connection.query("SELECT user_id, email, is_active FROM users WHERE user_id = ?", [userId]);
    
    if (!users || users.length === 0) {
      throw new Error("User not found.");
    }
    
    const user = users[0];
    const adminEmail = process.env.ADMIN_EMAIL || 'mouaz.naji.dev@gmail.com';
    
    // SAFETY: Prevent deactivating the main admin
    if (user.email === adminEmail && (user.is_active == 1 || user.is_active === true)) {
       throw new Error("Cannot deactivate the main administrator account.");
    }

    // Explicitly handle status toggle for both SQLite (1/0) and Postgres (true/false)
    const isCurrentlyActive = user.is_active == 1 || user.is_active === true || user.is_active === "true";
    const newStatus = isCurrentlyActive ? 0 : 1;
    
    const now = new Date();
    const currentTime = moment(now).format("YYYY-MM-DD HH:mm:ss");

    await connection.query("UPDATE users SET is_active = ?, last_activity = ? WHERE user_id = ?", [newStatus, currentTime, userId]);
  } catch (error) {
    console.error("Error toggling user status:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Delete user and associated files
 * @param {number} userId 
 */
async function deleteUser(userId) {
  let connection;
  try {
    connection = await db.getConnection();

    // Check if user is admin before deleting
    const [user] = await connection.query("SELECT email FROM users WHERE user_id = ?", [userId]);
    const adminEmail = process.env.ADMIN_EMAIL || 'mouaz.naji.dev@gmail.com';
    
    if (user && user.length > 0 && user[0].email === adminEmail) {
      throw new Error("Cannot delete the administrator account.");
    }

    const [boxes] = await connection.query("SELECT label_image, content_data FROM boxes WHERE user_id = ?", [userId]);

    // Check and delete label images
    boxes.forEach((box) => {
      const labelImage = box.label_image;

      if (labelImage && labelImage.startsWith("labelImageFile")) {
        // Resolve path relative to this service file: ../../../public/style/images ? 
        // Service is in src/services, so go up two levels to root, then public 
        // Now we are in src/services/userService.js. So path is ../../public
        const labelImagePath = path.join(__dirname, "../../public/style/images", `${labelImage}`);

        console.log(`Label image to be deleted: ${labelImagePath}`);

        fs.unlink(labelImagePath, (err) => {
          if (err) {
            console.error(`Error deleting label image: ${labelImage}. It may not exist.`, err);
          } else {
            console.log(`Label image deleted successfully: ${labelImage}`);
          }
        });
      } else {
        // console.warn(`Label image does not start with 'labelImageFile' or is undefined for box: ${JSON.stringify(box)}`);
      }

      // Handle content data files
      const contentFile = box.content_data;

      if (contentFile) {
        const fileName = contentFile.trim();
        if (fileName) {
          // Path relative to src/services/userService.js -> ../../uploads
          const filePath = path.join(__dirname, "../../uploads", `${fileName}`);

          console.log(`File to be deleted: ${filePath}`);

          fs.unlink(filePath, (err) => {
            if (err) {
              console.error(`Error deleting file: ${fileName}. It may not exist.`, err);
            } else {
              console.log(`File deleted successfully: ${fileName}`);
            }
          });
        }
      }
    });

    await connection.query("DELETE FROM boxes WHERE user_id = ?", [userId]);
    await connection.query("DELETE FROM users WHERE user_id = ?", [userId]);
    console.log(`Successfully deleted user with ID: ${userId} and associated files.`);
  } catch (error) {
    console.error("Error deleting user and related files:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Deactivate users who have been inactive for a month
 */
async function deactivateInactiveUsers() {
  let connection;
  try {
    connection = await db.getConnection();
    const oneMonthAgo = moment().subtract(1, "months").format("YYYY-MM-DD HH:mm:ss");

    const adminEmail = process.env.ADMIN_EMAIL || 'mouaz.naji.dev@gmail.com';
    const [usersToDeactivate] = await connection.query("SELECT * FROM users WHERE last_activity < ? AND is_active = TRUE AND email != ?", [oneMonthAgo, adminEmail]);

    // Handle empty or undefined results
    if (!usersToDeactivate || !Array.isArray(usersToDeactivate) || usersToDeactivate.length === 0) {
      console.log("No inactive users to deactivate");
      return;
    }

    console.log(`Found ${usersToDeactivate.length} inactive users to deactivate`);

    for (const user of usersToDeactivate) {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "Account Deactivation Warning",
        text: "Your account has been inactive for a month. Please log in to avoid deactivation.",
      };

      try {
        await transporter.sendMail(mailOptions);
      } catch (err) {
        console.error(`Failed to send email to: ${user.email}`, err.message);
      }

      await connection.query("UPDATE users SET is_active = FALSE WHERE user_id = ?", [user.user_id]);
    }
    console.log("Inactive users deactivated successfully");
  } catch (error) {
    console.error("Error deactivating inactive users:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Send marketing emails to active users
 * @param {string} subject
 * @param {string} message
 */
async function sendMarketingEmails(subject, message) {
  let connection;
  try {
    connection = await db.getConnection();
    const [users] = await connection.query("SELECT email FROM users WHERE is_active = TRUE");

    for (const user of users) {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject,
        text: message,
      };
      try {
        await transporter.sendMail(mailOptions);
      } catch (error) {
        console.error(`Failed to send email to: ${user.email}`, error);
      }
    }
  } catch (error) {
    console.error("Error sending marketing emails:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Update user storage usage
 * @param {number} userId
 * @param {number} bytesToAdd - Positive to add, negative to subtract
 */
async function updateStorageUsage(userId, bytesToAdd) {
  let connection;
  try {
    connection = await db.getConnection();
    const [users] = await connection.query("SELECT storage_usage FROM users WHERE user_id = ?", [userId]);
    
    if (!users || users.length === 0) throw new Error("User not found");
    
    const newUsage = Math.max(0, (users[0].storage_usage || 0) + bytesToAdd);
    
    await connection.query("UPDATE users SET storage_usage = ? WHERE user_id = ?", [newUsage, userId]);
  } catch (error) {
    console.error("Error updating storage usage:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

module.exports = {
  findUserByEmail,
  createUser,
  markUserAsVerified,
  getAllUsers,
  activateUser,
  deactivateUser,
  toggleUserStatus,
  deleteUser,
  deactivateInactiveUsers,
  updateStorageUsage,
  sendMarketingEmails,
};
