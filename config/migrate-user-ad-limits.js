const pool = require('./database');

async function migrateUserAdLimits() {
  try {
    console.log('Running migration: add allowed_ads column to users...');

    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS allowed_ads INTEGER NOT NULL DEFAULT 1
    `);

    console.log('Migration complete.');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

if (require.main === module) {
  migrateUserAdLimits()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { migrateUserAdLimits };


