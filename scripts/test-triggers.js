const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testTriggers() {
  try {
    console.log('🧪 Testing database triggers...');
    
    // Check if triggers exist
    const triggerResult = await pool.query(`
      SELECT trigger_name, event_manipulation, event_object_table 
      FROM information_schema.triggers 
      WHERE trigger_name LIKE '%analytics%'
    `);
    
    console.log('📋 Existing triggers:');
    console.table(triggerResult.rows);
    
    // Test the update function manually
    console.log('\n🔄 Testing update_recent_analytics() function...');
    await pool.query('SELECT update_recent_analytics()');
    console.log('✅ Function executed successfully');
    
    // Check analytics after manual update
    const analyticsResult = await pool.query(`
      SELECT date, active_listings, total_users, featured_listings 
      FROM analytics 
      WHERE date = CURRENT_DATE
    `);
    
    console.log('\n📊 Analytics after manual update:');
    if (analyticsResult.rows.length > 0) {
      console.table(analyticsResult.rows);
    } else {
      console.log('No analytics data for today');
    }
    
    // Test creating a car and see if trigger fires
    console.log('\n🚗 Testing car creation with trigger...');
    const userResult = await pool.query('SELECT user_id, name FROM users LIMIT 1');
    const existingUser = userResult.rows[0];
    
    const beforeCount = await pool.query('SELECT COUNT(*) as count FROM cars');
    console.log(`Cars before: ${beforeCount.rows[0].count}`);
    
    const testCar = await pool.query(`
      INSERT INTO cars (make, model, year, price, seller_id, seller_name, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, ['Trigger Test', 'Car', 2024, 30000, existingUser.user_id, existingUser.name, 'Testing triggers']);
    
    console.log(`✅ Car created with ID: ${testCar.rows[0].id}`);
    
    const afterCount = await pool.query('SELECT COUNT(*) as count FROM cars');
    console.log(`Cars after: ${afterCount.rows[0].count}`);
    
    // Check analytics after car creation
    const afterAnalytics = await pool.query(`
      SELECT date, active_listings, total_users, featured_listings 
      FROM analytics 
      WHERE date = CURRENT_DATE
    `);
    
    console.log('\n📊 Analytics after car creation:');
    if (afterAnalytics.rows.length > 0) {
      console.table(afterAnalytics.rows);
    } else {
      console.log('No analytics data for today');
    }
    
    // Clean up
    await pool.query('DELETE FROM cars WHERE make = $1', ['Trigger Test']);
    console.log('🧹 Test car cleaned up');
    
  } catch (error) {
    console.error('❌ Error testing triggers:', error);
  } finally {
    await pool.end();
  }
}

testTriggers();
