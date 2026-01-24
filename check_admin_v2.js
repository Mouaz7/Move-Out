
const db = require('./config/db/database');

async function checkAdminUser() {
  try {
    const connection = await db.getConnection();
    const adminEmail = process.env.ADMIN_EMAIL || 'mouaz.naji.dev@gmail.com';
    console.log(`Checking status for: ${adminEmail}`);
    
    const [users] = await connection.query('SELECT user_id, email, is_active, is_admin FROM users WHERE email = ?', [adminEmail]);
    
    if (users.length > 0) {
      console.log('User found:', JSON.stringify(users[0], null, 2));
      console.log('is_active value:', users[0].is_active);
      console.log('is_active type:', typeof users[0].is_active);
    } else {
      console.log('User NOT found.');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.closeConnections();
  }
}

checkAdminUser();
