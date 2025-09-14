const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkAnalytics() {
  try {
    console.log('🔍 Checking analytics data...');
    
    const result = await pool.query(`
      SELECT date, active_listings, total_users, featured_listings 
      FROM analytics 
      ORDER BY date DESC 
      LIMIT 10
    `);
    
    console.log('📊 Recent analytics data:');
    console.table(result.rows);
    
    const count = await pool.query('SELECT COUNT(*) FROM analytics');
    console.log(`\n📈 Total analytics records: ${count.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error checking analytics:', error);
  } finally {
    await pool.end();
  }
}

checkAnalytics();
