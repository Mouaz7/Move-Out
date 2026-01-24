
const db = require('./config/db/database');

async function checkAdminUser() {
  try {
    const connection = await db.getConnection();
    const adminEmail = process.env.ADMIN_EMAIL || 'mouaz.naji.dev@gmail.com';
    console.log(`Checking status for: ${adminEmail}`);
    
    const [users] = await connection.query('SELECT * FROM users WHERE email = ?', [adminEmail]);
    
    if (users.length > 0) {
      console.log('User found:', JSON.stringify(users[0], null, 2));
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
