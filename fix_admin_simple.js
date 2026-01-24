
const db = require('./config/db/database');

async function fixAdminSimple() {
  try {
    const connection = await db.getConnection();
    const adminEmail = process.env.ADMIN_EMAIL || 'mouaz.naji.dev@gmail.com';
    
    console.log(`Fixing status for: ${adminEmail}`);
    
    // Update is_active
    await connection.query(
      "UPDATE users SET is_active = 1 WHERE email = ?",
      [adminEmail]
    );
    console.log(`✓ is_active set to 1`);

    // Reset failed attempts
    await connection.query(
      "UPDATE users SET failed_login_attempts = 0 WHERE email = ?",
      [adminEmail]
    );
    console.log(`✓ failed_login_attempts set to 0`);

     // Reset locked_until
    await connection.query(
      "UPDATE users SET locked_until = NULL WHERE email = ?",
      [adminEmail]
    );
    console.log(`✓ locked_until set to NULL`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.closeConnections();
  }
}

fixAdminSimple();
