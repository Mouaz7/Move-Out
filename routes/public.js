"use strict";
/**
 * Public Routes
 * Handles: public pages, QR code access, PIN validation
 * No authentication required
 */
const express = require("express");
const router = express.Router();
require("dotenv").config();

const boxService = require("../src/services/boxService");

// GET / - Root redirect
router.get("/", (req, res) => {
  res.redirect("/move/login");
});

// GET /about - About page
router.get("/about", (req, res) => {
  const successMessage = req.query.successMessage || null;
  const user = req.session?.user || null;
  res.render("about", { title: "MoveOut - About", successMessage, user });
});

// GET /boxes/qr/:token - Public QR code access
router.get("/boxes/qr/:token", async (req, res, next) => {
  try {
    const token = req.params.token;
    const box = await boxService.getBoxByToken(token);

    if (box) {
      if (box.is_private) {
        // Show PIN entry form for private boxes
        res.render("validate_pin", {
          title: box.box_name || "Private Box Details",
          box,
          errorMessage: null,
        });
      } else {
        // Show public box content
        res.render("box_content_public", {
          title: box.box_name || "Box Details",
          box,
        });
      }
    } else {
      res.status(404).render("error", {
        title: "Not Found - MoveOut",
        message: "Box not found",
        user: req.session?.user || null,
      });
    }
  } catch (error) {
    console.error("Error fetching box:", error);
    next(error);
  }
});

// POST /boxes/qr/validate-pin/:token - Validate PIN for private box
router.post("/boxes/qr/validate-pin/:token", async (req, res, next) => {
  const { pinCode } = req.body;
  const accessToken = req.params.token;

  try {
    const box = await boxService.getBoxByToken(accessToken);

    if (!box) {
      return res.status(404).render("error", {
        title: "Not Found - MoveOut",
        message: "Box not found",
        user: req.session?.user || null,
      });
    }

    // Verify PIN
    if (box.pin_code !== pinCode) {
      return res.render("validate_pin", {
        title: "Enter PIN - MoveOut",
        errorMessage: "Invalid PIN. Please try again.",
        box: { access_token: accessToken },
      });
    }

    // PIN correct - show box content
    res.render("box_content_public", {
      title: box.box_name || "Box Details",
      box,
    });
  } catch (error) {
    console.error("Error validating PIN:", error);
    next(error);
  }
});

module.exports = router;
