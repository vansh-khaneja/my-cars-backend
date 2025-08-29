const pool = require('./database');
require('dotenv').config();

async function cleanDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Starting database cleanup...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Delete in order to respect foreign key constraints
    // 1. Delete messages first (references chats)
    console.log('Deleting messages...');
    await client.query('DELETE FROM messages');
    
    // 2. Delete chats (references cars, users)
    console.log('Deleting chats...');
    await client.query('DELETE FROM chats');
    
    // 3. Delete wishlist entries (references cars, users)
    console.log('Deleting wishlist entries...');
    await client.query('DELETE FROM wishlist');
    
    // 4. Delete boost orders (references cars, users)
    console.log('Deleting boost orders...');
    await client.query('DELETE FROM boost_orders');
    
    // 5. Delete cars (references users)
    console.log('Deleting cars...');
    await client.query('DELETE FROM cars');
    
    // 6. Delete users last (referenced by other tables)
    console.log('Deleting users...');
    await client.query('DELETE FROM users');
    
    // Reset sequences to start from 1
    console.log('Resetting sequences...');
    await client.query('ALTER SEQUENCE users_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE cars_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE chats_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE messages_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE wishlist_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE boost_orders_id_seq RESTART WITH 1');
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('✅ Database cleaned successfully!');
    console.log('All tables are now empty and sequences reset.');
    
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function showTableCounts() {
  const client = await pool.connect();
  
  try {
    console.log('\n📊 Current table counts:');
    
    const tables = ['users', 'cars', 'chats', 'messages', 'wishlist', 'boost_orders'];
    
    for (const table of tables) {
      const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`${table}: ${result.rows[0].count} rows`);
    }
    
  } catch (error) {
    console.error('Error getting table counts:', error);
  } finally {
    client.release();
  }
}

// Main execution
async function main() {
  try {
    // Show counts before cleanup
    await showTableCounts();
    
    // Ask for confirmation
    console.log('\n⚠️  WARNING: This will delete ALL data from ALL tables!');
    console.log('This action cannot be undone.');
    
    // In a real scenario, you might want to add a confirmation prompt
    // For now, we'll proceed with the cleanup
    
    // Perform cleanup
    await cleanDatabase();
    
    // Show counts after cleanup
    await showTableCounts();
    
    console.log('\n🎉 Database cleanup completed!');
    
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
    process.exit(1);
  } finally {
    // Close the pool
    await pool.end();
    process.exit(0);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { cleanDatabase, showTableCounts };
