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
          
          const result = await client.query(pgSql, pgParams);
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

module.exports = {
  getConnection,
  query,
  getPool,
  healthCheck,
  closeConnections,
  isUsingSQLite: () => !isProduction,
  isUsingPostgreSQL: () => isProduction,
};

