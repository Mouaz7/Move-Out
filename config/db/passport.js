const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const pool = require("./mysqlPool");
const bcrypt = require("bcryptjs");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      let connection;
      try {
        console.log("Google profile received:", profile);
        connection = await pool.getConnection();

        // Kontrollera om användaren redan existerar
        const [users] = await connection.query("SELECT * FROM users WHERE email = ?", [profile.emails[0].value]);

        if (users.length > 0) {
          const user = users[0];

          // Kontrollera om användaren har ett lösenord
          if (!user.password_hash) {
            console.log("User found, but no password set.");
            return done(null, false, { message: "Please set your password." });
          }

          console.log("User found, proceeding with login.");
          return done(null, user); // Användaren existerar och har ett lösenord
        } else {
          // Skapa en ny användare i databasen
          const newUser = {
            email: profile.emails[0].value,
            profile_name: profile.displayName,
            is_verified: true,
            password: "Googlexd@99", // Idealiskt ska lösenordet hashas
          };

          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(newUser.password, salt);
          const [result] = await connection.query(
            "INSERT INTO users (email, profile_name, is_verified, password_hash) VALUES (?, ?, ?, ?)",
            [newUser.email, newUser.profile_name, newUser.is_verified, hashedPassword]
          );

          newUser.user_id = result.insertId; // Fäst det genererade användar-ID:t
          console.log("New user created:", newUser);
          return done(null, newUser); // Lyckades skapa ny användare
        }
      } catch (error) {
        console.error("Error in Google Strategy:", error);
        return done(error, false);
      } finally {
        if (connection) connection.release(); // Släpp alltid anslutningen
      }
    }
  )
);

passport.serializeUser((user, done) => {
  console.log("Serializing user ID:", user.user_id);
  done(null, user.user_id);
});

passport.deserializeUser(async (id, done) => {
  let connection;
  try {
    console.log("Deserializing user ID:", id);
    connection = await pool.getConnection();
    const [users] = await connection.query("SELECT * FROM users WHERE user_id = ?", [id]);

    if (users.length > 0) {
      console.log("User deserialized:", users[0]);
      done(null, users[0]);
    } else {
      console.log("User not found during deserialization.");
      done(null, false);
    }
  } catch (error) {
    console.error("Error during deserialization:", error);
    done(error, false);
  } finally {
    if (connection) connection.release(); // Släpp alltid anslutningen
  }
});

module.exports = passport;
