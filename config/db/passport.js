"use strict";
/**
 * Passport Configuration
 * Handles Google OAuth authentication
 */
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { getConnection } = require("./database");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:1338/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      let connection;
      try {
        connection = await getConnection();

        // Check if user already exists
        const [users] = await connection.query("SELECT * FROM users WHERE email = ?", [profile.emails[0].value]);

        if (users.length > 0) {
          const user = users[0];

          // Check if user has a password set
          if (!user.password_hash) {
            return done(null, false, { message: "Please set your password." });
          }

          return done(null, user);
        } else {
          // Create a new user in the database
          const newUser = {
            email: profile.emails[0].value,
            profile_name: profile.displayName,
            is_verified: 1, // Use 1 instead of true for SQLite compatibility
          };

          // Generate a secure random password for Google OAuth users
          const randomPassword = crypto.randomBytes(32).toString("hex");
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(randomPassword, salt);
          const [result] = await connection.query(
            "INSERT INTO users (email, profile_name, is_verified, password_hash) VALUES (?, ?, ?, ?)",
            [newUser.email, newUser.profile_name, newUser.is_verified, hashedPassword]
          );

          newUser.user_id = result.insertId;
          return done(null, newUser);
        }
      } catch (error) {
        console.error("Error in Google Strategy:", error.message);
        return done(error, false);
      } finally {
        if (connection) connection.release();
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.user_id);
});

passport.deserializeUser(async (id, done) => {
  let connection;
  try {
    connection = await getConnection();
    const [users] = await connection.query("SELECT * FROM users WHERE user_id = ?", [id]);

    if (users.length > 0) {
      done(null, users[0]);
    } else {
      done(null, false);
    }
  } catch (error) {
    console.error("Error during deserialization:", error.message);
    done(error, false);
  } finally {
    if (connection) connection.release();
  }
});

module.exports = passport;
