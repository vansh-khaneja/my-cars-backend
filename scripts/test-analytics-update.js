const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testAnalyticsUpdate() {
  try {
    console.log('🧪 Testing analytics auto-update...');
    
    // Check current analytics before
    const beforeResult = await pool.query(`
      SELECT active_listings, total_users, featured_listings 
      FROM analytics 
      WHERE date = CURRENT_DATE
    `);
    
    console.log('📊 Analytics BEFORE test:');
    if (beforeResult.rows.length > 0) {
      console.table(beforeResult.rows);
    } else {
      console.log('No analytics data for today');
    }
    
    // Get an existing user first
    const userResult = await pool.query('SELECT user_id, name FROM users LIMIT 1');
    if (userResult.rows.length === 0) {
      console.log('❌ No users found in database');
      return;
    }
    const existingUser = userResult.rows[0];
    
    // Create a test car
    console.log('\n🚗 Creating test car...');
    const testCar = await pool.query(`
      INSERT INTO cars (make, model, year, price, seller_id, seller_name, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, make, model, created_at
    `, ['Test', 'Analytics Car', 2024, 25000, existingUser.user_id, existingUser.name, 'Testing analytics update']);
    
    console.log('✅ Test car created:', testCar.rows[0]);
    
    // Wait a moment for triggers to execute
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check analytics after
    const afterResult = await pool.query(`
      SELECT active_listings, total_users, featured_listings 
      FROM analytics 
      WHERE date = CURRENT_DATE
    `);
    
    console.log('\n📊 Analytics AFTER test:');
    if (afterResult.rows.length > 0) {
      console.table(afterResult.rows);
    } else {
      console.log('No analytics data for today');
    }
    
    // Clean up test car
    console.log('\n🧹 Cleaning up test car...');
    await pool.query('DELETE FROM cars WHERE make = $1 AND model = $2', ['Test', 'Analytics Car']);
    console.log('✅ Test car deleted');
    
    // Check analytics after cleanup
    const cleanupResult = await pool.query(`
      SELECT active_listings, total_users, featured_listings 
      FROM analytics 
      WHERE date = CURRENT_DATE
    `);
    
    console.log('\n📊 Analytics AFTER cleanup:');
    if (cleanupResult.rows.length > 0) {
      console.table(cleanupResult.rows);
    } else {
      console.log('No analytics data for today');
    }
    
    console.log('\n🎉 Analytics auto-update test completed!');
    
  } catch (error) {
    console.error('❌ Error testing analytics:', error);
  } finally {
    await pool.end();
  }
}

testAnalyticsUpdate();
