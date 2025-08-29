const express = require('express');
const wishlistController = require('../controllers/wishlistController');
const { simpleAuthMiddleware } = require('../middleware/simpleAuth');

const router = express.Router();

// Apply authentication to all wishlist routes
router.use(simpleAuthMiddleware);

// Add car to wishlist
router.post('/add', wishlistController.addToWishlist);

// Remove car from wishlist
router.delete('/remove/:carId', wishlistController.removeFromWishlist);

// Get user's wishlist
router.get('/', wishlistController.getUserWishlist);

// Check if car is in wishlist
router.get('/check/:carId', wishlistController.checkWishlistStatus);

// Get wishlist count
router.get('/count', wishlistController.getWishlistCount);

module.exports = router;
