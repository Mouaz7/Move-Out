"use strict";
/**
 * Shared Validation Utilities
 * Centralized validation functions used across the application
 */

/**
 * Validate password strength
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one number
 * - At least one special character (!@#$%^&*)
 * 
 * @param {string} password - The password to validate
 * @returns {boolean} - True if password meets requirements
 */
function validatePassword(password) {
  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
  return passwordRegex.test(password);
}

/**
 * Generate a random 6-digit PIN code
 * @returns {string} - 6-digit PIN as string
 */
function generateSixDigitPin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = {
  validatePassword,
  generateSixDigitPin,
};
