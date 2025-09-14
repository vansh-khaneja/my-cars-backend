const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

async function createAdminUser() {
  try {
    console.log('Creating admin user...');
    
    // Check if admin user already exists
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', ['admin@mycars.com']);
    
    if (existingUser.rows.length > 0) {
      console.log('Admin user already exists');
      return;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Create admin user
    const result = await pool.query(
      'INSERT INTO users (user_id, name, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING *',
      ['admin-001', 'Admin User', 'admin@mycars.com', hashedPassword]
    );
    
    console.log('Admin user created successfully:', result.rows[0]);
    
    // Generate a test token
    const token = jwt.sign(
      { 
        user_id: result.rows[0].user_id, 
        email: result.rows[0].email,
        name: result.rows[0].name
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log('Test token:', token);
    console.log('You can use this token for testing API calls');
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await pool.end();
  }
}

createAdminUser();
