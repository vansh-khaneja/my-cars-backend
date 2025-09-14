const { Pool } = require('pg');
const moment = require('moment');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function addTestActivities() {
  try {
    console.log('Adding test activities with different timestamps...');
    
    // Clear existing activities first
    await pool.query('DELETE FROM activities');
    console.log('Cleared existing activities');
    
    // Add activities with different timestamps
    const activities = [
      {
        type: 'listing_created',
        action: 'New listing created',
        description: '2020 Honda Civic was listed',
        user: 'John Doe',
        referenceId: 'car_123',
        metadata: { carId: 123, price: 15000 },
        createdAt: moment().subtract(2, 'hours').toDate()
      },
      {
        type: 'user_registered',
        action: 'New user registered',
        description: 'User Sarah joined the platform',
        user: 'Sarah',
        referenceId: 'user_456',
        metadata: { userId: 456, email: 'sarah@example.com' },
        createdAt: moment().subtract(1, 'day').toDate()
      },
      {
        type: 'listing_boosted',
        action: 'Listing boosted',
        description: '2019 Toyota Camry was featured',
        user: 'Mike Johnson',
        referenceId: 'boost_789',
        metadata: { carId: 789, orderId: 'boost_789', amount: 50 },
        createdAt: moment().subtract(3, 'days').toDate()
      },
      {
        type: 'listing_created',
        action: 'New listing created',
        description: '2021 Tesla Model 3 was listed',
        user: 'Alex Chen',
        referenceId: 'car_101',
        metadata: { carId: 101, price: 45000 },
        createdAt: moment().subtract(1, 'week').toDate()
      },
      {
        type: 'user_registered',
        action: 'New user registered',
        description: 'User Emma joined the platform',
        user: 'Emma',
        referenceId: 'user_202',
        metadata: { userId: 202, email: 'emma@example.com' },
        createdAt: moment().subtract(2, 'weeks').toDate()
      }
    ];
    
    for (const activity of activities) {
      await pool.query(`
        INSERT INTO activities (activity_type, action, description, user_name, reference_id, metadata, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        activity.type,
        activity.action,
        activity.description,
        activity.user,
        activity.referenceId,
        JSON.stringify(activity.metadata),
        activity.createdAt
      ]);
    }
    
    console.log('Added 5 test activities with different timestamps');
    
    // Show the results
    const result = await pool.query(`
      SELECT id, activity_type, description, created_at 
      FROM activities 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log('\nCurrent activities:');
    result.rows.forEach((row, i) => {
      console.log(`${i+1}. ${row.description}`);
      console.log(`   Type: ${row.activity_type}`);
      console.log(`   Created: ${row.created_at}`);
      console.log(`   Time ago: ${moment(row.created_at).fromNow()}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('Error adding test activities:', error);
  } finally {
    await pool.end();
  }
}

addTestActivities();
