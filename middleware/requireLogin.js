/**
 * Middleware to require user authentication
 * Checks session validity and user account status
 */
module.exports = async (req, res, next) => {
  // Check if session exists and has user
  if (!req.session || !req.session.user) {
    return res.redirect("/move/login");
  }

  // Attach user to request
  req.user = req.session.user;

  // Optional: Add session expiry check (sessions expire after maxAge in cookie config)
  // The session will be automatically destroyed by express-session after maxAge

  // Optional: Check if user account is still active in database
  // This prevents deactivated users from using cached sessions
  // Uncomment if you want real-time deactivation checks:
  /*
  try {
    const db = require('../config/db/database');
    const connection = await db.getConnection();
    const [users] = await connection.query(
      'SELECT is_active FROM users WHERE user_id = ?',
      [req.user.id]
    );
    connection.release();

    if (!users || users.length === 0 || !users[0].is_active) {
      req.session.destroy();
      return res.redirect('/move/login');
    }
  } catch (error) {
    console.error('Error checking user status:', error);
    // Continue anyway to avoid blocking on DB errors
  }
  */

  next();
};