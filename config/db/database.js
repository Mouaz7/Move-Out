const { Pool } = require("pg");
const { getSupabaseConnectionString } = require("./supabase");
require("dotenv").config();

/**
 * Database abstraction layer
 * Supports SQLite (local development) and PostgreSQL/Supabase (cloud production)
 * Automatically selects database based on NODE_ENV
 */

const isProduction = process.env.NODE_ENV === "production";

let sqlitePool = null;
let postgresPool = null;

// Initialize SQLite pool for local development
function initializeSQLitePool() {
  if (sqlitePool) return sqlitePool;
  
  sqlitePool = require("./sqlitePool");
  return sqlitePool;
}

// Initialize PostgreSQL pool for cloud deployment
function initializePostgreSQLPool() {
  if (postgresPool) return postgresPool;

  const connectionString = getSupabaseConnectionString();
  if (!connectionString) {
    throw new Error("SUPABASE_DB_URL not configured for PostgreSQL connection");
  }

  postgresPool = new Pool({
    connectionString: connectionString,
    ssl: {
      // Use proper SSL verification if DB_SSL_REJECT_UNAUTHORIZED is set
      // Supabase and many cloud providers require false for self-signed certs
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === "true",
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  console.log("✓ PostgreSQL connection pool initialized");
  return postgresPool;
}

// Get active database pool
function getPool() {
  if (isProduction) {
    return initializePostgreSQLPool();
  } else {
    return initializeSQLitePool();
  }
}

// Get database connection
async function getConnection() {
  try {
    const pool = getPool();
    
    if (!isProduction) {
      // SQLite - use our adapter
      const connection = await pool.getConnection();
      return connection;
    } else {
      // For PostgreSQL, return a client from the pool
      const client = await pool.connect();
      // Wrap client to match MySQL interface
      return {
        query: async (sql, params) => {
          // Convert MySQL ? placeholders to PostgreSQL $1, $2, etc.
          let pgSql = sql;
          let pgParams = params || [];
          
          if (params && params.length > 0) {
            let paramIndex = 1;
            pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
          }
          
          // For INSERT queries, add RETURNING * if not present to get insertId
          const isInsert = pgSql.trim().toUpperCase().startsWith("INSERT");
          if (isInsert && !pgSql.toUpperCase().includes("RETURNING")) {
            pgSql += " RETURNING *";
          }
          
          const result = await client.query(pgSql, pgParams);
          
          // For INSERT, simulate MySQL insertId
          if (isInsert && result.rows.length > 0) {
            const firstRow = result.rows[0];
            // Find the ID column (usually first column ending with _id)
            const idKey = Object.keys(firstRow).find(k => k.endsWith("_id")) || Object.keys(firstRow)[0];
            return [{ insertId: firstRow[idKey], affectedRows: result.rowCount }, result.fields];
          }
          
          // For UPDATE/DELETE, return affectedRows
          if (pgSql.trim().toUpperCase().startsWith("UPDATE") || 
              pgSql.trim().toUpperCase().startsWith("DELETE")) {
            return [{ affectedRows: result.rowCount }, result.fields];
          }
          
          // Return in MySQL format [rows, fields]
          return [result.rows, result.fields];
        },
        release: () => client.release(),
        end: () => client.release(),
      };
    }
  } catch (error) {
    console.error("Database connection failed:", error);
    throw error;
  }
}

// Execute query with automatic connection management
async function query(sql, params) {
  const connection = await getConnection();
  try {
    const [rows] = await connection.query(sql, params);
    return rows;
  } finally {
    connection.release();
  }
}

// Health check for database connection
async function healthCheck() {
  try {
    const connection = await getConnection();
    await connection.query("SELECT 1");
    connection.release();
    return {
      status: "healthy",
      database: isProduction ? "PostgreSQL" : "SQLite",
      environment: process.env.NODE_ENV || "development",
    };
  } catch (error) {
    return {
      status: "unhealthy",
      database: isProduction ? "PostgreSQL" : "SQLite",
      error: error.message,
    };
  }
}

// Close all database connections
async function closeConnections() {
  if (sqlitePool) {
    await sqlitePool.end();
    console.log("SQLite pool closed");
  }
  if (postgresPool) {
    await postgresPool.end();
    console.log("PostgreSQL pool closed");
  }
}

/**
 * Initialize admin user for PostgreSQL (production)
 * Uses ADMIN_EMAIL and ADMIN_PASSWORD from environment variables
 * This ensures only the owner can access admin panel
 */
async function initializeAdmin() {
  if (!isProduction) {
    // SQLite handles this in sqlitePool.js
    return;
  }

  const bcrypt = require("bcrypt");
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.log("⚠ ADMIN_EMAIL or ADMIN_PASSWORD not set - skipping admin creation");
    return;
  }

  let connection;
  try {
    connection = await getConnection();
    
    // Check if admin already exists
    const [existingUsers] = await connection.query(
      "SELECT user_id FROM users WHERE email = ?",
      [adminEmail]
    );

    if (existingUsers && existingUsers.length > 0) {
      // Update existing user to be admin
      await connection.query(
        "UPDATE users SET is_admin = TRUE WHERE email = ?",
        [adminEmail]
      );
      console.log(`✓ Admin status confirmed for: ${adminEmail}`);
    } else {
      // Create new admin user
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);
      
      await connection.query(
        `INSERT INTO users (email, password_hash, profile_name, is_verified, is_active, is_admin) 
         VALUES (?, ?, ?, TRUE, TRUE, TRUE)`,
        [adminEmail, hashedPassword, "Admin"]
      );
      console.log(`✓ Admin user created: ${adminEmail}`);
    }
  } catch (error) {
    console.error("Error initializing admin:", error.message);
  } finally {
    if (connection) connection.release();
  }
}

module.exports = {
  getConnection,
  query,
  getPool,
  healthCheck,
  closeConnections,
  initializeAdmin,
  isUsingSQLite: () => !isProduction,
  isUsingPostgreSQL: () => isProduction,
};

