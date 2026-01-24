"use strict";
const crypto = require("crypto");
const { generateQRCode } = require("./qrService");
const db = require("../../config/db/database");
require("dotenv").config();

// Helper for generating 6-digit PIN
function generateSixDigitPin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Create a new box
 */
async function createBox(userId, boxName, labelName, labelImage, contentType, contentText, contentFile, isPrivate, pinCode) {
  let connection;
  try {
    connection = await db.getConnection();

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

    // Generate the QR code using qrService
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

async function getBoxByToken(accessToken) {
  let connection;
  try {
    connection = await db.getConnection();
    const [rows] = await connection.query("SELECT * FROM boxes WHERE access_token = ?", [accessToken]);
    return rows.length ? rows[0] : null;
  } catch (error) {
    console.error("Error fetching box by token:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

async function getBoxById(boxId, userId) {
  let connection;
  try {
    connection = await db.getConnection();
    const [rows] = await connection.query("SELECT * FROM boxes WHERE box_id = ? AND user_id = ?", [boxId, userId]);
    return rows.length ? rows[0] : null;
  } catch (error) {
    console.error("Error fetching box by ID:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

async function getBoxContents(boxId) {
  let connection;
  try {
    connection = await db.getConnection();
    const [contents] = await connection.query("SELECT * FROM box_contents WHERE box_id = ?", [boxId]);
    return contents;
  } catch (error) {
    console.error("Error fetching box contents:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

async function addBoxContent(boxId, contentType, contentData, contentUrl) {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.query("INSERT INTO box_contents (box_id, content_type, content_data, content_url) VALUES (?, ?, ?, ?)", [boxId, contentType, contentData, contentUrl]);
  } catch (error) {
    console.error("Error adding box content:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

async function getAllBoxes(userId) {
  let connection;
  try {
    connection = await db.getConnection();
    const [boxes] = await connection.query("SELECT * FROM boxes WHERE user_id = ?", [userId]);
    return boxes;
  } catch (error) {
    console.error("Error fetching boxes:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

async function updateBoxFull(boxId, userId, boxName, labelName, labelImage, contentType, contentData, isPrivate, pinCode) {
  let connection;
  try {
    connection = await db.getConnection();
    const [result] = await connection.query(
      `UPDATE boxes SET box_name = ?, label_name = ?, label_image = ?, 
       content_type = ?, content_data = ?, is_private = ?, pin_code = ? 
       WHERE box_id = ? AND user_id = ?`,
      [boxName, labelName, labelImage, contentType, contentData, isPrivate, pinCode, boxId, userId]
    );
  } catch (error) {
    console.error("Error updating box:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

async function updateBox(boxId, userId, boxName, labelDesign) {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.query("UPDATE boxes SET box_name = ?, label_design = ? WHERE box_id = ? AND user_id = ?", [boxName, labelDesign, boxId, userId]);
  } catch (error) {
    console.error("Error updating box:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

async function deleteBox(boxId, userId) {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.query("DELETE FROM boxes WHERE box_id = ? AND user_id = ?", [boxId, userId]);
  } catch (error) {
    console.error("Error deleting box:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

async function createOrUpdateLabel(labelId, labelName, isPrivate, boxId) {
  let connection;
  try {
    connection = await db.getConnection();
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

async function validateLabelPin(labelId, pinCode) {
  let connection;
  try {
    connection = await db.getConnection();
    const [rows] = await connection.query("SELECT * FROM labels WHERE label_id = ? AND pin_code = ? AND is_private = 1", [labelId, pinCode]);

    return rows.length > 0;
  } catch (error) {
    console.error("Error validating label PIN:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

module.exports = {
  createBox,
  addBoxContent,
  getBoxById,
  getBoxByToken,
  getAllBoxes,
  getBoxContents,
  updateBox,
  updateBoxFull,
  deleteBox,
  createOrUpdateLabel,
  validateLabelPin,
};
