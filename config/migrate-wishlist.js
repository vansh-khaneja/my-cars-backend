const pool = require('./database');
require('dotenv').config();

async function migrateWishlist() {
  try {
    console.log('🔄 Starting wishlist table migration...');

    // Create wishlist table
    const createWishlistTable = `
      CREATE TABLE IF NOT EXISTS wishlist (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        car_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id),
        FOREIGN KEY (car_id) REFERENCES cars(id),
        UNIQUE(user_id, car_id)
      );
    `;

    await pool.query(createWishlistTable);
    console.log('✅ Wishlist table created successfully');

    // Create indexes
    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON wishlist(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_wishlist_car_id ON wishlist(car_id);'
    ];

    for (const indexQuery of createIndexes) {
      await pool.query(indexQuery);
    }
    console.log('✅ Wishlist indexes created successfully');

    console.log('🎉 Wishlist migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateWishlist()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateWishlist;
