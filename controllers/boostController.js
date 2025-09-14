const boostService = require('../services/boostService');
const ActivityService = require('../services/activityService');

class BoostController {
  // Create a new boost order
  async createBoostOrder(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { carId } = req.body;
      
      if (!carId) {
        return res.status(400).json({ error: 'Car ID is required' });
      }

      const boostOrder = await boostService.createBoostOrder(req.user.sub, carId);
      
      // Update analytics after boost order creation
      try {
        const pool = require('../config/database');
        await pool.query('SELECT update_recent_analytics()');
        console.log('📊 Analytics updated after boost order creation');
      } catch (analyticsError) {
        console.error('Analytics update error:', analyticsError);
        // Don't fail the request if analytics update fails
      }
      
      res.status(201).json({
        message: 'Boost order created successfully',
        boostOrder
      });
    } catch (error) {
      console.error('Controller error - createBoostOrder:', error);
      res.status(500).json({ 
        error: 'Failed to create boost order',
        message: error.message 
      });
    }
  }

  // Process payment for boost order
  async processPayment(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { orderId } = req.params;
      
      if (!orderId) {
        return res.status(400).json({ error: 'Order ID is required' });
      }

      const processedOrder = await boostService.processPayment(orderId);
      
      // Update analytics after payment processing
      try {
        const pool = require('../config/database');
        await pool.query('SELECT update_recent_analytics()');
        console.log('📊 Analytics updated after boost payment processing');
      } catch (analyticsError) {
        console.error('Analytics update error:', analyticsError);
        // Don't fail the request if analytics update fails
      }

      // Log activity
      try {
        // Get car details for the activity
        const pool = require('../config/database');
        const carResult = await pool.query(`
          SELECT c.year, c.make, c.model, c.seller_name 
          FROM cars c 
          WHERE c.id = $1
        `, [processedOrder.car_id]);
        
        if (carResult.rows.length > 0) {
          const car = carResult.rows[0];
          await ActivityService.logActivity({
            type: 'listing_boosted',
            action: 'Listing boosted',
            description: `${car.year} ${car.make} ${car.model} was featured`,
            user: car.seller_name,
            referenceId: `boost_${processedOrder.order_id}`,
            metadata: {
              carId: processedOrder.car_id,
              orderId: processedOrder.order_id,
              amount: processedOrder.amount
            }
          });
        }
      } catch (activityError) {
        console.error('Activity logging error:', activityError);
        // Don't fail the request if activity logging fails
      }
      
      res.json({
        message: 'Payment processed successfully',
        boostOrder: processedOrder
      });
    } catch (error) {
      console.error('Controller error - processPayment:', error);
      res.status(500).json({ 
        error: 'Failed to process payment',
        message: error.message 
      });
    }
  }

  // Get user's boost orders
  async getUserBoostOrders(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const boostOrders = await boostService.getUserBoostOrders(req.user.sub);
      res.json(boostOrders);
    } catch (error) {
      console.error('Controller error - getUserBoostOrders:', error);
      res.status(500).json({ 
        error: 'Failed to fetch boost orders',
        message: error.message 
      });
    }
  }

  // Check if car is boosted
  async checkBoostStatus(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { carId } = req.params;
      
      if (!carId) {
        return res.status(400).json({ error: 'Car ID is required' });
      }

      const isBoosted = await boostService.isCarBoosted(carId);
      res.json({ isBoosted });
    } catch (error) {
      console.error('Controller error - checkBoostStatus:', error);
      res.status(500).json({ 
        error: 'Failed to check boost status',
        message: error.message 
      });
    }
  }

  // Get all active boosts (admin function)
  async getAllActiveBoosts(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // In a real app, check if user is admin
      // For now, allow any authenticated user to view
      const activeBoosts = await boostService.getAllActiveBoosts();
      res.json(activeBoosts);
    } catch (error) {
      console.error('Controller error - getAllActiveBoosts:', error);
      res.status(500).json({ 
        error: 'Failed to fetch active boosts',
        message: error.message 
      });
    }
  }

  // Cancel boost (admin function)
  async cancelBoost(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { orderId } = req.params;
      
      if (!orderId) {
        return res.status(400).json({ error: 'Order ID is required' });
      }

      // In a real app, check if user is admin
      const cancelledBoost = await boostService.cancelBoost(orderId);
      res.json({
        message: 'Boost cancelled successfully',
        boostOrder: cancelledBoost
      });
    } catch (error) {
      console.error('Controller error - cancelBoost:', error);
      res.status(500).json({ 
        error: 'Failed to cancel boost',
        message: error.message 
      });
    }
  }

  // Clean up expired boosts (admin function)
  async cleanupExpiredBoosts(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // In a real app, check if user is admin
      const cleanedCount = await boostService.cleanupExpiredBoosts();
      res.json({
        message: 'Expired boosts cleaned up successfully',
        cleanedCount
      });
    } catch (error) {
      console.error('Controller error - cleanupExpiredBoosts:', error);
      res.status(500).json({ 
        error: 'Failed to cleanup expired boosts',
        message: error.message 
      });
    }
  }
}

module.exports = new BoostController();
