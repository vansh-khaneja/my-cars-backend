const pool = require('../config/database');

async function createBoostOrdersTable() {
  try {
    // Check if boost_orders table exists
    const checkTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'boost_orders'
      );
    `);

    if (checkTable.rows[0].exists) {
      console.log('boost_orders table already exists');
      return;
    }

    // Create boost_orders table
    await pool.query(`
      CREATE TABLE boost_orders (
        id SERIAL PRIMARY KEY,
        car_id INTEGER NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        boost_start_date TIMESTAMP,
        boost_end_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(car_id)
      );
    `);

    console.log('boost_orders table created successfully');
  } catch (error) {
    console.error('Error creating boost_orders table:', error);
  } finally {
    await pool.end();
  }
}

createBoostOrdersTable();
