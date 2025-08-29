const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class BoostService {
  // Create a new boost order
  async createBoostOrder(userId, carId) {
    try {
      // Clean up expired boosts first
      await this.cleanupExpiredBoosts();
      
      // Check if car exists and belongs to user
      const carQuery = 'SELECT id, seller_id FROM cars WHERE id = $1';
      const carResult = await pool.query(carQuery, [carId]);
      
      if (carResult.rows.length === 0) {
        throw new Error('Car not found');
      }

      if (carResult.rows[0].seller_id !== userId) {
        throw new Error('You can only boost your own car listings');
      }

      // Check if car already has an active boost
      const activeBoostQuery = `
        SELECT id, status, boost_end_date FROM boost_orders 
        WHERE car_id = $1 AND status = 'active' 
        AND boost_end_date > CURRENT_TIMESTAMP
      `;
      const activeBoostResult = await pool.query(activeBoostQuery, [carId]);
      
      if (activeBoostResult.rows.length > 0) {
        const activeBoost = activeBoostResult.rows[0];
        console.log('Active boost found:', activeBoost);
        throw new Error('This car already has an active boost');
      }

      // Also check for any pending boost orders
      const pendingBoostQuery = `
        SELECT id, status FROM boost_orders 
        WHERE car_id = $1 AND status = 'pending'
      `;
      const pendingBoostResult = await pool.query(pendingBoostQuery, [carId]);
      
      if (pendingBoostResult.rows.length > 0) {
        console.log('Pending boost found:', pendingBoostResult.rows[0]);
        throw new Error('This car already has a pending boost order');
      }

      // Create boost order
      const orderId = uuidv4();
      const insertQuery = `
        INSERT INTO boost_orders (order_id, user_id, car_id, amount, status) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING *
      `;
      
      const result = await pool.query(insertQuery, [orderId, userId, carId, 150, 'pending']);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating boost order:', error);
      throw error;
    }
  }

  // Process payment and activate boost
  async processPayment(orderId) {
    try {
      // Get the order
      const orderQuery = 'SELECT * FROM boost_orders WHERE order_id = $1';
      const orderResult = await pool.query(orderQuery, [orderId]);
      
      if (orderResult.rows.length === 0) {
        throw new Error('Order not found');
      }

      const order = orderResult.rows[0];

      if (order.status !== 'pending') {
        throw new Error('Order is not in pending status');
      }

      // Simulate payment processing (in real app, integrate with payment gateway)
      const paymentSuccess = await this.simulatePayment(order);
      
      if (!paymentSuccess) {
        throw new Error('Payment failed');
      }

      // Update order status and set boost dates
      const updateQuery = `
        UPDATE boost_orders 
        SET status = 'active', 
            boost_start_date = CURRENT_TIMESTAMP,
            boost_end_date = (CURRENT_TIMESTAMP + INTERVAL '30 days')
        WHERE order_id = $1 
        RETURNING *
      `;
      
      const result = await pool.query(updateQuery, [orderId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  }

  // Simulate payment processing (replace with real payment gateway)
  async simulatePayment(order) {
    try {
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate 95% success rate
      const success = Math.random() > 0.05;
      
      if (success) {
        console.log(`Payment successful for order ${order.order_id}: ₹${order.amount}`);
        return true;
      } else {
        console.log(`Payment failed for order ${order.order_id}`);
        return false;
      }
    } catch (error) {
      console.error('Payment simulation error:', error);
      return false;
    }
  }

  // Get active boosts for a car
  async getActiveBoost(carId) {
    try {
      const query = `
        SELECT * FROM boost_orders 
        WHERE car_id = $1 AND status = 'active' 
        AND boost_end_date > CURRENT_TIMESTAMP
        ORDER BY boost_start_date DESC
        LIMIT 1
      `;
      
      const result = await pool.query(query, [carId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting active boost:', error);
      return null;
    }
  }

  // Get user's boost orders
  async getUserBoostOrders(userId) {
    try {
      const query = `
        SELECT 
          bo.*,
          c.make,
          c.model,
          c.year,
          c.price,
          c.images
        FROM boost_orders bo
        JOIN cars c ON bo.car_id = c.id
        WHERE bo.user_id = $1
        ORDER BY bo.created_at DESC
      `;
      
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting user boost orders:', error);
      throw error;
    }
  }

  // Check if car is currently boosted
  async isCarBoosted(carId) {
    try {
      const boost = await this.getActiveBoost(carId);
      return boost !== null;
    } catch (error) {
      console.error('Error checking if car is boosted:', error);
      return false;
    }
  }

  // Get all active boosts (for admin purposes)
  async getAllActiveBoosts() {
    try {
      const query = `
        SELECT 
          bo.*,
          c.make,
          c.model,
          c.year,
          c.price,
          c.images,
          u.name as seller_name
        FROM boost_orders bo
        JOIN cars c ON bo.car_id = c.id
        JOIN users u ON bo.user_id = u.user_id
        WHERE bo.status = 'active' 
        AND bo.boost_end_date > CURRENT_TIMESTAMP
        ORDER BY bo.boost_start_date DESC
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error getting all active boosts:', error);
      throw error;
    }
  }

  // Cancel/refund a boost (admin function)
  async cancelBoost(orderId) {
    try {
      const updateQuery = `
        UPDATE boost_orders 
        SET status = 'cancelled' 
        WHERE order_id = $1 
        RETURNING *
      `;
      
      const result = await pool.query(updateQuery, [orderId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error cancelling boost:', error);
      throw error;
    }
  }

  // Clean up expired boost orders
  async cleanupExpiredBoosts() {
    try {
      const cleanupQuery = `
        UPDATE boost_orders 
        SET status = 'expired' 
        WHERE status = 'active' 
        AND boost_end_date <= CURRENT_TIMESTAMP
      `;
      
      const result = await pool.query(cleanupQuery);
      console.log(`Cleaned up ${result.rowCount} expired boost orders`);
      return result.rowCount;
    } catch (error) {
      console.error('Error cleaning up expired boosts:', error);
      throw error;
    }
  }
}

module.exports = new BoostService();
