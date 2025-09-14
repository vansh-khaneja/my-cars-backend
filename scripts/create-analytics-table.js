const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createAnalyticsTable() {
  try {
    console.log('🔄 Creating analytics table...');
    
    // Create analytics table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analytics (
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
      )
    `);
    
    // Create indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics(date)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_analytics_active_listings ON analytics(active_listings)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_analytics_total_users ON analytics(total_users)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_analytics_featured_listings ON analytics(featured_listings)');
    
    console.log('✅ Analytics table created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating analytics table:', error);
  } finally {
    await pool.end();
  }
}

createAnalyticsTable();
