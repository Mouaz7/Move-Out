"use strict";
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const moment = require("moment");
require("dotenv").config();
const QRCode = require("qrcode");

// Use the database abstraction layer instead of direct MySQL
const { getConnection } = require("../config/db/database");

// Configure nodemailer for email with timeout settings
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

// Send verification email
async function sendVerificationEmail(toEmail, token) {
  const baseUrl = process.env.BASE_URL || 
    (process.env.NODE_ENV === "production" ? "https://move-out.onrender.com" : "http://localhost:1338");
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

// Login and User creation functions removed (unused and duplicated in auth routes)

// Get all users
async function getAllUsers() {
  let connection;
  try {
    connection = await getConnection();
    const [users] = await connection.query("SELECT user_id, email, profile_name, is_active, last_activity, created_at, storage_usage FROM users");
    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

// Activate a user
async function activateUser(userId) {
  let connection;
  try {
    connection = await getConnection();
    await connection.query("UPDATE users SET is_active = TRUE WHERE user_id = ?", [userId]);
  } catch (error) {
    console.error("Error activating user:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

// Deactivate a user
async function deactivateUser(userId) {
  let connection;
  try {
    connection = await getConnection();
    await connection.query("UPDATE users SET is_active = FALSE WHERE user_id = ?", [userId]);
  } catch (error) {
    console.error("Error deactivating user:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

// Toggle user active status
async function toggleUserStatus(userId) {
  let connection;
  try {
    connection = await getConnection();
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

// Delete user and associated files
async function deleteUser(userId) {
  let connection;
  try {
    connection = await getConnection();

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
        const labelImagePath = path.join(__dirname, "../public/style/images", `${labelImage}`);

        console.log(`Label image to be deleted: ${labelImagePath}`);

        fs.unlink(labelImagePath, (err) => {
          if (err) {
            console.error(`Error deleting label image: ${labelImage}. It may not exist.`, err);
          } else {
            console.log(`Label image deleted successfully: ${labelImage}`);
          }
        });
      } else {
        console.warn(`Label image does not start with 'labelImageFile' or is undefined for box: ${JSON.stringify(box)}`);
      }

      // Handle content data files
      const contentFile = box.content_data;

      if (contentFile) {
        const fileName = contentFile.trim();
        if (fileName) {
          const filePath = path.join(__dirname, "../uploads", `${fileName}`);

          console.log(`File to be deleted: ${filePath}`);

          fs.unlink(filePath, (err) => {
            if (err) {
              console.error(`Error deleting file: ${fileName}. It may not exist.`, err);
            } else {
              console.log(`File deleted successfully: ${fileName}`);
            }
          });
        } else {
          console.warn(`Could not extract file name from: ${contentFile}`);
        }
      } else {
        console.warn(`ContentFile is undefined or empty for box: ${JSON.stringify(box)}`);
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

// Send marketing emails to active users
async function sendMarketingEmails(subject, message) {
  let connection;
  try {
    connection = await getConnection();
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

// Deactivate users who have been inactive for a month
async function deactivateInactiveUsers() {
  let connection;
  try {
    connection = await getConnection();
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
  let connection;
  try {
    connection = await getConnection();

    // Set content based on contentType
    const contentData = contentType === "text" ? contentText : contentFile;

    // Generate a unique access token
    const accessToken = crypto.randomBytes(16).toString("hex");

    // Save the box to the database
    const [result] = await connection.query("INSERT INTO boxes (user_id, box_name, label_name, label_image, content_type, content_data, access_token,is_private, pin_code) VALUES (?, ?, ?, ?, ?, ?, ?,?,?)", [userId, boxName, labelName, labelImage, contentType, contentData, accessToken, isPrivate, pinCode]);
    const boxId = result.insertId;

    // Create URL for the box - use production URL if in production mode
    const baseUrl = process.env.BASE_URL || 
      (process.env.NODE_ENV === "production" ? "https://move-out.onrender.com" : "http://localhost:1338");
    const boxUrl = `${baseUrl}/move/boxes/qr/${accessToken}`;

    // Generate the QR code
    const qrCodeDataUrl = await generateQRCode(boxUrl);

    // Update the box with the QR code
    await connection.query("UPDATE boxes SET qr_code = ? WHERE box_id = ?", [qrCodeDataUrl, boxId]);

    return boxId; // Return boxId for use after creation
  } catch (error) {
    console.error("Error creating box:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

// Get box by access token
async function getBoxByToken(accessToken) {
  let connection;
  try {
    connection = await getConnection();
    const [rows] = await connection.query("SELECT * FROM boxes WHERE access_token = ?", [accessToken]);
    return rows.length ? rows[0] : null;
  } catch (error) {
    console.error("Error fetching box by token:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

// Get box by ID
async function getBoxById(boxId, userId) {
  let connection;
  try {
    connection = await getConnection();
    const [rows] = await connection.query("SELECT * FROM boxes WHERE box_id = ? AND user_id = ?", [boxId, userId]);
    return rows.length ? rows[0] : null;
  } catch (error) {
    console.error("Error fetching box by ID:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

// Get contents of a box
async function getBoxContents(boxId) {
  let connection;
  try {
    connection = await getConnection();
    const [contents] = await connection.query("SELECT * FROM box_contents WHERE box_id = ?", [boxId]);
    return contents;
  } catch (error) {
    console.error("Error fetching box contents:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

// Add content to a box
async function addBoxContent(boxId, contentType, contentData, contentUrl) {
  let connection;
  try {
    connection = await getConnection();
    await connection.query("INSERT INTO box_contents (box_id, content_type, content_data, content_url) VALUES (?, ?, ?, ?)", [boxId, contentType, contentData, contentUrl]);
  } catch (error) {
    console.error("Error adding box content:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

// Get all boxes for a user
async function getAllBoxes(userId) {
  let connection;
  try {
    connection = await getConnection();
    const [boxes] = await connection.query("SELECT * FROM boxes WHERE user_id = ?", [userId]);
    return boxes;
  } catch (error) {
    console.error("Error fetching boxes:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

// Update a box
async function updateBox(boxId, userId, boxName, labelDesign) {
  let connection;
  try {
    connection = await getConnection();
    await connection.query("UPDATE boxes SET box_name = ?, label_design = ? WHERE box_id = ? AND user_id = ?", [boxName, labelDesign, boxId, userId]);
  } catch (error) {
    console.error("Error updating box:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

// Delete a box
async function deleteBox(boxId, userId) {
  let connection;
  try {
    connection = await getConnection();
    await connection.query("DELETE FROM boxes WHERE box_id = ? AND user_id = ?", [boxId, userId]);
  } catch (error) {
    console.error("Error deleting box:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

// Create or update a label
async function createOrUpdateLabel(labelId, labelName, isPrivate, boxId) {
  let connection;
  try {
    connection = await getConnection();
    const pinCode = isPrivate ? generateSixDigitPin() : null;

    if (labelId) {
      // Update existing label
      await connection.query("UPDATE labels SET label_name = ?, is_private = ?, pin_code = ? WHERE label_id = ?", [labelName, isPrivate, pinCode, labelId]);
    } else {
      // Create new label
      const [result] = await connection.query("INSERT INTO labels (label_name, is_private, pin_code, box_id) VALUES (?, ?, ?, ?)", [labelName, isPrivate, pinCode, boxId]);
      return result.insertId;
    }
  } catch (error) {
    console.error("Error creating/updating label:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

// Validate PIN code for a label
async function validateLabelPin(labelId, pinCode) {
  let connection;
  try {
    connection = await getConnection();
    const [rows] = await connection.query("SELECT * FROM labels WHERE label_id = ? AND pin_code = ? AND is_private = 1", [labelId, pinCode]);

    return rows.length > 0;
  } catch (error) {
    console.error("Error validating label PIN:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

// Generate six-digit PIN code
function generateSixDigitPin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Export all functions
module.exports = {
  // User functions
  // User functions
  getAllUsers,
  activateUser,
  deactivateUser,
  toggleUserStatus,
  deleteUser,
  sendMarketingEmails,
  sendVerificationEmail,
  deactivateInactiveUsers,
  deleteUser,
  sendMarketingEmails,
  sendVerificationEmail,
  deactivateInactiveUsers,

  // Box functions
  createBox,
  addBoxContent,
  getBoxById,
  getBoxByToken,
  getAllBoxes,
  getBoxContents,
  updateBox,
  deleteBox,

  // Other functions
  generateQRCode,
  createOrUpdateLabel,
  validateLabelPin,

};
