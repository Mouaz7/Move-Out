"use strict";
const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const { pool, getConnection } = require("../config/db/database");
const cli = require("../src/cli");
const requireLogin = require("../middleware/requireLogin");

// Set up uploads directory
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Allowed MIME types for security
const allowedImageMimes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
const allowedFileMimes = [
  "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
  "application/pdf", "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// File filter for security
const fileFilter = (req, file, cb) => {
  const isLabelImage = file.fieldname === "labelImageFile";
  const allowedMimes = isLabelImage ? allowedImageMimes : allowedFileMimes;
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type.`), false);
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "labelImageFile") {
      cb(null, path.join(__dirname, "../public/style/images"));
    } else {
      cb(null, uploadsDir);
    }
  },
  filename: (req, file, cb) => {
    const sanitizedOriginalName = path.basename(file.originalname);
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const ext = path.extname(sanitizedOriginalName);
    const safeFilename = `${file.fieldname}-${timestamp}-${randomString}${ext}`;
    cb(null, safeFilename);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 2 },
  fileFilter: fileFilter,
});

// GET /boxes
router.get("/", requireLogin, async (req, res) => {
  try {
    const boxes = await cli.getAllBoxes(req.user.id);
    res.render("all_boxes", { title: "All Boxes - MoveOut", boxes, user: req.user });
  } catch (error) {
    console.error("Error fetching boxes:", error);
    res.status(500).send("Error fetching boxes");
  }
});

// GET /boxes/create
router.get("/create", requireLogin, (req, res) => {
  res.render("create_box", { title: "Create Box - MoveOut", user: req.user });
});

// POST /boxes/create
router.post("/create", upload.fields([
  { name: "labelImageFile", maxCount: 1 },
  { name: "contentFile", maxCount: 1 },
]), requireLogin, async (req, res) => {
  const { boxName, labelImage, labelName, contentType, contentText, isPrivate, pinCode } = req.body;
  const labelImageFile = req.files["labelImageFile"] ? req.files["labelImageFile"][0].filename : null;
  const contentFile = req.files["contentFile"] ? req.files["contentFile"][0].filename : null;

  try {
    let fileSize = 0;
    if (contentFile) {
      const filePath = path.join(__dirname, "../uploads/", contentFile);
      const stats = fs.statSync(filePath);
      fileSize = stats.size;
    }

    const userResult = await pool.query("SELECT storage_usage FROM users WHERE user_id = $1", [req.user.id]);
    if (userResult.rows.length === 0) throw new Error("User not found");

    const newStorageUsage = userResult.rows[0].storage_usage + fileSize;
    await pool.query("UPDATE users SET storage_usage = $1 WHERE user_id = $2", [newStorageUsage, req.user.id]);

    const boxId = await cli.createBox(
      req.user.id, boxName, labelName,
      labelImageFile ? labelImageFile : labelImage,
      contentType, contentText, contentFile,
      isPrivate == "on" ? 1 : 0,
      pinCode ? pinCode : null
    );

    res.redirect(`/move/boxes/view/${boxId}`);
  } catch (error) {
    console.error("Error creating box:", error);
    res.status(500).send("Error creating box");
  }
});

// GET /boxes/view/:boxId
router.get("/view/:boxId", requireLogin, async (req, res) => {
  try {
    const box = await cli.getBoxById(req.params.boxId, req.user.id);
    const contents = await cli.getBoxContents(req.params.boxId);
    if (box) {
      res.render("box_content", { title: "Box Details - MoveOut", box, contents, user: req.user });
    } else {
      res.status(404).send("Box not found");
    }
  } catch (error) {
    console.error("Error fetching box:", error);
    res.status(500).send("Error fetching box");
  }
});

// GET /boxes/qr/:token
router.get("/qr/:token", async (req, res, next) => {
  try {
    const token = req.params.token;
    const result = await pool.query("SELECT * FROM boxes WHERE access_token = $1", [token]);

    if (result.rows.length > 0) {
      const box = result.rows[0];
      if (box.is_private) {
        res.render("validate_pin", { title: box.box_name || "Private Box Details", box, errorMessage: null });
      } else {
        res.render("box_content_public", { title: box.box_name || "Box Details", box });
      }
    } else {
      res.status(404).render("error", { message: "Box not found", user: req.session ? req.session.user : null });
    }
  } catch (error) {
    console.error("Rendering Error:", error);
    next(error);
  }
});

// POST /boxes/qr/validate-pin/:token
router.post("/qr/validate-pin/:token", async (req, res, next) => {
  const { pinCode } = req.body;
  const accessToken = req.params.token;
  let client;

  try {
    client = await getConnection();
    const result = await client.query("SELECT * FROM boxes WHERE access_token = $1", [accessToken]);

    if (result.rows.length === 0) {
      return res.status(404).render("error", { message: "Box not found", user: req.session ? req.session.user : null });
    }

    const box = result.rows[0];
    if (box.pin_code !== pinCode) {
      return res.render("validate_pin", { title: "Enter PIN - MoveOut", errorMessage: "Invalid PIN.", box: { access_token: accessToken } });
    }

    res.render("box_content_public", { title: box.box_name || "Box Details", box });
  } catch (error) {
    console.error("Error:", error);
    next(error);
  } finally {
    if (client) client.release();
  }
});

// GET /boxes/edit/:boxId
router.get("/edit/:boxId", requireLogin, async (req, res) => {
  try {
    const box = await cli.getBoxById(req.params.boxId, req.user.id);
    if (!box) return res.status(404).send("Box not found");
    res.render("edit_box", { title: "Edit Box - MoveOut", box, user: req.user });
  } catch (error) {
    console.error("Error fetching box:", error);
    res.status(500).send("Error fetching box");
  }
});

// POST /boxes/edit/:boxId
router.post("/edit/:boxId", upload.fields([
  { name: "labelImageFile", maxCount: 1 },
  { name: "contentFile", maxCount: 1 },
]), requireLogin, async (req, res) => {
  const { boxName, labelImage, label_name: labelName, contentType, content_data: contentText, isPrivate, pinCode } = req.body;
  const labelImageFile = req.files["labelImageFile"] ? req.files["labelImageFile"][0].filename : null;
  const contentFile = req.files["contentFile"] ? req.files["contentFile"][0].filename : null;

  try {
    let fileSize = 0;
    if (contentFile) {
      const filePath = path.join(__dirname, "../uploads/", contentFile);
      const stats = fs.statSync(filePath);
      fileSize = stats.size;
    }

    const userResult = await pool.query("SELECT storage_usage FROM users WHERE user_id = $1", [req.user.id]);
    if (userResult.rows.length === 0) return res.status(404).send("User not found");

    const newStorageUsage = userResult.rows[0].storage_usage + fileSize;
    await pool.query("UPDATE users SET storage_usage = $1 WHERE user_id = $2", [newStorageUsage, req.user.id]);

    const contentData = contentType == "text" ? contentText : contentFile ? contentFile : contentText;

    const result = await pool.query(
      "UPDATE boxes SET box_name = $1, label_name = $2, label_image = $3, content_type = $4, content_data = $5, is_private = $6, pin_code = $7 WHERE box_id = $8 AND user_id = $9",
      [boxName, labelName, labelImageFile ? labelImageFile : labelImage, contentType, contentData, isPrivate === "on", pinCode, req.params.boxId, req.user.id]
    );

    if (result.rowCount === 0) return res.status(404).send("Box not found");
    res.redirect(`/move/boxes/view/${req.params.boxId}`);
  } catch (error) {
    console.error("Error editing box:", error);
    res.status(500).send("Error editing box");
  }
});

// POST /boxes/delete/:boxId
router.post("/delete/:boxId", requireLogin, async (req, res) => {
  try {
    await cli.deleteBox(req.params.boxId, req.user.id);
    res.redirect("/move/boxes");
  } catch (error) {
    console.error("Error deleting box:", error);
    res.status(500).send("Error deleting box");
  }
});

// POST /boxes/:boxId/labels/create
router.post("/:boxId/labels/create", requireLogin, async (req, res) => {
  const { boxId } = req.params;
  const { labelName, isPrivate } = req.body;
  try {
    await cli.createOrUpdateLabel(null, labelName, isPrivate === "on", boxId);
    res.redirect(`/move/boxes/view/${boxId}`);
  } catch (error) {
    console.error("Error creating label:", error);
    res.status(500).send("Error creating label");
  }
});

module.exports = router;
