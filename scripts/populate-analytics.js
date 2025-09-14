const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function populateAnalytics() {
  try {
    console.log('🔄 Starting analytics data population...');
    
    // First, let's check if we have any data in our tables
    const carsCount = await pool.query('SELECT COUNT(*) FROM cars');
    const usersCount = await pool.query('SELECT COUNT(*) FROM users');
    const boostCount = await pool.query('SELECT COUNT(*) FROM boost_orders');
    
    console.log(`📊 Found ${carsCount.rows[0].count} cars, ${usersCount.rows[0].count} users, ${boostCount.rows[0].count} boost orders`);
    
    if (parseInt(carsCount.rows[0].count) === 0 && parseInt(usersCount.rows[0].count) === 0) {
      console.log('⚠️  No data found in database. Creating sample data...');
      await createSampleData();
    }
    
    // Get date range for analytics (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    console.log(`📅 Populating analytics from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    
    // Generate analytics for each day
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const currentDate = new Date(d);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Calculate metrics for this date
      const activeListings = await pool.query(`
        SELECT COUNT(*) as count 
        FROM cars 
        WHERE created_at <= $1
      `, [currentDate]);
      
      const totalUsers = await pool.query(`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE created_at <= $1
      `, [currentDate]);
      
      const featuredListings = await pool.query(`
        SELECT COUNT(DISTINCT c.id) as count
        FROM cars c
        JOIN boost_orders bo ON c.id = bo.car_id
        WHERE bo.status = 'completed' 
        AND bo.boost_start_date <= $1
        AND bo.boost_end_date > $1
        AND c.created_at <= $1
      `, [currentDate]);
      
      const newListings = await pool.query(`
        SELECT COUNT(*) as count 
        FROM cars 
        WHERE DATE(created_at) = $1
      `, [dateStr]);
      
      const newUsers = await pool.query(`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE DATE(created_at) = $1
      `, [dateStr]);
      
      const totalListings = await pool.query(`
        SELECT COUNT(*) as count 
        FROM cars 
        WHERE created_at <= $1
      `, [currentDate]);
      
      // Insert or update analytics record
      await pool.query(`
        INSERT INTO analytics (
          date, active_listings, total_users, featured_listings, 
          new_listings, new_users, total_listings
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (date) 
        DO UPDATE SET
          active_listings = EXCLUDED.active_listings,
          total_users = EXCLUDED.total_users,
          featured_listings = EXCLUDED.featured_listings,
          new_listings = EXCLUDED.new_listings,
          new_users = EXCLUDED.new_users,
          total_listings = EXCLUDED.total_listings,
          updated_at = CURRENT_TIMESTAMP
      `, [
        dateStr,
        parseInt(activeListings.rows[0].count),
        parseInt(totalUsers.rows[0].count),
        parseInt(featuredListings.rows[0].count),
        parseInt(newListings.rows[0].count),
        parseInt(newUsers.rows[0].count),
        parseInt(totalListings.rows[0].count)
      ]);
      
      if (currentDate.getDate() % 10 === 0) {
        console.log(`✅ Processed ${dateStr}`);
      }
    }
    
    console.log('🎉 Analytics data population completed!');
    
    // Show some sample data
    const sampleData = await pool.query(`
      SELECT date, active_listings, total_users, featured_listings 
      FROM analytics 
      ORDER BY date DESC 
      LIMIT 5
    `);
    
    console.log('\n📈 Sample analytics data:');
    console.table(sampleData.rows);
    
  } catch (error) {
    console.error('❌ Error populating analytics:', error);
  } finally {
    await pool.end();
  }
}

async function createSampleData() {
  console.log('🔧 Creating sample data...');
  
  // Create sample users
  const users = [
    { user_id: 'user1', name: 'John Doe', email: 'john@example.com', password_hash: 'hashed_password_1' },
    { user_id: 'user2', name: 'Jane Smith', email: 'jane@example.com', password_hash: 'hashed_password_2' },
    { user_id: 'user3', name: 'Bob Johnson', email: 'bob@example.com', password_hash: 'hashed_password_3' },
    { user_id: 'user4', name: 'Alice Brown', email: 'alice@example.com', password_hash: 'hashed_password_4' },
    { user_id: 'user5', name: 'Charlie Wilson', email: 'charlie@example.com', password_hash: 'hashed_password_5' }
  ];
  
  for (const user of users) {
    await pool.query(`
      INSERT INTO users (user_id, name, email, password_hash, created_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id) DO NOTHING
    `, [user.user_id, user.name, user.email, user.password_hash, new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000)]);
  }
  
  // Create sample cars
  const cars = [
    { make: 'Toyota', model: 'Camry', year: 2020, price: 25000, seller_id: 'user1', seller_name: 'John Doe' },
    { make: 'Honda', model: 'Civic', year: 2019, price: 22000, seller_id: 'user2', seller_name: 'Jane Smith' },
    { make: 'Ford', model: 'Focus', year: 2021, price: 18000, seller_id: 'user3', seller_name: 'Bob Johnson' },
    { make: 'BMW', model: '3 Series', year: 2020, price: 35000, seller_id: 'user4', seller_name: 'Alice Brown' },
    { make: 'Audi', model: 'A4', year: 2019, price: 32000, seller_id: 'user5', seller_name: 'Charlie Wilson' }
  ];
  
  for (const car of cars) {
    const randomDaysAgo = Math.floor(Math.random() * 90);
    const created_at = new Date(Date.now() - randomDaysAgo * 24 * 60 * 60 * 1000);
    
    await pool.query(`
      INSERT INTO cars (make, model, year, price, seller_id, seller_name, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [car.make, car.model, car.year, car.price, car.seller_id, car.seller_name, created_at]);
  }
  
  // Create some boost orders
  const boostOrders = [
    { order_id: 'boost1', user_id: 'user1', car_id: 1, status: 'completed' },
    { order_id: 'boost2', user_id: 'user4', car_id: 4, status: 'completed' }
  ];
  
  for (const boost of boostOrders) {
    const boost_start = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    const boost_end = new Date(boost_start.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    await pool.query(`
      INSERT INTO boost_orders (order_id, user_id, car_id, status, boost_start_date, boost_end_date)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (order_id) DO NOTHING
    `, [boost.order_id, boost.user_id, boost.car_id, boost.status, boost_start, boost_end]);
  }
  
  console.log('✅ Sample data created successfully!');
}

// Run the script
populateAnalytics();
