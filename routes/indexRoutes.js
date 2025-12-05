"use strict";
const express = require("express");
const router = express.Router();

// Import modular route files
const authRoutes = require("./auth");
const profileRoutes = require("./profile");
const boxRoutes = require("./boxes");

// Root redirect
router.get("/", (req, res) => {
  res.redirect("/move/login");
});

// About page
router.get("/about", (req, res) => {
  const successMessage = req.query.successMessage || null;
  const user = req.session.user;
  res.render("about", { title: "MoveOut - About", successMessage, user });
});

// Mount modular routes
router.use("/", authRoutes);           // /move/login, /move/register, etc.
router.use("/profile", profileRoutes); // /move/profile, /move/profile/update, etc.
router.use("/boxes", boxRoutes);       // /move/boxes, /move/boxes/create, etc.

module.exports = router;
