const pool = require('../config/database');

class WishlistService {
  // Add car to wishlist
  async addToWishlist(userId, carId) {
    try {
      // Check if car exists and get seller info
      const carQuery = 'SELECT seller_id FROM cars WHERE id = $1';
      const carResult = await pool.query(carQuery, [carId]);
      
      if (carResult.rows.length === 0) {
        throw new Error('Car not found');
      }

      // Prevent users from adding their own cars to wishlist
      if (carResult.rows[0].seller_id === userId) {
        throw new Error('You cannot add your own car to your wishlist');
      }

      // Check if already in wishlist
      const existingQuery = 'SELECT id FROM wishlist WHERE user_id = $1 AND car_id = $2';
      const existingResult = await pool.query(existingQuery, [userId, carId]);
      
      if (existingResult.rows.length > 0) {
        throw new Error('This car is already in your wishlist');
      }

      // Add to wishlist
      const insertQuery = 'INSERT INTO wishlist (user_id, car_id) VALUES ($1, $2) RETURNING *';
      const result = await pool.query(insertQuery, [userId, carId]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      throw error;
    }
  }

  // Remove car from wishlist
  async removeFromWishlist(userId, carId) {
    try {
      const deleteQuery = 'DELETE FROM wishlist WHERE user_id = $1 AND car_id = $2 RETURNING *';
      const result = await pool.query(deleteQuery, [userId, carId]);
      
      if (result.rows.length === 0) {
        throw new Error('Car not found in wishlist');
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      throw error;
    }
  }

  // Get user's wishlist with car details
  async getUserWishlist(userId) {
    try {
      const query = `
        SELECT 
          w.id as wishlist_id,
          w.created_at as added_at,
          c.id,
          c.make,
          c.model,
          c.year,
          c.price,
          c.fuel_type as fuelType,
          c.description,
          c.images,
          c.seller_name as sellerName,
          c.seller_id as sellerId,
          c.location,
          c.mileage,
          c.transmission,
          c.color,
          c.created_at
        FROM wishlist w
        JOIN cars c ON w.car_id = c.id
        WHERE w.user_id = $1
        ORDER BY w.created_at DESC
      `;
      
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching user wishlist:', error);
      throw error;
    }
  }

  // Check if car is in user's wishlist
  async isInWishlist(userId, carId) {
    try {
      const query = 'SELECT id FROM wishlist WHERE user_id = $1 AND car_id = $2';
      const result = await pool.query(query, [userId, carId]);
      
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error checking wishlist status:', error);
      return false;
    }
  }

  // Get wishlist count for a user
  async getWishlistCount(userId) {
    try {
      const query = 'SELECT COUNT(*) as count FROM wishlist WHERE user_id = $1';
      const result = await pool.query(query, [userId]);
      
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('Error getting wishlist count:', error);
      return 0;
    }
  }
}

module.exports = new WishlistService();
