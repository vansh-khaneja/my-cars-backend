const express = require('express');
const boostController = require('../controllers/boostController');
const { simpleAuthMiddleware } = require('../middleware/simpleAuth');

const router = express.Router();

// Apply authentication to all boost routes
router.use(simpleAuthMiddleware);

// Create boost order
router.post('/create', boostController.createBoostOrder);

// Process payment for boost order
router.post('/process-payment/:orderId', boostController.processPayment);

// Get user's boost orders
router.get('/user-orders', boostController.getUserBoostOrders);

// Check if car is boosted
router.get('/check-status/:carId', boostController.checkBoostStatus);

// Get all active boosts (admin)
router.get('/active', boostController.getAllActiveBoosts);

// Cancel boost (admin)
router.delete('/cancel/:orderId', boostController.cancelBoost);

// Clean up expired boosts (admin)
router.post('/cleanup', boostController.cleanupExpiredBoosts);

module.exports = router;
