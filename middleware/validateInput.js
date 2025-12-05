const { body, validationResult } = require("express-validator");

// Validation rules for registration
const validateRegistration = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters")
    .matches(/^[a-zA-ZåäöÅÄÖ\s'-]+$/)
    .withMessage("Name can only contain letters, spaces, hyphens and apostrophes")
    .escape(),

  body("email")
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail()
    .isLength({ max: 100 })
    .withMessage("Email must not exceed 100 characters"),

  body("psw")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/)
    .withMessage(
      "Password must contain at least one uppercase letter, one number, and one special character (!@#$%^&*)"
    ),

  body("psw_repeat")
    .custom((value, { req }) => value === req.body.psw)
    .withMessage("Passwords do not match"),
];

// Validation rules for login
const validateLogin = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("psw")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ max: 128 })
    .withMessage("Invalid password format"),
];

// Validation rules for profile update
const validateProfileUpdate = [
  body("profileName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Profile name must be between 2 and 50 characters")
    .matches(/^[a-zA-ZåäöÅÄÖ\s'-]+$/)
    .withMessage("Name can only contain letters, spaces, hyphens and apostrophes")
    .escape(),

  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),

  body("newPassword")
    .optional({ checkFalsy: true })
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters long")
    .matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/)
    .withMessage(
      "New password must contain at least one uppercase letter, one number, and one special character"
    ),
];

// Validation rules for box creation/update
const validateBox = [
  body("boxName")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Box name must be between 1 and 100 characters")
    .escape(),

  body("labelName")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage("Label name must not exceed 100 characters")
    .escape(),

  body("contentType")
    .isIn(["text", "file"])
    .withMessage("Content type must be either 'text' or 'file'"),

  body("contentText")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 5000 })
    .withMessage("Content text must not exceed 5000 characters"),

  body("pinCode")
    .optional({ checkFalsy: true })
    .matches(/^\d{4,6}$/)
    .withMessage("PIN code must be 4-6 digits"),
];

// Validation rules for email verification
const validateVerificationCode = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("verificationCode")
    .trim()
    .matches(/^\d{6}$/)
    .withMessage("Verification code must be 6 digits"),
];

// Validation rules for PIN validation
const validatePinCode = [
  body("pinCode")
    .trim()
    .matches(/^\d{4,6}$/)
    .withMessage("PIN code must be 4-6 digits"),
];

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];
    // Return to the referring page with error message
    const referer = req.get("Referer") || "/move/login";
    const view = referer.includes("register")
      ? "register"
      : referer.includes("profile")
      ? "profile"
      : referer.includes("boxes")
      ? "create_box"
      : "login";

    return res.status(400).render(view, {
      title: `MoveOut - ${view.charAt(0).toUpperCase() + view.slice(1)}`,
      errorMessage: firstError.msg,
      user: req.session ? req.session.user : null,
    });
  }
  next();
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateProfileUpdate,
  validateBox,
  validateVerificationCode,
  validatePinCode,
  handleValidationErrors,
};
