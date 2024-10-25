"use strict";
const express = require("express");
const router = express.Router();
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
require("dotenv").config();
const dbConfig = require("../config/db/move.json");
const cli = require("../src/cli");
const requireLogin = require("../middleware/requireLogin");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Skapa en anslutningspool
const pool = mysql.createPool(dbConfig);

// Behåll 'getConnection' funktionen men uppdatera den för att använda poolen
async function getConnection() {
  try {
    const connection = await pool.getConnection();
    return connection;
  } catch (error) {
    console.error("Database connection failed:", error);
    throw error;
  }
}

function validatePassword(password) {
  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
  return passwordRegex.test(password);
}

router.get("/", (req, res) => {
  res.redirect("/move/login");
});

router.get("/about", (req, res) => {
  const successMessage = req.query.successMessage || null;
  const user = req.session.user;
  res.render("about", { title: "MoveOut - About", successMessage, user });
});

router.get("/register", (req, res) => {
  res.render("register", { title: "Move - Register", errorMessage: null });
});

router.post("/register", async (req, res) => {
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

  let connection;
  try {
    connection = await getConnection();
    const [users] = await connection.query("SELECT * FROM users WHERE email = ?", [email]);
    if (users.length > 0) {
      return res.status(400).render("register", {
        title: "Move - Register",
        errorMessage: "Email already registered.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(psw, salt);
    const isVerified = isGmailUser ? true : false;
    const verificationCode = isGmailUser ? null : Math.floor(100000 + Math.random() * 900000).toString();

    await connection.query("INSERT INTO users (email, password_hash, profile_name, is_verified, verification_code) VALUES (?, ?, ?, ?, ?)", [email, hashedPassword, name, isVerified, verificationCode]);

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
      res.redirect("/move/login");
    }
  } catch (error) {
    console.error("Error during registration process:", error);
    res.status(500).render("register", {
      title: "Move - Register",
      errorMessage: "Internal Server Error.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

router.post("/verify-code", async (req, res) => {
  const { email, verificationCode } = req.body;
  let connection;

  try {
    connection = await getConnection();
    const [users] = await connection.query("SELECT * FROM users WHERE email = ? AND verification_code = ?", [email, verificationCode]);

    if (users.length === 0) {
      return res.status(400).render("verify", {
        title: "Move - Verify",
        email: email,
        errorMessage: "Invalid verification code.",
        successMessage: null,
        verified: false,
      });
    }

    await connection.query("UPDATE users SET is_verified = TRUE, verification_code = NULL WHERE email = ?", [email]);

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
    if (connection) {
      connection.release();
    }
  }
});

router.get("/verify", (req, res) => {
  res.render("verify", {
    title: "Move - Verify",
    email: "",
    errorMessage: null,
    successMessage: null,
    verified: false,
  });
});

router.get("/login", (req, res) => {
  if (req.session.user) {
    return res.redirect("/move/about");
  }
  res.render("login", { title: "MoveOut - Login", errorMessage: null });
});

router.post("/login", async (req, res) => {
  const { email, psw } = req.body;
  let connection;

  try {
    connection = await getConnection();
    const [users] = await connection.query("SELECT * FROM users WHERE email = ?", [email]);

    if (users.length === 0) {
      return res.status(400).render("login", {
        title: "MoveOut - Login",
        errorMessage: "User not found.",
      });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(400).render("login", {
        title: "MoveOut - Login",
        errorMessage: "Your account is deactivated. Please contact support to reactivate.",
      });
    }

    const isValidPassword = await bcrypt.compare(psw, user.password_hash);

    if (!isValidPassword) {
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
    if (connection) {
      connection.release();
    }
  }
});

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

router.get("/profile", requireLogin, (req, res) => {
  res.render("profile", {
    title: "MoveOut - Profile",
    user: req.user,
    errorMessage: null,
    successMessage: null,
  });
});

router.post("/profile/update", requireLogin, async (req, res) => {
  const { profileName, email, currentPassword, newPassword } = req.body;
  let connection;

  try {
    connection = await getConnection();
    const userId = req.user.id;
    const [users] = await connection.query("SELECT * FROM users WHERE user_id = ?", [userId]);
    const user = users[0];

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isPasswordValid) {
      return res.render("profile", {
        title: "MoveOut - Profile",
        user: req.user,
        errorMessage: "Current password is incorrect.",
        successMessage: null,
      });
    }

    if (newPassword && newPassword.length > 0) {
      if (!validatePassword(newPassword)) {
        return res.render("profile", {
          title: "MoveOut - Profile",
          user: req.user,
          errorMessage: "New password must be at least 8 characters long, contain one uppercase letter, one number, and one special character.",
          successMessage: null,
        });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      await connection.query("UPDATE users SET password_hash = ? WHERE user_id = ?", [hashedPassword, userId]);
    }

    // Corrected line to update both profileName and email
    await connection.query("UPDATE users SET profile_name = ?, email = ? WHERE user_id = ?", [profileName, email, userId]);

    req.session.user.profileName = profileName;
    req.session.user.email = email;

    return res.render("profile", {
      title: "MoveOut - Profile",
      user: req.session.user,
      errorMessage: null,
      successMessage: "Profile updated successfully!",
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.render("profile", {
      title: "MoveOut - Profile",
      user: req.user,
      errorMessage: "An error occurred while updating your profile.",
      successMessage: null,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

router.post("/profile/deactivate", requireLogin, async (req, res) => {
  const userId = req.user.id;
  let connection;

  try {
    connection = await getConnection();
    await connection.query("UPDATE users SET is_active = FALSE WHERE user_id = ?", [userId]);

    req.session.destroy();
    res.clearCookie("connect.sid");

    res.redirect("/move/login");
  } catch (error) {
    console.error("Error deactivating profile:", error);
    res.status(500).render("profile", {
      title: "MoveOut - Profile",
      user: req.user,
      errorMessage: "An error occurred while deactivating your profile.",
      successMessage: null,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

router.post("/profile/reactivate", async (req, res) => {
  const { email } = req.body;
  let connection;

  try {
    connection = await getConnection();
    const [users] = await connection.query("SELECT * FROM users WHERE email = ?", [email]);

    if (users.length === 0 || users[0].is_active) {
      return res.render("reactivate", {
        title: "MoveOut - Reactivate",
        errorMessage: "Account not found or already active.",
        successMessage: null,
      });
    }

    await connection.query("UPDATE users SET is_active = TRUE WHERE email = ?", [email]);

    return res.render("reactivate", {
      title: "MoveOut - Reactivate",
      errorMessage: null,
      successMessage: "Account reactivated successfully! You can now log in.",
    });
  } catch (error) {
    console.error("Error reactivating account:", error);
    res.status(500).render("reactivate", {
      title: "MoveOut - Reactivate",
      errorMessage: "Internal server error occurred.",
      successMessage: null,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

router.get("/profile/reactivate", (req, res) => {
  res.render("reactivate", {
    title: "MoveOut - Reactivate",
    errorMessage: null,
    successMessage: null,
  });
});

// Set up uploads directory
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "labelImageFile") {
      console.log("Uploading to label images directory");
      cb(null, path.join(__dirname, "../public/style/images"));
    } else {
      cb(null, uploadsDir);
    }
  },
  filename: (req, file, cb) => {
    console.log(`Uploading file: ${file.originalname}`); // Debug log
    cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Route to display all boxes
router.get("/boxes", requireLogin, async (req, res) => {
  try {
    const boxes = await cli.getAllBoxes(req.user.id);
    res.render("all_boxes", { title: "All Boxes - MoveOut", boxes, user: req.user });
  } catch (error) {
    console.error("Error fetching boxes:", error);
    res.status(500).send("Error fetching boxes");
  }
});

// Route to display create box form
router.get("/boxes/create", requireLogin, (req, res) => {
  res.render("create_box", { title: "Create Box - MoveOut", user: req.user });
});

router.post(
  "/boxes/create",
  upload.fields([
    { name: "labelImageFile", maxCount: 1 },
    { name: "contentFile", maxCount: 1 },
  ]),
  requireLogin,
  async (req, res) => {
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

      const [user] = await pool.query("SELECT storage_usage FROM users WHERE user_id = ?", [req.user.id]);

      if (!user) {
        throw new Error("User not found");
      }

      const newStorageUsage = user[0].storage_usage + fileSize;
      console.log(`New storage usage: ${newStorageUsage} bytes`);

      await pool.query("UPDATE users SET storage_usage = ? WHERE user_id = ?", [newStorageUsage, req.user.id]);

      const boxId = await cli.createBox(req.user.id, boxName, labelName, labelImageFile ? labelImageFile : labelImage, contentType, contentText, contentFile, isPrivate == "on" ? 1 : 0, pinCode ? pinCode : null);
      // Redirect to the box view page to display the QR code
      res.redirect(`/move/boxes/view/${boxId}`);
    } catch (error) {
      console.error("Error creating box:", error);
      res.status(500).send("Error creating box");
    }
  }
);

// Route to view a single box
router.get("/boxes/view/:boxId", requireLogin, async (req, res) => {
  try {
    const box = await cli.getBoxById(req.params.boxId, req.user.id);
    const contents = await cli.getBoxContents(req.params.boxId);
    console.log("Box contents: ", box);
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
// Route to handle QR code scanning
router.get("/boxes/qr/:token", async (req, res, next) => {
  try {
    const token = req.params.token;

    // Hämta boxen baserat på access_token
    const [rows] = await pool.query("SELECT * FROM boxes WHERE access_token = ?", [token]);

    if (rows.length > 0) {
      const box = rows[0];

      console.log("Fetched Box:", box);
      console.log("Is Private:", box.is_private);

      if (box.is_private) {
        // Render the validate_pin template with errorMessage set to null or a specific message
        res.render("validate_pin", {
          title: box.box_name || "Private Box Details", // Title for private box
          box,
          errorMessage: null, // or set this to an error message if applicable
        });
      } else {
        res.render("box_content_public", {
          title: box.box_name || "Box Details", // Title for public box
          box,
        });
      }
    } else {
      res.status(404).render("error", {
        message: "Box not found",
        user: req.session ? req.session.user : null,
      });
    }
  } catch (error) {
    console.error("Rendering Error:", error);
    next(error);
  }
});

router.post("/boxes/qr/validate-pin/:token", async (req, res) => {
  const { pinCode } = req.body;
  const accessToken = req.params.token;

  let connection;

  try {
    connection = await getConnection();

    // Fetch the box based on the access token
    const [boxes] = await connection.query("SELECT * FROM boxes WHERE access_token = ?", [accessToken]);

    if (boxes.length === 0) {
      res.status(404).render("error", {
        message: "Box not found",
        user: req.session ? req.session.user : null,
      });
      return;
    }

    const box = boxes[0];
    console.log(box);
    if (box.pin_code !== pinCode) {
      return res.render("validate_pin", {
        title: "Enter PIN - MoveOut",
        errorMessage: "Invalid PIN. Please try again.",
        box: { access_token: accessToken },
      });
    }

    res.render("box_content_public", {
      title: box.box_name || "Box Details",
      box,
    });
  } catch (error) {
    console.error("Rendering Error:", error);
    next(error);
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Route to display edit box form
router.get("/boxes/edit/:boxId", requireLogin, async (req, res) => {
  console.log("GET /boxes/edit/:boxId route reached"); // Debugging line
  const { boxId } = req.params;
  const userId = req.user.id;

  try {
    const box = await cli.getBoxById(boxId, userId);
    if (!box) {
      return res.status(404).send("Box not found");
    }
    res.render("edit_box", { title: "Edit Box - MoveOut", box, user: req.user });
  } catch (error) {
    console.error("Error fetching box:", error);
    res.status(500).send("Error fetching box");
  }
});

// Route to handle edit box form submission
router.post(
  "/boxes/edit/:boxId",
  upload.fields([
    { name: "labelImageFile", maxCount: 1 },
    { name: "contentFile", maxCount: 1 },
  ]),
  requireLogin,
  async (req, res) => {
    const { boxName, labelImage, label_name: labelName, contentType, content_data: contentText, isPrivate, pinCode } = req.body;

    const labelImageFile = req.files["labelImageFile"] ? req.files["labelImageFile"][0].filename : null;
    const contentFile = req.files["contentFile"] ? req.files["contentFile"][0].filename : null;
    console.log(req.body);

    try {
      let fileSize = 0;
      if (contentFile) {
        const filePath = path.join(__dirname, "../uploads/", contentFile);
        const stats = fs.statSync(filePath);
        fileSize = stats.size;
      }

      // Retrieve user information for storage calculation
      const [user] = await pool.query("SELECT storage_usage FROM users WHERE user_id = ?", [req.user.id]);

      if (!user || user.length === 0) {
        return res.status(404).send("User not found");
      }

      const newStorageUsage = user[0].storage_usage + fileSize;
      console.log(`New storage usage: ${newStorageUsage} bytes`);

      // Update user storage usage
      await pool.query("UPDATE users SET storage_usage = ? WHERE user_id = ?", [newStorageUsage, req.user.id]);

      const contentData = contentType == "text" ? contentText : contentFile ? contentFile : contentText;

      // Update the box in the database
      const [result] = await pool.query("UPDATE boxes SET box_name = ?, label_name = ?, label_image = ?, content_type = ?, content_data = ?, is_private = ?, pin_code = ? WHERE box_id = ? AND user_id = ?", [boxName, labelName, labelImageFile ? labelImageFile : labelImage, contentType, contentData, isPrivate, pinCode, req.params.boxId, req.user.id]);

      if (result.affectedRows === 0) {
        return res.status(404).send("Box not found or you do not have permission to edit this box");
      }

      res.redirect(`/move/boxes/view/${req.params.boxId}`);
    } catch (error) {
      console.error("Error editing box:", error);
      res.status(500).send("Error editing box");
    }
  }
);

// Route to delete a box
router.post("/boxes/delete/:boxId", requireLogin, async (req, res) => {
  try {
    await cli.deleteBox(req.params.boxId, req.user.id);
    res.redirect("/move/boxes");
  } catch (error) {
    console.error("Error deleting box:", error);
    res.status(500).send("Error deleting box");
  }
});

// Route to create or update a label for a box
router.post("/boxes/:boxId/labels/create", requireLogin, async (req, res) => {
  const { boxId } = req.params;
  const { labelName, isPrivate } = req.body;
  const isPrivateBool = isPrivate === "on"; // Konvertera till boolean

  try {
    // Skapa eller uppdatera etiketten och generera en PIN om privat
    const labelId = await cli.createOrUpdateLabel(null, labelName, isPrivateBool, boxId);
    res.redirect(`/move/boxes/view/${boxId}`); // Återgå till vyn för boxen
  } catch (error) {
    console.error("Error creating/updating label:", error);
    res.status(500).send("Error creating/updating label");
  }
});

module.exports = router;
