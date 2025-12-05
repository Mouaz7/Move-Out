"use strict";
const { Pool } = require("pg");
require("dotenv").config();

// Database configuration from environment variables
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
};

// Fallback for local development
if (!process.env.DATABASE_URL) {
  dbConfig.host = process.env.DB_HOST || "localhost";
  dbConfig.port = parseInt(process.env.DB_PORT) || 5432;
  dbConfig.user = process.env.DB_USER || "postgres";
  dbConfig.password = process.env.DB_PASSWORD || "password";
  dbConfig.database = process.env.DB_NAME || "moveout";
  delete dbConfig.connectionString;
}

// Centralized connection pool
const pool = new Pool(dbConfig);

// Helper function to get a client from the pool
async function getConnection() {
  try {
    const client = await pool.connect();
    return client;
  } catch (error) {
    console.error("Database connection failed:", error);
    throw error;
  }
}

// Helper to convert MySQL ? placeholders to PostgreSQL $1, $2, etc.
function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, getConnection, query, dbConfig };
