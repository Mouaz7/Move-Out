"use strict";
/**
 * Box Routes
 * Handles: CRUD operations for boxes, file uploads, labels
 */
const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const db = require("../config/db/database");
const cli = require("../src/cli");
const requireLogin = require("../middleware/requireLogin");
const { secureUpload, handleUploadErrors } = require("../middleware/fileUploadSecurity");
const { uploadLimiter } = require("../middleware/rateLimiter");

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// GET /boxes - List all boxes for current user
router.get("/", requireLogin, async (req, res) => {
  try {
    const boxes = await cli.getAllBoxes(req.user.id);
    res.render("all_boxes", { title: "All Boxes - MoveOut", boxes, user: req.user });
  } catch (error) {
    console.error("Error fetching boxes:", error);
    res.status(500).send("Error fetching boxes");
  }
});

// GET /boxes/create - Show create box form
router.get("/create", requireLogin, (req, res) => {
  res.render("create_box", { title: "Create Box - MoveOut", user: req.user });
});

// POST /boxes/create - Create new box
router.post(
  "/create",
  requireLogin,
  uploadLimiter,
  secureUpload.fields([
    { name: "labelImageFile", maxCount: 1 },
    { name: "contentFile", maxCount: 1 },
  ]),
  handleUploadErrors,
  async (req, res) => {
    const { boxName, labelImage, labelName, contentType, contentText, isPrivate, pinCode } = req.body;

    const labelImageFile = req.files?.["labelImageFile"]?.[0]?.filename || null;
    const contentFile = req.files?.["contentFile"]?.[0]?.filename || null;

    let connection;
    try {
      connection = await db.getConnection();
      
      // Calculate file size for storage tracking
      let fileSize = 0;
      if (contentFile) {
        const filePath = path.join(__dirname, "../uploads/", contentFile);
        const stats = fs.statSync(filePath);
        fileSize = stats.size;
      }

      // Get current storage usage
      const [users] = await connection.query(
        "SELECT storage_usage FROM users WHERE user_id = ?",
        [req.user.id]
      );

      if (!users || users.length === 0) {
        throw new Error("User not found");
      }

      const newStorageUsage = users[0].storage_usage + fileSize;
      
      // Update storage usage
      await connection.query(
        "UPDATE users SET storage_usage = ? WHERE user_id = ?",
        [newStorageUsage, req.user.id]
      );

      // Create box
      const boxId = await cli.createBox(
        req.user.id,
        boxName,
        labelName,
        labelImageFile || labelImage,
        contentType,
        contentText,
        contentFile,
        isPrivate === "on" ? 1 : 0,
        pinCode || null
      );

      res.redirect(`/move/boxes/view/${boxId}`);
    } catch (error) {
      console.error("Error creating box:", error);
      res.status(500).send("Error creating box");
    } finally {
      if (connection) connection.release();
    }
  }
);

// GET /boxes/view/:boxId - View a single box
router.get("/view/:boxId", requireLogin, async (req, res) => {
  try {
    const box = await cli.getBoxById(req.params.boxId, req.user.id);
    const contents = await cli.getBoxContents(req.params.boxId);
    
    if (box) {
      res.render("box_content", { 
        title: "Box Details - MoveOut", 
        box, 
        contents, 
        user: req.user 
      });
    } else {
      res.status(404).send("Box not found");
    }
  } catch (error) {
    console.error("Error fetching box:", error);
    res.status(500).send("Error fetching box");
  }
});

// GET /boxes/edit/:boxId - Show edit box form
router.get("/edit/:boxId", requireLogin, async (req, res) => {
  try {
    const box = await cli.getBoxById(req.params.boxId, req.user.id);
    if (!box) {
      return res.status(404).send("Box not found");
    }
    res.render("edit_box", { title: "Edit Box - MoveOut", box, user: req.user });
  } catch (error) {
    console.error("Error fetching box:", error);
    res.status(500).send("Error fetching box");
  }
});

// POST /boxes/edit/:boxId - Update box
router.post(
  "/edit/:boxId",
  requireLogin,
  uploadLimiter,
  secureUpload.fields([
    { name: "labelImageFile", maxCount: 1 },
    { name: "contentFile", maxCount: 1 },
  ]),
  handleUploadErrors,
  async (req, res) => {
    const { boxName, labelImage, label_name: labelName, contentType, content_data: contentText, isPrivate, pinCode } = req.body;
    const labelImageFile = req.files?.["labelImageFile"]?.[0]?.filename || null;
    const contentFile = req.files?.["contentFile"]?.[0]?.filename || null;

    let connection;
    try {
      connection = await db.getConnection();
      
      // Calculate file size
      let fileSize = 0;
      if (contentFile) {
        const filePath = path.join(__dirname, "../uploads/", contentFile);
        const stats = fs.statSync(filePath);
        fileSize = stats.size;
      }

      // Get current storage usage
      const [users] = await connection.query(
        "SELECT storage_usage FROM users WHERE user_id = ?",
        [req.user.id]
      );

      if (!users || users.length === 0) {
        return res.status(404).send("User not found");
      }

      const newStorageUsage = users[0].storage_usage + fileSize;

      // Update storage usage
      await connection.query(
        "UPDATE users SET storage_usage = ? WHERE user_id = ?",
        [newStorageUsage, req.user.id]
      );

      const contentData = contentType === "text" ? contentText : contentFile || contentText;

      // Update box
      const [result] = await connection.query(
        `UPDATE boxes SET box_name = ?, label_name = ?, label_image = ?, 
         content_type = ?, content_data = ?, is_private = ?, pin_code = ? 
         WHERE box_id = ? AND user_id = ?`,
        [
          boxName,
          labelName,
          labelImageFile || labelImage,
          contentType,
          contentData,
          isPrivate ? 1 : 0,
          pinCode,
          req.params.boxId,
          req.user.id
        ]
      );

      if (result.affectedRows === 0) {
        return res.status(404).send("Box not found or no permission");
      }

      res.redirect(`/move/boxes/view/${req.params.boxId}`);
    } catch (error) {
      console.error("Error editing box:", error);
      res.status(500).send("Error editing box");
    } finally {
      if (connection) connection.release();
    }
  }
);

// POST /boxes/delete/:boxId - Delete a box
router.post("/delete/:boxId", requireLogin, async (req, res) => {
  try {
    await cli.deleteBox(req.params.boxId, req.user.id);
    res.redirect("/move/boxes");
  } catch (error) {
    console.error("Error deleting box:", error);
    res.status(500).send("Error deleting box");
  }
});

// POST /boxes/:boxId/labels/create - Create or update label
router.post("/:boxId/labels/create", requireLogin, async (req, res) => {
  const { boxId } = req.params;
  const { labelName, isPrivate } = req.body;
  const isPrivateBool = isPrivate === "on";

  try {
    await cli.createOrUpdateLabel(null, labelName, isPrivateBool, boxId);
    res.redirect(`/move/boxes/view/${boxId}`);
  } catch (error) {
    console.error("Error creating/updating label:", error);
    res.status(500).send("Error creating/updating label");
  }
});

module.exports = router;
