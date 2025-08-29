-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create cars table
CREATE TABLE IF NOT EXISTS cars (
  id SERIAL PRIMARY KEY,
  make VARCHAR(50) NOT NULL,
  model VARCHAR(50) NOT NULL,
  year INTEGER NOT NULL,
  price INTEGER NOT NULL,
  fuel_type VARCHAR(20) DEFAULT 'Unknown',
  description TEXT,
  images JSONB DEFAULT '[]', -- Store Cloudinary image objects
  seller_id VARCHAR(50) NOT NULL,
  seller_name VARCHAR(100) NOT NULL,
  location VARCHAR(100) DEFAULT 'Unknown',
  mileage INTEGER DEFAULT 0,
  transmission VARCHAR(20) DEFAULT 'Unknown',
  color VARCHAR(30) DEFAULT 'Unknown',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (seller_id) REFERENCES users(user_id)
);

-- Create chats table
CREATE TABLE IF NOT EXISTS chats (
  id SERIAL PRIMARY KEY,
  chat_id VARCHAR(50) UNIQUE NOT NULL,
  car_id INTEGER NOT NULL,
  buyer_id VARCHAR(50) NOT NULL,
  seller_id VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (car_id) REFERENCES cars(id),
  FOREIGN KEY (buyer_id) REFERENCES users(user_id),
  FOREIGN KEY (seller_id) REFERENCES users(user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  message_id VARCHAR(50) UNIQUE NOT NULL,
  chat_id VARCHAR(50) NOT NULL,
  sender_id VARCHAR(50) NOT NULL,
  text TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chat_id) REFERENCES chats(chat_id),
  FOREIGN KEY (sender_id) REFERENCES users(user_id)
);

-- Create wishlist table
CREATE TABLE IF NOT EXISTS wishlist (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  car_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (car_id) REFERENCES cars(id),
  UNIQUE(user_id, car_id) -- Prevent duplicate wishlist entries
);

-- Create boost_orders table for featured listings
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cars_seller_id ON cars(seller_id);
CREATE INDEX IF NOT EXISTS idx_cars_make_model ON cars(make, model);
CREATE INDEX IF NOT EXISTS idx_cars_images ON cars USING GIN (images);
CREATE INDEX IF NOT EXISTS idx_chats_buyer_id ON chats(buyer_id);
CREATE INDEX IF NOT EXISTS idx_chats_seller_id ON chats(seller_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_car_id ON wishlist(car_id);
CREATE INDEX IF NOT EXISTS idx_boost_orders_user_id ON boost_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_boost_orders_car_id ON boost_orders(car_id);
CREATE INDEX IF NOT EXISTS idx_boost_orders_status ON boost_orders(status);
CREATE INDEX IF NOT EXISTS idx_boost_orders_boost_end_date ON boost_orders(boost_end_date);

-- Create function to search cars by image content (optional)
CREATE OR REPLACE FUNCTION search_cars_by_image_metadata(search_term TEXT)
RETURNS TABLE(car_id INTEGER, make VARCHAR, model VARCHAR, year INTEGER, price INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.make, c.model, c.year, c.price
  FROM cars c
  WHERE c.images::text ILIKE '%' || search_term || '%';
END;
$$;
