"use strict";
const db = require('../config/db/database');

/**
 * Middleware to check if user is an administrator
 * Uses database abstraction layer for both MySQL and PostgreSQL
 */
async function isAdmin(req, res, next) {
    // Check if user is logged in
    if (!req.session || !req.session.user) {
        return res.status(403).send('<h1>Access Denied</h1><p>Please log in.</p>');
    }

    // If admin status is already cached in session, use it
    if (req.session.user.isAdmin) {
        return next();
    }

    // Otherwise, fetch from database
    let connection;
    try {
        connection = await db.getConnection();
        const [users] = await connection.query(
            'SELECT is_admin FROM users WHERE user_id = ?',
            [req.session.user.id]
        );
        
        if (users && users.length > 0 && users[0].is_admin) {
            // Cache admin status in session
            req.session.user.isAdmin = true;
            return next();
        } else {
            return res.status(403).send('<h1>Access Denied</h1><p>You are not an admin.</p>');
        }
    } catch (error) {
        console.error("Error checking admin status:", error);
        return res.status(500).send('<h1>Server Error</h1><p>An error occurred while checking admin status.</p>');
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

module.exports = isAdmin;
