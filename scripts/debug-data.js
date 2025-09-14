const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function debugData() {
  try {
    console.log('🔍 Debugging data...');
    
    // Check cars
    const cars = await pool.query('SELECT id, make, model, created_at FROM cars ORDER BY created_at DESC LIMIT 5');
    console.log('\n🚗 Recent cars:');
    console.table(cars.rows);
    
    // Check users
    const users = await pool.query('SELECT user_id, name, created_at FROM users ORDER BY created_at DESC LIMIT 5');
    console.log('\n👥 Recent users:');
    console.table(users.rows);
    
    // Check boost orders
    const boosts = await pool.query('SELECT order_id, car_id, status, boost_start_date, boost_end_date FROM boost_orders LIMIT 5');
    console.log('\n⭐ Boost orders:');
    console.table(boosts.rows);
    
    // Test a specific date calculation
    const testDate = new Date('2025-08-01');
    console.log(`\n📅 Testing calculations for ${testDate.toISOString().split('T')[0]}:`);
    
    const activeListings = await pool.query(`
      SELECT COUNT(*) as count 
      FROM cars 
      WHERE created_at <= $1
    `, [testDate]);
    console.log(`Active listings: ${activeListings.rows[0].count}`);
    
    const totalUsers = await pool.query(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE created_at <= $1
    `, [testDate]);
    console.log(`Total users: ${totalUsers.rows[0].count}`);
    
    const featuredListings = await pool.query(`
      SELECT COUNT(DISTINCT c.id) as count
      FROM cars c
      JOIN boost_orders bo ON c.id = bo.car_id
      WHERE bo.status = 'completed' 
      AND bo.boost_start_date <= $1
      AND bo.boost_end_date > $1
      AND c.created_at <= $1
    `, [testDate]);
    console.log(`Featured listings: ${featuredListings.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error debugging data:', error);
  } finally {
    await pool.end();
  }
}

debugData();
