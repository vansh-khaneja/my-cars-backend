const pool = require('./database');
const fs = require('fs');
const path = require('path');

async function resetDatabase() {
  try {
    console.log('🔄 Resetting database...');

    // Drop existing tables if they exist
    console.log('🗑️  Dropping existing tables...');
    await pool.query(`
      DROP TABLE IF EXISTS messages CASCADE;
      DROP TABLE IF EXISTS chats CASCADE;
      DROP TABLE IF EXISTS cars CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);
    console.log('✅ Existing tables dropped');

    // Read and execute new schema
    console.log('📋 Creating new schema...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    await pool.query(schema);
    console.log('✅ New database schema created successfully');

    // Insert sample users with password hashes
    console.log('👥 Inserting sample users...');
    const bcrypt = require('bcryptjs');
    const sampleUsers = [
      { user_id: 'user1', name: 'John Doe', email: 'john@example.com', password: 'password123' },
      { user_id: 'user2', name: 'Jane Smith', email: 'jane@example.com', password: 'password123' },
      { user_id: 'user3', name: 'Mike Johnson', email: 'mike@example.com', password: 'password123' }
    ];

    for (const user of sampleUsers) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      await pool.query(
        'INSERT INTO users (user_id, name, email, password_hash) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id) DO NOTHING',
        [user.user_id, user.name, user.email, passwordHash]
      );
    }
    console.log('✅ Sample users inserted');

    // No sample cars - keeping database clean
    console.log('🚗 No sample cars inserted - database will be empty');

    // No sample chats or messages - keeping database clean
    console.log('💬 No sample chats or messages inserted - database will be empty');

    console.log('🎉 Database reset completed successfully!');
    console.log('📊 New structure:');
    console.log('   - Users table with proper constraints');
    console.log('   - Cars table with JSONB images field (empty)');
    console.log('   - Chats and messages tables (empty)');
    console.log('   - Proper indexes for performance');
    console.log('   - Clean database ready for real user data');
    
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    throw error;
  }
}

// Run reset if this file is executed directly
if (require.main === module) {
  resetDatabase()
    .then(() => {
      console.log('✅ Database reset complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database reset failed:', error);
      process.exit(1);
    });
}

module.exports = { resetDatabase };
