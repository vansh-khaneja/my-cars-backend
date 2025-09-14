const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkMetadata() {
  try {
    const result = await pool.query('SELECT metadata FROM activities LIMIT 3');
    console.log('Metadata samples:');
    result.rows.forEach((row, i) => {
      console.log(`${i+1}:`, typeof row.metadata, row.metadata);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkMetadata();
