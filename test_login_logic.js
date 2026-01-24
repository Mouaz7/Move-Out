
const db = require('./config/db/database');

async function testLoginLogic() {
  try {
    const connection = await db.getConnection();
    const adminEmail = process.env.ADMIN_EMAIL || 'mouaz.naji.dev@gmail.com';
    console.log(`Testing login logic for: ${adminEmail}`);
    
    // Simulate the query from routes/auth.js
    const [users] = await connection.query("SELECT * FROM users WHERE email = ?", [adminEmail]);
    
    if (users.length === 0) {
      console.log("User not found.");
      return;
    }

    const user = users[0];
    
    console.log("User object:", JSON.stringify(user, null, 2));
    console.log("is_active value:", user.is_active);
    console.log("is_active type:", typeof user.is_active);
    
    // Exact logic from auth.js
    const isActive = user.is_active === true || user.is_active === 1;
    
    console.log("Evaluation: user.is_active === true", user.is_active === true);
    console.log("Evaluation: user.is_active === 1", user.is_active === 1);
    console.log("Final isActive result:", isActive);
    
    if (!isActive) {
      console.log("FAILURE: This user WOULD receive the deactivated error.");
    } else {
      console.log("SUCCESS: This user should be able to login.");
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.closeConnections();
  }
}

testLoginLogic();
