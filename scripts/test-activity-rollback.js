const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testActivityRollback() {
  try {
    console.log('🔄 Testing activity rollback functionality...');
    
    // Check current count
    const beforeCount = await pool.query('SELECT COUNT(*) as count FROM activities');
    console.log(`📊 Activities before: ${beforeCount.rows[0].count}`);
    
    // Add a new activity (should trigger rollback)
    console.log('➕ Adding new activity...');
    await pool.query(`
      INSERT INTO activities (activity_type, action, description, user_name, reference_id)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      'listing_created',
      'New listing created', 
      '2024 BMW X5',
      'Test User',
      'car_test_123'
    ]);
    
    // Check count after
    const afterCount = await pool.query('SELECT COUNT(*) as count FROM activities');
    console.log(`📊 Activities after: ${afterCount.rows[0].count} (should still be 5)`);
    
    // Show current activities
    const activities = await pool.query(`
      SELECT id, activity_type, description, user_name, created_at
      FROM activities 
      ORDER BY created_at DESC
    `);
    
    console.log('\n📋 Current activities (should show newest first):');
    console.table(activities.rows.map(a => ({
      id: a.id,
      type: a.activity_type,
      description: a.description,
      user: a.user_name,
      created: a.created_at.toISOString().split('T')[1].split('.')[0]
    })));
    
    // Test with multiple additions
    console.log('\n🔄 Testing multiple additions...');
    for (let i = 1; i <= 3; i++) {
      await pool.query(`
        INSERT INTO activities (activity_type, action, description, user_name, reference_id)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        'user_registered',
        'New user registered',
        `User Test${i} joined the platform`,
        `Test User ${i}`,
        `user_test_${i}`
      ]);
    }
    
    const finalCount = await pool.query('SELECT COUNT(*) as count FROM activities');
    console.log(`📊 Final activities: ${finalCount.rows[0].count} (should still be 5)`);
    
    const finalActivities = await pool.query(`
      SELECT id, activity_type, description, user_name, created_at
      FROM activities 
      ORDER BY created_at DESC
    `);
    
    console.log('\n📋 Final activities (should show 3 newest Test users):');
    console.table(finalActivities.rows.map(a => ({
      id: a.id,
      type: a.activity_type,
      description: a.description,
      user: a.user_name,
      created: a.created_at.toISOString().split('T')[1].split('.')[0]
    })));
    
  } catch (error) {
    console.error('❌ Error testing rollback:', error);
  } finally {
    await pool.end();
  }
}

testActivityRollback();
