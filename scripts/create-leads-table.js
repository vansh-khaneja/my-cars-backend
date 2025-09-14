const pool = require('../config/database');

async function createLeadsTable() {
  try {
    // Check if leads table exists
    const checkTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'leads'
      );
    `);

    if (checkTable.rows[0].exists) {
      console.log('leads table already exists');
      return;
    }

    // Create leads table
    await pool.query(`
      CREATE TABLE leads (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        message TEXT,
        listing_id VARCHAR(50),
        status VARCHAR(20) NOT NULL DEFAULT 'new',
        priority VARCHAR(10) NOT NULL DEFAULT 'medium',
        assigned_to VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('leads table created successfully');
  } catch (error) {
    console.error('Error creating leads table:', error);
  } finally {
    await pool.end();
  }
}

createLeadsTable();
