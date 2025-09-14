const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function setupTrueHistoricalAnalytics() {
  try {
    console.log('🔄 Setting up true historical analytics tracking...');
    
    // Create improved analytics table with better indexing
    await pool.query(`
      DROP TABLE IF EXISTS analytics CASCADE;
      
      CREATE TABLE analytics (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL UNIQUE,
        active_listings INTEGER DEFAULT 0,
        total_users INTEGER DEFAULT 0,
        featured_listings INTEGER DEFAULT 0,
        new_listings INTEGER DEFAULT 0,
        new_users INTEGER DEFAULT 0,
        total_listings INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX idx_analytics_date ON analytics(date);
      CREATE INDEX idx_analytics_active_listings ON analytics(active_listings);
      CREATE INDEX idx_analytics_total_users ON analytics(total_users);
      CREATE INDEX idx_analytics_featured_listings ON analytics(featured_listings);
    `);
    
    console.log('✅ Analytics table recreated with better structure');
    
    // Create function to update analytics for a specific date
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_analytics_for_date(target_date DATE)
      RETURNS VOID AS $$
      DECLARE
        active_count INTEGER;
        total_users_count INTEGER;
        featured_count INTEGER;
        new_listings_count INTEGER;
        new_users_count INTEGER;
        total_listings_count INTEGER;
      BEGIN
        -- Calculate active listings (cars that haven't expired)
        SELECT COUNT(*) INTO active_count 
        FROM cars 
        WHERE expiration_date > NOW();
        
        -- Calculate total users
        SELECT COUNT(*) INTO total_users_count 
        FROM users;
        
        -- Calculate featured listings (boosted and active)
        SELECT COUNT(DISTINCT c.id) INTO featured_count
        FROM cars c
        JOIN boost_orders bo ON c.id = bo.car_id
        WHERE bo.status = 'completed' 
        AND bo.boost_end_date > NOW();
        
        -- Calculate new listings for the target date
        SELECT COUNT(*) INTO new_listings_count
        FROM cars 
        WHERE DATE(created_at) = target_date;
        
        -- Calculate new users for the target date
        SELECT COUNT(*) INTO new_users_count
        FROM users 
        WHERE DATE(created_at) = target_date;
        
        total_listings_count := active_count;
        
        -- Insert or update analytics record
        INSERT INTO analytics (
          date, active_listings, total_users, featured_listings, 
          new_listings, new_users, total_listings
        ) VALUES (
          target_date, active_count, total_users_count, featured_count,
          new_listings_count, new_users_count, total_listings_count
        )
        ON CONFLICT (date) 
        DO UPDATE SET
          active_listings = EXCLUDED.active_listings,
          total_users = EXCLUDED.total_users,
          featured_listings = EXCLUDED.featured_listings,
          new_listings = EXCLUDED.new_listings,
          new_users = EXCLUDED.new_users,
          total_listings = EXCLUDED.total_listings,
          updated_at = CURRENT_TIMESTAMP;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Create function to clean up old analytics data (older than 30 days)
    await pool.query(`
      CREATE OR REPLACE FUNCTION cleanup_old_analytics()
      RETURNS VOID AS $$
      BEGIN
        DELETE FROM analytics 
        WHERE date < CURRENT_DATE - INTERVAL '30 days';
        
        RAISE NOTICE 'Cleaned up analytics data older than 30 days';
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Create function to update current day analytics
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_current_analytics()
      RETURNS VOID AS $$
      BEGIN
        -- Update today's analytics
        PERFORM update_analytics_for_date(CURRENT_DATE);
        
        -- Clean up old data
        PERFORM cleanup_old_analytics();
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Create trigger function for real-time updates
    await pool.query(`
      CREATE OR REPLACE FUNCTION trigger_update_analytics()
      RETURNS TRIGGER AS $$
      BEGIN
        PERFORM update_current_analytics();
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Create triggers for real-time updates
    await pool.query(`
      DROP TRIGGER IF EXISTS cars_analytics_trigger ON cars;
      DROP TRIGGER IF EXISTS users_analytics_trigger ON users;
      DROP TRIGGER IF EXISTS boost_orders_analytics_trigger ON boost_orders;
      
      CREATE TRIGGER cars_analytics_trigger
        AFTER INSERT OR UPDATE OR DELETE ON cars
        FOR EACH STATEMENT
        EXECUTE FUNCTION trigger_update_analytics();
      
      CREATE TRIGGER users_analytics_trigger
        AFTER INSERT OR UPDATE OR DELETE ON users
        FOR EACH STATEMENT
        EXECUTE FUNCTION trigger_update_analytics();
      
      CREATE TRIGGER boost_orders_analytics_trigger
        AFTER INSERT OR UPDATE OR DELETE ON boost_orders
        FOR EACH STATEMENT
        EXECUTE FUNCTION trigger_update_analytics();
    `);
    
    console.log('✅ Triggers created for real-time updates');
    
    // Populate historical data for the last 30 days
    console.log('📊 Populating historical data...');
    
    for (let i = 0; i < 30; i++) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - i);
      const targetDateStr = targetDate.toISOString().split('T')[0];
      
      await pool.query('SELECT update_analytics_for_date($1)', [targetDateStr]);
    }
    
    console.log('✅ Historical data populated for last 30 days');
    
    // Show sample data
    const sampleData = await pool.query(`
      SELECT date, active_listings, total_users, featured_listings 
      FROM analytics 
      ORDER BY date DESC 
      LIMIT 10
    `);
    
    console.log('\n📈 Sample analytics data:');
    console.table(sampleData.rows);
    
    // Test the cleanup function
    await pool.query('SELECT cleanup_old_analytics()');
    console.log('✅ Old data cleanup tested');
    
  } catch (error) {
    console.error('❌ Error setting up historical analytics:', error);
  } finally {
    await pool.end();
  }
}

setupTrueHistoricalAnalytics();
