const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

/**
 * Supabase client configuration for cloud PostgreSQL database
 * Used when NODE_ENV=production
 */

let supabaseClient = null;

// Initialize Supabase client
function initializeSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase credentials not found. Cloud database will not be available.");
    return null;
  }

  try {
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false, // We handle sessions with Express
      },
    });
    console.log("✓ Supabase client initialized");
    return supabaseClient;
  } catch (error) {
    console.error("Failed to initialize Supabase:", error);
    return null;
  }
}

// Get Supabase client instance
function getSupabaseClient() {
  if (!supabaseClient) {
    return initializeSupabase();
  }
  return supabaseClient;
}

// Execute query on Supabase PostgreSQL
async function executeSupabaseQuery(query, params = []) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase client not initialized");
  }

  // Note: Supabase uses its own query builder, but we'll need to adapt SQL queries
  // This is a placeholder - actual implementation will depend on query structure
  console.warn("Direct SQL queries on Supabase require connection string with pg library");
  throw new Error("Use Supabase query builder or pg library for raw queries");
}

// Get PostgreSQL connection string for raw queries
function getSupabaseConnectionString() {
  return process.env.SUPABASE_DB_URL || null;
}

module.exports = {
  initializeSupabase,
  getSupabaseClient,
  executeSupabaseQuery,
  getSupabaseConnectionString,
};
