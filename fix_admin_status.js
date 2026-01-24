
const db = require('./config/db/database');

async function fixAdminStatus() {
  try {
    const connection = await db.getConnection();
    const adminEmail = process.env.ADMIN_EMAIL || 'mouaz.naji.dev@gmail.com';
    const backupEmail = 'admin@moveout.com';
    
    console.log(`Fixing status for: ${adminEmail}`);
    
    // 1. Force Activate Admin
    await connection.query(
      "UPDATE users SET is_active = 1, is_verified = 1, failed_login_attempts = 0, locked_until = NULL WHERE email = ?",
      [adminEmail]
    );
    console.log(`✓ Updated ${adminEmail} to ACTIVE (1)`);

    // 2. Force Activate Backup Admin (just in case)
    await connection.query(
      "UPDATE users SET is_active = 1, is_verified = 1, failed_login_attempts = 0, locked_until = NULL WHERE email = ?",
      [backupEmail]
    );
    console.log(`✓ Updated ${backupEmail} to ACTIVE (1)`);
    
    // 3. Verify
    const [users] = await connection.query("SELECT email, is_active, failed_login_attempts FROM users WHERE email = ?", [adminEmail]);
    if (users.length > 0) {
        console.log("Current State:", JSON.stringify(users[0], null, 2));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.closeConnections();
  }
}

fixAdminStatus();
