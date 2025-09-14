const pool = require('../config/database');

async function addExpirationToCars() {
  try {
    // Check if expiration_date column already exists
    const checkColumn = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'cars' 
        AND column_name = 'expiration_date'
      );
    `);

    if (checkColumn.rows[0].exists) {
      console.log('expiration_date column already exists');
      return;
    }

    // Add expiration_date column
    await pool.query(`
      ALTER TABLE cars 
      ADD COLUMN expiration_date TIMESTAMP DEFAULT (NOW() + INTERVAL '60 days')
    `);

    // Update existing cars to have 60 days from their creation date
    await pool.query(`
      UPDATE cars 
      SET expiration_date = created_at + INTERVAL '60 days' 
      WHERE expiration_date IS NULL
    `);

    console.log('expiration_date column added successfully');
    console.log('Existing cars updated with 60-day expiration from creation date');
  } catch (error) {
    console.error('Error adding expiration_date column:', error);
  } finally {
    await pool.end();
  }
}

addExpirationToCars();
