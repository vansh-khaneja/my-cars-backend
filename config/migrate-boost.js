const pool = require('./database');
require('dotenv').config();

async function migrateBoost() {
  try {
    console.log('🔄 Starting boost functionality migration...');

    // Create boost_orders table
    const createBoostTable = `
      CREATE TABLE IF NOT EXISTS boost_orders (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(50) UNIQUE NOT NULL,
        user_id VARCHAR(50) NOT NULL,
        car_id INTEGER NOT NULL,
        amount INTEGER NOT NULL DEFAULT 150,
        status VARCHAR(20) DEFAULT 'pending',
        payment_method VARCHAR(50) DEFAULT 'sample_gateway',
        boost_start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        boost_end_date TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id),
        FOREIGN KEY (car_id) REFERENCES cars(id)
      );
    `;

    await pool.query(createBoostTable);
    console.log('✅ Boost orders table created successfully');

    // Create indexes
    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_boost_orders_user_id ON boost_orders(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_boost_orders_car_id ON boost_orders(car_id);',
      'CREATE INDEX IF NOT EXISTS idx_boost_orders_status ON boost_orders(status);',
      'CREATE INDEX IF NOT EXISTS idx_boost_orders_boost_end_date ON boost_orders(boost_end_date);'
    ];

    for (const indexQuery of createIndexes) {
      await pool.query(indexQuery);
    }
    console.log('✅ Boost indexes created successfully');

    console.log('🎉 Boost functionality migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateBoost()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateBoost;
