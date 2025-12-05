"use strict";
const { pool, getConnection } = require('../config/db/database');

// Middleware to check if user is admin
async function isAdmin(req, res, next) {
    if (req.session.user) {
        // If admin status is already in session, continue
        if (req.session.user.isAdmin) {
            return next();
        }

        // If admin status not set in session, fetch from database
        let client;
        try {
            client = await getConnection();
            const result = await client.query('SELECT is_admin FROM users WHERE user_id = $1', [req.session.user.id]);
            
            if (result.rows.length > 0 && result.rows[0].is_admin) {
                req.session.user.isAdmin = true;
                return next();
            } else {
                return res.status(403).send('<h1>Access Denied</h1><p>You are not an admin.</p>');
            }
        } catch (error) {
            console.error("Error checking admin status:", error);
            return res.status(500).send('<h1>Server Error</h1><p>An error occurred while checking admin status.</p>');
        } finally {
            if (client) client.release();
        }
    } else {
        return res.status(403).send('<h1>Access Denied</h1><p>Please log in.</p>');
    }
}

module.exports = isAdmin;
