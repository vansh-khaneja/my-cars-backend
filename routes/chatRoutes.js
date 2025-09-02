const express = require('express');
const chatController = require('../controllers/chatController');
const { simpleAuthMiddleware } = require('../middleware/simpleAuth');

const router = express.Router();

// Apply authentication to all chat routes
router.use(simpleAuthMiddleware);

// Get all chats for the authenticated user
router.get('/', chatController.getUserChats);

// Get chat by ID with messages
router.get('/:id', chatController.getChatById);

// Create a new chat
router.post('/', chatController.createChat);

// Send a message in a chat
router.post('/:chatId/messages', chatController.sendMessage);

// Get messages for a chat
router.get('/:chatId/messages', chatController.getChatMessages);

// Offer endpoints
router.get('/offers/stats/:carId', chatController.getOfferStats);
router.post('/offers/:carId', chatController.makeOffer);

module.exports = router;
