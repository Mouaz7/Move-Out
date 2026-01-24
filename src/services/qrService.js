"use strict";
const QRCode = require("qrcode");

/**
 * Generate QR code data URL
 * @param {string} text - Text to encode
 * @returns {Promise<string>} - Data URL
 */
async function generateQRCode(text) {
  try {
    return await QRCode.toDataURL(text);
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw error;
  }
}

module.exports = {
  generateQRCode,
};
