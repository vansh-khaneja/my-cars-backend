const { Pool } = require('pg');

async function fixContentTable() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Fixing content table...');
    
    // Drop the foreign key constraint
    await pool.query('ALTER TABLE content DROP CONSTRAINT IF EXISTS content_author_id_fkey');
    
    console.log('Foreign key constraint removed successfully');
    
    // Create a simple admin user if it doesn't exist
    await pool.query(`
      INSERT INTO users (user_id, username, email, password_hash, role, created_at)
      VALUES ('admin-001', 'admin', 'admin@mycars.com', '$2b$10$dummy', 'admin', NOW())
      ON CONFLICT (user_id) DO NOTHING
    `);
    
    console.log('Admin user created/verified');
    
    // Re-add the foreign key constraint
    await pool.query(`
      ALTER TABLE content 
      ADD CONSTRAINT content_author_id_fkey 
      FOREIGN KEY (author_id) REFERENCES users(user_id)
    `);
    
    console.log('Foreign key constraint re-added successfully');
    
  } catch (error) {
    console.error('Error fixing content table:', error);
  } finally {
    await pool.end();
  }
}

fixContentTable();
