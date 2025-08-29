const wishlistService = require('../services/wishlistService');

class WishlistController {
  // Add car to wishlist
  async addToWishlist(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { carId } = req.body;
      
      if (!carId) {
        return res.status(400).json({ error: 'Car ID is required' });
      }

      const wishlistItem = await wishlistService.addToWishlist(req.user.sub, carId);
      res.status(201).json({
        message: 'Car added to wishlist successfully',
        wishlistItem
      });
    } catch (error) {
      console.error('Controller error - addToWishlist:', error);
      res.status(500).json({ 
        error: 'Failed to add car to wishlist',
        message: error.message 
      });
    }
  }

  // Remove car from wishlist
  async removeFromWishlist(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { carId } = req.params;
      
      if (!carId) {
        return res.status(400).json({ error: 'Car ID is required' });
      }

      await wishlistService.removeFromWishlist(req.user.sub, carId);
      res.json({
        message: 'Car removed from wishlist successfully'
      });
    } catch (error) {
      console.error('Controller error - removeFromWishlist:', error);
      res.status(500).json({ 
        error: 'Failed to remove car from wishlist',
        message: error.message 
      });
    }
  }

  // Get user's wishlist
  async getUserWishlist(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const wishlist = await wishlistService.getUserWishlist(req.user.sub);
      res.json(wishlist);
    } catch (error) {
      console.error('Controller error - getUserWishlist:', error);
      res.status(500).json({ 
        error: 'Failed to fetch wishlist',
        message: error.message 
      });
    }
  }

  // Check if car is in wishlist
  async checkWishlistStatus(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { carId } = req.params;
      
      if (!carId) {
        return res.status(400).json({ error: 'Car ID is required' });
      }

      const isInWishlist = await wishlistService.isInWishlist(req.user.sub, carId);
      res.json({ isInWishlist });
    } catch (error) {
      console.error('Controller error - checkWishlistStatus:', error);
      res.status(500).json({ 
        error: 'Failed to check wishlist status',
        message: error.message 
      });
    }
  }

  // Get wishlist count
  async getWishlistCount(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const count = await wishlistService.getWishlistCount(req.user.sub);
      res.json({ count });
    } catch (error) {
      console.error('Controller error - getWishlistCount:', error);
      res.status(500).json({ 
        error: 'Failed to get wishlist count',
        message: error.message 
      });
    }
  }
}

module.exports = new WishlistController();
