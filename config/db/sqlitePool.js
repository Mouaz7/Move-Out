const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

/**
 * SQLite database adapter for local development
 * Provides MySQL-compatible interface for seamless switching
 */

const dbPath = path.join(__dirname, '../../data/moveout.db');

// Ensure data directory exists
const fs = require('fs');
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create database connection
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('✓ SQLite database initialized at:', dbPath);

// Initialize schema
function initializeSchema() {
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      profile_name TEXT,
      is_verified INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      is_admin INTEGER DEFAULT 0,
      verification_code TEXT,
      verification_token TEXT,
      verification_expires_at TEXT,
      reset_code TEXT,
      reset_code_expiry TEXT,
      reset_token TEXT,
      reset_token_expires_at TEXT,
      storage_usage INTEGER DEFAULT 0,
      failed_login_attempts INTEGER DEFAULT 0,
      locked_until TEXT,
      last_activity TEXT DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Boxes table
    CREATE TABLE IF NOT EXISTS boxes (
      box_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      box_name TEXT NOT NULL,
      label_name TEXT,
      label_image TEXT,
      label_design TEXT,
      content_type TEXT,
      content_data TEXT,
      qr_code TEXT,
      access_token TEXT,
      is_private INTEGER DEFAULT 0,
      pin_code TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    );

    -- Box contents table
    CREATE TABLE IF NOT EXISTS box_contents (
      content_id INTEGER PRIMARY KEY AUTOINCREMENT,
      box_id INTEGER NOT NULL,
      content_type TEXT,
      content_data TEXT,
      content_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (box_id) REFERENCES boxes(box_id) ON DELETE CASCADE
    );

    -- Labels table
    CREATE TABLE IF NOT EXISTS labels (
      label_id INTEGER PRIMARY KEY AUTOINCREMENT,
      box_id INTEGER,
      label_name TEXT,
      is_private INTEGER DEFAULT 0,
      pin_code TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (box_id) REFERENCES boxes(box_id) ON DELETE CASCADE
    );

    -- Audit log table
    CREATE TABLE IF NOT EXISTS audit_log (
      log_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Sessions table (for express-session)
    CREATE TABLE IF NOT EXISTS sessions (
      session_id TEXT PRIMARY KEY,
      expires INTEGER,
      data TEXT
    );
  `);
  
  // Create default admin user if not exists
  const bcrypt = require('bcrypt');
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@moveout.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
  
  const existingAdmin = db.prepare('SELECT * FROM users WHERE email = ?').get(adminEmail);
  if (!existingAdmin) {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(adminPassword, salt);
    db.prepare(`
      INSERT INTO users (email, password_hash, profile_name, is_verified, is_active, is_admin) 
      VALUES (?, ?, ?, 1, 1, 1)
    `).run(adminEmail, hashedPassword, 'Admin');
    console.log(`✓ Default admin user created: ${adminEmail}`);
  }
  
  console.log('✓ SQLite schema initialized');
}

// Initialize schema on load
initializeSchema();

/**
 * MySQL-compatible connection wrapper
 * Provides async interface that matches mysql2/promise
 */
class SQLiteConnection {
  constructor() {
    this.db = db;
  }

  async query(sql, params = []) {
    try {
      // Convert PostgreSQL boolean literals to SQLite integers
      sql = sql.replace(/\bTRUE\b/gi, '1').replace(/\bFALSE\b/gi, '0');
      
      // Convert MySQL placeholders (?) to SQLite format (already compatible)
      // Handle INSERT...RETURNING for getting lastInsertRowid
      const isInsert = sql.trim().toUpperCase().startsWith('INSERT');
      const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
      const isUpdate = sql.trim().toUpperCase().startsWith('UPDATE');
      const isDelete = sql.trim().toUpperCase().startsWith('DELETE');

      if (isSelect) {
        const stmt = this.db.prepare(sql);
        const rows = stmt.all(...params);
        return [rows, []];
      } else if (isInsert) {
        const stmt = this.db.prepare(sql);
        const result = stmt.run(...params);
        return [{ insertId: result.lastInsertRowid, affectedRows: result.changes }, []];
      } else if (isUpdate || isDelete) {
        const stmt = this.db.prepare(sql);
        const result = stmt.run(...params);
        return [{ affectedRows: result.changes }, []];
      } else {
        // For other queries (CREATE, ALTER, etc.)
        this.db.exec(sql);
        return [{ affectedRows: 0 }, []];
      }
    } catch (error) {
      console.error('SQLite query error:', error);
      console.error('SQL:', sql);
      console.error('Params:', params);
      throw error;
    }
  }

  release() {
    // No-op for SQLite (single connection)
  }

  end() {
    // No-op for release, actual close handled separately
  }
}

/**
 * Pool-like interface for SQLite
 */
const pool = {
  async getConnection() {
    return new SQLiteConnection();
  },

  async query(sql, params = []) {
    const conn = new SQLiteConnection();
    return conn.query(sql, params);
  },

  async end() {
    db.close();
    console.log('SQLite database closed');
  }
};

module.exports = pool;
