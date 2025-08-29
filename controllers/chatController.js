const chatService = require('../services/chatService');
const { simpleAuthMiddleware } = require('../middleware/simpleAuth');

class ChatController {
  // Get all chats for the authenticated user
  async getUserChats(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const chats = await chatService.getUserChats(req.user.sub);
      res.json(chats);
    } catch (error) {
      console.error('Controller error - getUserChats:', error);
      res.status(500).json({ 
        error: 'Failed to fetch chats',
        message: error.message 
      });
    }
  }

  // Get chat by ID with messages
  async getChatById(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      const chat = await chatService.getChatById(id, req.user.sub);
      
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      res.json(chat);
    } catch (error) {
      console.error('Controller error - getChatById:', error);
      res.status(500).json({ 
        error: 'Failed to fetch chat',
        message: error.message 
      });
    }
  }

  // Create a new chat
  async createChat(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { carId, message } = req.body;
      
      console.log('Creating chat with:', { carId, message, userId: req.user.sub });
      
      if (!carId || !message) {
        return res.status(400).json({ error: 'Car ID and message are required' });
      }

      const chat = await chatService.createChat(carId, req.user.sub, message);
      console.log('Chat created successfully:', chat);
      res.status(201).json(chat);
    } catch (error) {
      console.error('Controller error - createChat:', error);
      res.status(500).json({ 
        error: 'Failed to create chat',
        message: error.message,
        stack: error.stack
      });
    }
  }

  // Send a message in a chat
  async sendMessage(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { chatId } = req.params;
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'Message text is required' });
      }

      const message = await chatService.sendMessage(chatId, req.user.sub, text);
      res.status(201).json(message);
    } catch (error) {
      console.error('Controller error - sendMessage:', error);
      res.status(500).json({ 
        error: 'Failed to send message',
        message: error.message 
      });
    }
  }

  // Get messages for a chat
  async getChatMessages(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { chatId } = req.params;
      const messages = await chatService.getChatMessages(chatId, req.user.sub);
      res.json(messages);
    } catch (error) {
      console.error('Controller error - getChatMessages:', error);
      res.status(500).json({ 
        error: 'Failed to fetch messages',
        message: error.message 
      });
    }
  }
}

module.exports = new ChatController();
