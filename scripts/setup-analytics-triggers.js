const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function setupAnalyticsTriggers() {
  try {
    console.log('🔄 Setting up analytics triggers...');
    
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
        -- Calculate active listings (all cars created before or on target_date)
        SELECT COUNT(*) INTO active_count
        FROM cars 
        WHERE created_at <= target_date;
        
        -- Calculate total users (all users created before or on target_date)
        SELECT COUNT(*) INTO total_users_count
        FROM users 
        WHERE created_at <= target_date;
        
        -- Calculate featured listings (boosted cars active on target_date)
        SELECT COUNT(DISTINCT c.id) INTO featured_count
        FROM cars c
        JOIN boost_orders bo ON c.id = bo.car_id
        WHERE bo.status = 'completed' 
        AND bo.boost_start_date <= target_date
        AND bo.boost_end_date > target_date
        AND c.created_at <= target_date;
        
        -- Calculate new listings for the specific date
        SELECT COUNT(*) INTO new_listings_count
        FROM cars 
        WHERE DATE(created_at) = target_date;
        
        -- Calculate new users for the specific date
        SELECT COUNT(*) INTO new_users_count
        FROM users 
        WHERE DATE(created_at) = target_date;
        
        -- Calculate total listings (same as active for now)
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
    
    // Create function to update analytics for today and recent days
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_recent_analytics()
      RETURNS VOID AS $$
      DECLARE
        i INTEGER;
        target_date DATE;
      BEGIN
        -- Update analytics for today and last 7 days
        FOR i IN 0..7 LOOP
          target_date := CURRENT_DATE - i;
          PERFORM update_analytics_for_date(target_date);
        END LOOP;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Create trigger function for cars table
    await pool.query(`
      CREATE OR REPLACE FUNCTION trigger_update_analytics()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Update analytics for today and recent days when cars change
        PERFORM update_recent_analytics();
        RETURN COALESCE(NEW, OLD);
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Create trigger function for users table
    await pool.query(`
      CREATE OR REPLACE FUNCTION trigger_update_analytics_users()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Update analytics for today and recent days when users change
        PERFORM update_recent_analytics();
        RETURN COALESCE(NEW, OLD);
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Create trigger function for boost_orders table
    await pool.query(`
      CREATE OR REPLACE FUNCTION trigger_update_analytics_boost()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Update analytics for today and recent days when boost orders change
        PERFORM update_recent_analytics();
        RETURN COALESCE(NEW, OLD);
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Drop existing triggers if they exist
    await pool.query('DROP TRIGGER IF EXISTS cars_analytics_trigger ON cars');
    await pool.query('DROP TRIGGER IF EXISTS users_analytics_trigger ON users');
    await pool.query('DROP TRIGGER IF EXISTS boost_orders_analytics_trigger ON boost_orders');
    
    // Create triggers
    await pool.query(`
      CREATE TRIGGER cars_analytics_trigger
      AFTER INSERT OR UPDATE OR DELETE ON cars
      FOR EACH ROW
      EXECUTE FUNCTION trigger_update_analytics();
    `);
    
    await pool.query(`
      CREATE TRIGGER users_analytics_trigger
      AFTER INSERT OR UPDATE OR DELETE ON users
      FOR EACH ROW
      EXECUTE FUNCTION trigger_update_analytics_users();
    `);
    
    await pool.query(`
      CREATE TRIGGER boost_orders_analytics_trigger
      AFTER INSERT OR UPDATE OR DELETE ON boost_orders
      FOR EACH ROW
      EXECUTE FUNCTION trigger_update_analytics_boost();
    `);
    
    console.log('✅ Analytics triggers created successfully!');
    
    // Test the triggers by updating recent analytics
    await pool.query('SELECT update_recent_analytics()');
    console.log('✅ Recent analytics updated with triggers');
    
  } catch (error) {
    console.error('❌ Error setting up analytics triggers:', error);
  } finally {
    await pool.end();
  }
}

setupAnalyticsTriggers();
