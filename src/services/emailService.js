"use strict";
const nodemailer = require("nodemailer");
require("dotenv").config();

// Configure nodemailer for email with timeout settings
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // Timeout settings to prevent hanging
  connectionTimeout: 10000, // 10 seconds to connect
  greetingTimeout: 10000,   // 10 seconds for greeting
  socketTimeout: 15000,     // 15 seconds for socket
});

/**
 * Send email asynchronously
 * @param {Object} mailOptions 
 * @returns {Promise<boolean>}
 */
async function sendEmailAsync(mailOptions) {
  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully to:", mailOptions.to);
    return true;
  } catch (error) {
    console.error("Error sending email:", error.message);
    return false;
  }
}

/**
 * Send verification email
 * @param {string} toEmail 
 * @param {string} token 
 */
async function sendVerificationEmail(toEmail, token) {
  const baseUrl = process.env.BASE_URL || 
    (process.env.NODE_ENV === "production" ? "https://move-out.onrender.com" : "http://localhost:1338");
  const verificationLink = `${baseUrl}/verify-email?token=${token}`;
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject: "Verify Your Email for MoveOut",
    html: `<p>Please click on the following link to verify your email: <a href="${verificationLink}">${verificationLink}</a></p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw new Error("Failed to send verification email.");
  }
}

module.exports = {
  sendEmailAsync,
  sendVerificationEmail,
  transporter, // Export for advanced usage if needed
};
