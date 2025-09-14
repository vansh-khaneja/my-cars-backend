const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testRollover() {
  try {
    console.log('🔄 Testing analytics rollover functionality...');
    
    // Check current analytics data
    const currentData = await pool.query(`
      SELECT COUNT(*) as count, MIN(date) as oldest, MAX(date) as newest
      FROM analytics
    `);
    
    console.log('📊 Current analytics data:');
    console.log(`- Total records: ${currentData.rows[0].count}`);
    console.log(`- Date range: ${currentData.rows[0].oldest} to ${currentData.rows[0].newest}`);
    
    // Test the cleanup function
    console.log('\n🧹 Testing cleanup function...');
    await pool.query('SELECT cleanup_old_analytics()');
    
    // Check data after cleanup
    const afterCleanup = await pool.query(`
      SELECT COUNT(*) as count, MIN(date) as oldest, MAX(date) as newest
      FROM analytics
    `);
    
    console.log('📊 After cleanup:');
    console.log(`- Total records: ${afterCleanup.rows[0].count}`);
    console.log(`- Date range: ${afterCleanup.rows[0].oldest} to ${afterCleanup.rows[0].newest}`);
    
    // Show sample data
    const sampleData = await pool.query(`
      SELECT date, active_listings, total_users, featured_listings 
      FROM analytics 
      ORDER BY date DESC 
      LIMIT 5
    `);
    
    console.log('\n📈 Sample data:');
    console.table(sampleData.rows);
    
    // Test different period queries
    console.log('\n🔍 Testing period queries:');
    
    const periods = [7, 15, 30];
    for (const period of periods) {
      const result = await pool.query(`
        SELECT COUNT(*) as count
        FROM analytics 
        WHERE date >= CURRENT_DATE - INTERVAL '${period} days'
      `);
      console.log(`- ${period} days: ${result.rows[0].count} records`);
    }
    
  } catch (error) {
    console.error('❌ Error testing rollover:', error);
  } finally {
    await pool.end();
  }
}

testRollover();
