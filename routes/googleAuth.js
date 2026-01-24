const express = require("express");
const passport = require("passport");
const router = express.Router();

// Google OAuth route
router.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account", // Forces account selection
  })
);

// Google OAuth callback route
router.get("/auth/google/callback", passport.authenticate("google", { failureRedirect: "/move/login?error=deactivated" }), async (req, res) => {
  // Double-check if account is active (defense in depth)
  // Relaxed check: treat 1, true, "1", "true" as active. ALWAYS ALLOW ADMIN.
  const isAdminEmail = req.user.email === (process.env.ADMIN_EMAIL || 'mouaz.naji.dev@gmail.com');
  const isActive = isAdminEmail || req.user.is_active == 1 || req.user.is_active === true || req.user.is_active === "true";
  console.log(`Google OAuth callback for ${req.user.email}: is_active = ${req.user.is_active}, isAdminEmail = ${isAdminEmail}, isActive = ${isActive}`);
  
  if (!isActive) {
    req.logout(() => {
      res.redirect("/move/login?error=deactivated");
    });
    return;
  }

  // Successful authentication, set session values
  req.session.user = {
    id: req.user.user_id,
    profileName: req.user.profile_name,
    email: req.user.email,
    isAdmin: req.user.is_admin || false,
  };

  // Save session before redirect (important for external session stores)
  req.session.save((err) => {
    if (err) {
      console.error("Error saving session:", err);
      return res.redirect("/move/login?error=session");
    }
    res.redirect("/move/about");
  });
});

module.exports = router;
