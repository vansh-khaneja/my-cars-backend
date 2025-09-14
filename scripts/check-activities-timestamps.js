const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkActivities() {
  try {
    console.log('Checking activities with timestamps:');
    const result = await pool.query(`
      SELECT id, activity_type, description, created_at 
      FROM activities 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    result.rows.forEach((row, i) => {
      console.log(`${i+1}. ${row.description}`);
      console.log(`   Type: ${row.activity_type}`);
      console.log(`   Created: ${row.created_at}`);
      console.log(`   Time ago: ${getTimeAgo(row.created_at)}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('Error checking activities:', error);
  } finally {
    await pool.end();
  }
}

function getTimeAgo(timestamp) {
  const moment = require('moment');
  return moment(timestamp).fromNow();
}

checkActivities();
