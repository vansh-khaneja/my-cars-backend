const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createActivitiesTable() {
  try {
    console.log('🔄 Creating activities table...');
    
    // Create activities table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activities (
        id SERIAL PRIMARY KEY,
        activity_type VARCHAR(50) NOT NULL,
        action VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        reference_id VARCHAR(100),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at);
      CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(activity_type);
    `);
    
    console.log('✅ Activities table created successfully');
    
    // Create function to maintain only last 5 activities
    await pool.query(`
      CREATE OR REPLACE FUNCTION maintain_activities_limit()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Delete oldest activities if more than 5 exist
        DELETE FROM activities 
        WHERE id IN (
          SELECT id FROM activities 
          ORDER BY created_at ASC 
          LIMIT (
            SELECT GREATEST(0, COUNT(*) - 5) 
            FROM activities
          )
        );
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Create trigger to maintain limit
    await pool.query(`
      DROP TRIGGER IF EXISTS activities_limit_trigger ON activities;
      
      CREATE TRIGGER activities_limit_trigger
        AFTER INSERT ON activities
        FOR EACH STATEMENT
        EXECUTE FUNCTION maintain_activities_limit();
    `);
    
    console.log('✅ Activities limit trigger created (keeps only last 5)');
    
    // Test the system
    console.log('🧪 Testing activity logging...');
    
    // Insert some test activities
    const testActivities = [
      {
        type: 'user_registered',
        action: 'New user registered',
        description: 'User John Doe joined the platform',
        user: 'John Doe',
        referenceId: 'user_123'
      },
      {
        type: 'listing_created',
        action: 'New listing created',
        description: '2023 Toyota Camry',
        user: 'John Doe',
        referenceId: 'car_456'
      },
      {
        type: 'listing_boosted',
        action: 'Listing boosted',
        description: '2023 Toyota Camry was featured',
        user: 'John Doe',
        referenceId: 'boost_789'
      },
      {
        type: 'listing_created',
        action: 'New listing created',
        description: '2023 Honda Civic',
        user: 'Jane Smith',
        referenceId: 'car_101'
      },
      {
        type: 'user_registered',
        action: 'New user registered',
        description: 'User Mike Johnson joined the platform',
        user: 'Mike Johnson',
        referenceId: 'user_202'
      },
      {
        type: 'listing_created',
        action: 'New listing created',
        description: '2023 Tesla Model 3',
        user: 'Mike Johnson',
        referenceId: 'car_303'
      }
    ];
    
    for (const activity of testActivities) {
      await pool.query(`
        INSERT INTO activities (activity_type, action, description, user_name, reference_id)
        VALUES ($1, $2, $3, $4, $5)
      `, [activity.type, activity.action, activity.description, activity.user, activity.referenceId]);
    }
    
    // Check final count
    const countResult = await pool.query('SELECT COUNT(*) as count FROM activities');
    console.log(`📊 Final activities count: ${countResult.rows[0].count} (should be 5)`);
    
    // Show current activities
    const activities = await pool.query(`
      SELECT * FROM activities 
      ORDER BY created_at DESC
    `);
    
    console.log('\n📋 Current activities:');
    console.table(activities.rows.map(a => ({
      id: a.id,
      type: a.activity_type,
      description: a.description,
      user: a.user_name,
      created: a.created_at.toISOString().split('T')[0]
    })));
    
  } catch (error) {
    console.error('❌ Error creating activities table:', error);
  } finally {
    await pool.end();
  }
}

createActivitiesTable();
