const pool = require('../config/database');

async function checkTable() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'boost_orders' 
      ORDER BY ordinal_position
    `);
    
    console.log('boost_orders table structure:');
    console.table(result.rows);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkTable();
