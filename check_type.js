
const db = require('./config/db/database');

async function checkType() {
  try {
    const connection = await db.getConnection();
    const adminEmail = process.env.ADMIN_EMAIL || 'mouaz.naji.dev@gmail.com';
    
    const [users] = await connection.query("SELECT is_active FROM users WHERE email = ?", [adminEmail]);
    
    if (users.length > 0) {
      const val = users[0].is_active;
      console.log(`VALUE: ${val}`);
      console.log(`TYPE: ${typeof val}`);
    } else {
      console.log("User not found");
    }
  } catch (err) {
    console.error(err);
  } finally {
    await db.closeConnections();
  }
}

checkType();
