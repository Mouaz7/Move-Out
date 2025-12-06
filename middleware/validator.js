const { body, param, query, validationResult } = require("express-validator");

/**
 * Input validation middleware using express-validator
 * Prevents SQL injection, XSS, and invalid data
 */

// Helper function to return validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Email validation
const validateEmail = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Invalid email address")
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage("Email too long"),
];

// Password validation - strong password requirements
const validatePassword = [
  body("psw")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/)
    .withMessage("Password must contain at least one uppercase letter, one number, and one special character"),
];

// Registration validation
const validateRegistration = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters")
    .matches(/^[a-zA-ZåäöÅÄÖ\s]+$/)
    .withMessage("Name can only contain letters and spaces")
    .escape(),
  ...validateEmail,
  ...validatePassword,
  body("psw_repeat")
    .custom((value, { req }) => value === req.body.psw)
    .withMessage("Passwords do not match"),
];

// Login validation
const validateLogin = [
  ...validateEmail,
  body("psw")
    .notEmpty()
    .withMessage("Password is required"),
];

// Profile update validation
const validateProfileUpdate = [
  body("profileName")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Profile name must be between 2 and 100 characters")
    .matches(/^[a-zA-ZåäöÅÄÖ\s]+$/)
    .withMessage("Profile name can only contain letters and spaces")
    .escape(),
  body("email")
    .trim()
    .isEmail()
    .withMessage("Invalid email address")
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage("Email too long"),
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .optional({ checkFalsy: true })
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters long")
    .matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/)
    .withMessage("New password must contain at least one uppercase letter, one number, and one special character"),
];

// Box creation validation
const validateBoxCreation = [
  body("boxName")
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Box name must be between 1 and 200 characters")
    .escape(),
  body("labelName")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Label name too long")
    .escape(),
  body("contentType")
    .isIn(["text", "file", "audio"])
    .withMessage("Invalid content type"),
  body("contentText")
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage("Content text too long")
    .escape(),
  body("pinCode")
    .optional({ checkFalsy: true })
    .isLength({ min: 4, max: 10 })
    .withMessage("PIN code must be between 4 and 10 characters")
    .matches(/^[0-9]+$/)
    .withMessage("PIN code must contain only numbers"),
];

// PIN validation
const validatePIN = [
  body("pinCode")
    .trim()
    .isLength({ min: 4, max: 10 })
    .withMessage("Invalid PIN code")
    .matches(/^[0-9]+$/)
    .withMessage("PIN code must contain only numbers"),
];

// ID parameter validation
const validateBoxId = [
  param("boxId")
    .isInt({ min: 1 })
    .withMessage("Invalid box ID"),
];

// Verification code validation
const validateVerificationCode = [
  body("verificationCode")
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage("Verification code must be 6 digits")
    .matches(/^[0-9]{6}$/)
    .withMessage("Verification code must contain only numbers"),
];

module.exports = {
  handleValidationErrors,
  validateEmail,
  validatePassword,
  validateRegistration,
  validateLogin,
  validateProfileUpdate,
  validateBoxCreation,
  validatePIN,
  validateBoxId,
  validateVerificationCode,
};
