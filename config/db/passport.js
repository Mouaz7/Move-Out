const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { pool, getConnection } = require("./database");
const bcrypt = require("bcrypt");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      let client;
      try {
        console.log("Google profile received:", profile);
        client = await getConnection();

        // Check if user exists
        const result = await client.query("SELECT * FROM users WHERE email = $1", [profile.emails[0].value]);

        if (result.rows.length > 0) {
          const user = result.rows[0];

          if (!user.password_hash) {
            console.log("User found, but no password set.");
            return done(null, false, { message: "Please set your password." });
          }

          console.log("User found, proceeding with login.");
          return done(null, user);
        } else {
          // Create new user
          const newUser = {
            email: profile.emails[0].value,
            profile_name: profile.displayName,
            is_verified: true,
            password: "Googlexd@99",
          };

          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(newUser.password, salt);
          const insertResult = await client.query(
            "INSERT INTO users (email, profile_name, is_verified, password_hash) VALUES ($1, $2, $3, $4) RETURNING user_id",
            [newUser.email, newUser.profile_name, newUser.is_verified, hashedPassword]
          );

          newUser.user_id = insertResult.rows[0].user_id;
          console.log("New user created:", newUser);
          return done(null, newUser);
        }
      } catch (error) {
        console.error("Error in Google Strategy:", error);
        return done(error, false);
      } finally {
        if (client) client.release();
      }
    }
  )
);

passport.serializeUser((user, done) => {
  console.log("Serializing user ID:", user.user_id);
  done(null, user.user_id);
});

passport.deserializeUser(async (id, done) => {
  let client;
  try {
    console.log("Deserializing user ID:", id);
    client = await getConnection();
    const result = await client.query("SELECT * FROM users WHERE user_id = $1", [id]);

    if (result.rows.length > 0) {
      console.log("User deserialized:", result.rows[0]);
      done(null, result.rows[0]);
    } else {
      console.log("User not found during deserialization.");
      done(null, false);
    }
  } catch (error) {
    console.error("Error during deserialization:", error);
    done(error, false);
  } finally {
    if (client) client.release();
  }
});

module.exports = passport;
