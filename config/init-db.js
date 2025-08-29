const pool = require('./database');
const fs = require('fs');
const path = require('path');

async function initializeDatabase() {
  try {
    console.log('Initializing database...');

    // Read and execute schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    await pool.query(schema);
    console.log('Database schema created successfully');

    // Insert sample users
    const sampleUsers = [
      { user_id: 'user1', name: 'John Doe', email: 'john@example.com' },
      { user_id: 'user2', name: 'Jane Smith', email: 'jane@example.com' },
      { user_id: 'user3', name: 'Mike Johnson', email: 'mike@example.com' }
    ];

    for (const user of sampleUsers) {
      // Use a default password hash for sample users
      const defaultPasswordHash = '$2a$10$placeholder.hash.for.sample.users';
      await pool.query(
        'INSERT INTO users (user_id, name, email, password_hash) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id) DO NOTHING',
        [user.user_id, user.name, user.email, defaultPasswordHash]
      );
    }
    console.log('Sample users inserted');

    // Insert sample cars with JSONB images
    const sampleCars = [
      {
        make: 'Toyota',
        model: 'Camry',
        year: 2023,
        price: 25000,
        fuel_type: 'Hybrid',
        description: 'Excellent condition, low mileage',
        images: JSON.stringify([
          {
            publicId: 'mycars/cars/toyota_camry_1',
            url: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800',
            width: 800,
            height: 600,
            format: 'jpg',
            size: 125000
          },
          {
            publicId: 'mycars/cars/toyota_camry_2',
            url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800',
            width: 800,
            height: 600,
            format: 'jpg',
            size: 118000
          }
        ]),
        seller_id: 'user1',
        seller_name: 'John Doe',
        location: 'New York, NY',
        mileage: 15000,
        transmission: 'Automatic',
        color: 'Silver'
      },
      {
        make: 'Honda',
        model: 'Civic',
        year: 2023,
        price: 22000,
        fuel_type: 'Gasoline',
        description: 'Sport model, great performance',
        images: JSON.stringify([
          {
            publicId: 'mycars/cars/honda_civic_1',
            url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
            width: 800,
            height: 600,
            format: 'jpg',
            size: 132000
          },
          {
            publicId: 'mycars/cars/honda_civic_2',
            url: 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=800',
            width: 800,
            height: 600,
            format: 'jpg',
            size: 128000
          }
        ]),
        seller_id: 'user2',
        seller_name: 'Jane Smith',
        location: 'Los Angeles, CA',
        mileage: 12000,
        transmission: 'Manual',
        color: 'Blue'
      },
      {
        make: 'Tesla',
        model: 'Model 3',
        year: 2023,
        price: 40000,
        fuel_type: 'Electric',
        description: 'Premium electric vehicle, autopilot enabled',
        images: JSON.stringify([
          {
            publicId: 'mycars/cars/tesla_model3_1',
            url: 'https://images.unsplash.com/photo-1560958089-b8a5329e55c6?w=800',
            width: 800,
            height: 600,
            format: 'jpg',
            size: 145000
          },
          {
            publicId: 'mycars/cars/tesla_model3_2',
            url: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800',
            width: 800,
            height: 600,
            format: 'jpg',
            size: 138000
          }
        ]),
        seller_id: 'user3',
        seller_name: 'Mike Johnson',
        location: 'San Francisco, CA',
        mileage: 8000,
        transmission: 'Automatic',
        color: 'White'
      }
    ];

    for (const car of sampleCars) {
      await pool.query(
        `INSERT INTO cars (make, model, year, price, fuel_type, description, images, seller_id, seller_name, location, mileage, transmission, color)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [car.make, car.model, car.year, car.price, car.fuel_type, car.description, car.images, car.seller_id, car.seller_name, car.location, car.mileage, car.transmission, car.color]
      );
    }
    console.log('Sample cars inserted');

    // Insert sample chat
    await pool.query(
      'INSERT INTO chats (chat_id, car_id, buyer_id, seller_id) VALUES ($1, $2, $3, $4) ON CONFLICT (chat_id) DO NOTHING',
      ['chat1', 1, 'user2', 'user1']
    );

    // Insert sample messages
    const sampleMessages = [
      { message_id: 'msg1', chat_id: 'chat1', sender_id: 'user2', text: 'Hi! Is this car still available?' },
      { message_id: 'msg2', chat_id: 'chat1', sender_id: 'user1', text: 'Yes, it is! Would you like to see it?' }
    ];

    for (const message of sampleMessages) {
      await pool.query(
        'INSERT INTO messages (message_id, chat_id, sender_id, text) VALUES ($1, $2, $3, $4) ON CONFLICT (message_id) DO NOTHING',
        [message.message_id, message.chat_id, message.sender_id, message.text]
      );
    }
    console.log('Sample chat and messages inserted');

    console.log('Database initialization completed successfully!');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

// Run initialization if this file is executed directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('Database setup complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database setup failed:', error);
      process.exit(1);
    });
}

module.exports = { initializeDatabase };
