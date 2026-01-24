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
const requireLogin = require("../middleware/requireLogin");
const boxController = require("../controllers/boxController");
const { secureUpload, handleUploadErrors } = require("../middleware/fileUploadSecurity");
const { uploadLimiter } = require("../middleware/rateLimiter");

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// GET /boxes - List all boxes for current user
router.get("/", requireLogin, boxController.getBoxes);

// GET /boxes/create - Show create box form
router.get("/create", requireLogin, boxController.getCreateBox);

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
  boxController.postCreateBox
);

// GET /boxes/view/:boxId - View a single box
router.get("/view/:boxId", requireLogin, boxController.getBox);

// GET /boxes/edit/:boxId - Show edit box form
router.get("/edit/:boxId", requireLogin, boxController.getEditBox);

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
  boxController.postEditBox
);

// POST /boxes/delete/:boxId - Delete a box
router.post("/delete/:boxId", requireLogin, boxController.deleteBox);

// POST /boxes/:boxId/labels/create - Create or update label
router.post("/:boxId/labels/create", requireLogin, boxController.createLabel);

module.exports = router;
