const pool = require('./database');

async function migrateOffers() {
  try {
    console.log('Running migration: create offers table...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS offers (
        id SERIAL PRIMARY KEY,
        car_id INTEGER NOT NULL,
        buyer_id VARCHAR(50) NOT NULL,
        price INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (car_id) REFERENCES cars(id),
        FOREIGN KEY (buyer_id) REFERENCES users(user_id)
      );
    `);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_offers_car_id ON offers(car_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_offers_buyer_id ON offers(buyer_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_offers_price ON offers(price);`);

    console.log('Migration complete.');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

if (require.main === module) {
  migrateOffers()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { migrateOffers };


