const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class ChatService {
  // Get all chats for a user (as buyer or seller)
  async getUserChats(userId) {
    try {
      const query = `
        SELECT 
          c.chat_id,
          c.car_id,
          c.buyer_id,
          c.seller_id,
          c.created_at,
          car.make,
          car.model,
          car.year,
          car.price,
          car.images,
          buyer.name as buyer_name,
          seller.name as seller_name,
          (
            SELECT m.text 
            FROM messages m 
            WHERE m.chat_id = c.chat_id 
            ORDER BY m.timestamp DESC 
            LIMIT 1
          ) as last_message,
          (
            SELECT m.timestamp 
            FROM messages m 
            WHERE m.chat_id = c.chat_id 
            ORDER BY m.timestamp DESC 
            LIMIT 1
          ) as last_message_time
        FROM chats c
        JOIN cars car ON c.car_id = car.id
        JOIN users buyer ON c.buyer_id = buyer.user_id
        JOIN users seller ON c.seller_id = seller.user_id
        WHERE c.buyer_id = $1 OR c.seller_id = $1
        ORDER BY last_message_time DESC NULLS LAST
      `;
      
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching user chats:', error);
      throw error;
    }
  }

  // Get aggregated offer stats for a car
  async getOfferStatsForCar(carId) {
    try {
      const statsQuery = `
        SELECT 
          COUNT(DISTINCT buyer_id)::int AS active_buyers,
          COALESCE(MAX(price), 0)::int AS max_offer
        FROM offers
        WHERE car_id = $1
      `;
      const result = await pool.query(statsQuery, [carId]);
      return result.rows[0] || { active_buyers: 0, max_offer: 0 };
    } catch (error) {
      console.error('Error fetching offer stats:', error);
      throw error;
    }
  }

  // Create an offer and optionally create chat + message
  async createOfferAndMessage(carId, buyerId, offerPrice) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert offer
      const offerQuery = `
        INSERT INTO offers (car_id, buyer_id, price)
        VALUES ($1, $2, $3)
        RETURNING id, car_id, buyer_id, price, created_at
      `;
      const offerRes = await client.query(offerQuery, [carId, buyerId, offerPrice]);

      // Ensure chat exists and send message
      const carRes = await client.query('SELECT seller_id FROM cars WHERE id = $1', [carId]);
      if (carRes.rows.length === 0) throw new Error('Car not found');
      const sellerId = carRes.rows[0].seller_id;

      const existingChatRes = await client.query(
        'SELECT chat_id FROM chats WHERE car_id = $1 AND buyer_id = $2 AND seller_id = $3',
        [carId, buyerId, sellerId]
      );

      let chatId;
      if (existingChatRes.rows.length > 0) {
        chatId = existingChatRes.rows[0].chat_id;
      } else {
        chatId = require('uuid').v4();
        await client.query(
          'INSERT INTO chats (chat_id, car_id, buyer_id, seller_id) VALUES ($1, $2, $3, $4)',
          [chatId, carId, buyerId, sellerId]
        );
      }

      // Send offer message
      const messageId = require('uuid').v4();
      const text = `I would like to make an offer for ₹${Number(offerPrice).toLocaleString('en-IN')}`;
      await client.query(
        'INSERT INTO messages (message_id, chat_id, sender_id, text) VALUES ($1, $2, $3, $4)',
        [messageId, chatId, buyerId, text]
      );

      await client.query('COMMIT');
      return { offer: offerRes.rows[0], chatId };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating offer and message:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get chat by ID with messages
  async getChatById(chatId, userId) {
    try {
      // First check if user has access to this chat
      const accessQuery = `
        SELECT chat_id FROM chats 
        WHERE chat_id = $1 AND (buyer_id = $2 OR seller_id = $2)
      `;
      const accessResult = await pool.query(accessQuery, [chatId, userId]);
      
      if (accessResult.rows.length === 0) {
        return null;
      }

      // Get chat details
      const chatQuery = `
        SELECT 
          c.chat_id,
          c.car_id,
          c.buyer_id,
          c.seller_id,
          c.created_at,
          car.make,
          car.model,
          car.year,
          car.price,
          car.images,
          buyer.name as buyer_name,
          seller.name as seller_name
        FROM chats c
        JOIN cars car ON c.car_id = car.id
        JOIN users buyer ON c.buyer_id = buyer.user_id
        JOIN users seller ON c.seller_id = seller.user_id
        WHERE c.chat_id = $1
      `;
      
      const chatResult = await pool.query(chatQuery, [chatId]);
      if (chatResult.rows.length === 0) {
        return null;
      }

      const chat = chatResult.rows[0];

      // Get messages for this chat
      const messagesQuery = `
        SELECT 
          m.message_id,
          m.chat_id,
          m.sender_id,
          m.text,
          m.timestamp,
          u.name as sender_name
        FROM messages m
        JOIN users u ON m.sender_id = u.user_id
        WHERE m.chat_id = $1
        ORDER BY m.timestamp ASC
      `;
      
      const messagesResult = await pool.query(messagesQuery, [chatId]);
      chat.messages = messagesResult.rows;

      return chat;
    } catch (error) {
      console.error('Error fetching chat by ID:', error);
      throw error;
    }
  }

  // Create a new chat
  async createChat(carId, buyerId, initialMessage) {
    try {
      console.log('ChatService: Creating chat with:', { carId, buyerId, initialMessage });
      
      // Get car and seller information
      const carQuery = 'SELECT seller_id FROM cars WHERE id = $1';
      const carResult = await pool.query(carQuery, [carId]);
      
      console.log('ChatService: Car query result:', carResult.rows);
      
      if (carResult.rows.length === 0) {
        throw new Error('Car not found');
      }

      const sellerId = carResult.rows[0].seller_id;
      console.log('ChatService: Seller ID:', sellerId);
      
      // Check if chat already exists
      const existingChatQuery = `
        SELECT chat_id FROM chats 
        WHERE car_id = $1 AND buyer_id = $2 AND seller_id = $3
      `;
      const existingChatResult = await pool.query(existingChatQuery, [carId, buyerId, sellerId]);
      
      console.log('ChatService: Existing chat check:', existingChatResult.rows);
      
      if (existingChatResult.rows.length > 0) {
        // Chat exists, just add the message
        const chatId = existingChatResult.rows[0].chat_id;
        console.log('ChatService: Chat exists, adding message to:', chatId);
        await this.sendMessage(chatId, buyerId, initialMessage);
        return this.getChatById(chatId, buyerId);
      }

      // Create new chat
      const chatId = uuidv4();
      console.log('ChatService: Generated chat ID:', chatId);
      
      const chatQuery = `
        INSERT INTO chats (chat_id, car_id, buyer_id, seller_id) 
        VALUES ($1, $2, $3, $4) 
        RETURNING *
      `;
      
      const chatInsertResult = await pool.query(chatQuery, [chatId, carId, buyerId, sellerId]);
      console.log('ChatService: Chat insert result:', chatInsertResult.rows);

      // Add initial message
      console.log('ChatService: Adding initial message');
      await this.sendMessage(chatId, buyerId, initialMessage);

      console.log('ChatService: Getting chat by ID');
      return this.getChatById(chatId, buyerId);
    } catch (error) {
      console.error('Error creating chat:', error);
      throw error;
    }
  }

  // Send a message in a chat
  async sendMessage(chatId, senderId, text) {
    try {
      // Verify chat exists and user has access
      const accessQuery = `
        SELECT chat_id FROM chats 
        WHERE chat_id = $1 AND (buyer_id = $2 OR seller_id = $2)
      `;
      const accessResult = await pool.query(accessQuery, [chatId, senderId]);
      
      if (accessResult.rows.length === 0) {
        throw new Error('Chat not found or access denied');
      }

      // Insert message
      const messageId = uuidv4();
      const messageQuery = `
        INSERT INTO messages (message_id, chat_id, sender_id, text) 
        VALUES ($1, $2, $3, $4) 
        RETURNING *
      `;
      
      const result = await pool.query(messageQuery, [messageId, chatId, senderId, text]);
      return result.rows[0];
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Get messages for a chat
  async getChatMessages(chatId, userId) {
    try {
      // Verify user has access to this chat
      const accessQuery = `
        SELECT chat_id FROM chats 
        WHERE chat_id = $1 AND (buyer_id = $2 OR seller_id = $2)
      `;
      const accessResult = await pool.query(accessQuery, [chatId, userId]);
      
      if (accessResult.rows.length === 0) {
        throw new Error('Chat not found or access denied');
      }

      const messagesQuery = `
        SELECT 
          m.message_id,
          m.chat_id,
          m.sender_id,
          m.text,
          m.timestamp,
          u.name as sender_name
        FROM messages m
        JOIN users u ON m.sender_id = u.user_id
        WHERE m.chat_id = $1
        ORDER BY m.timestamp ASC
      `;
      
      const result = await pool.query(messagesQuery, [chatId]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      throw error;
    }
  }
}

module.exports = new ChatService();
