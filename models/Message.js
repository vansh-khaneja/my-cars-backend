class Message {
  constructor(data) {
    this.id = data.id;
    this.messageId = data.message_id || data.messageId;
    this.chatId = data.chat_id || data.chatId;
    this.senderId = data.sender_id || data.senderId;
    this.text = data.text;
    this.timestamp = data.timestamp || new Date();
  }

  static validate(data) {
    const errors = [];
    
    if (!data.chatId || data.chatId.trim().length === 0) {
      errors.push('Chat ID is required');
    }
    
    if (!data.senderId || data.senderId.trim().length === 0) {
      errors.push('Sender ID is required');
    }
    
    if (!data.text || data.text.trim().length === 0) {
      errors.push('Message text is required');
    }
    
    if (data.text && data.text.length > 1000) {
      errors.push('Message text cannot exceed 1000 characters');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  toDatabaseFormat() {
    return {
      chat_id: this.chatId,
      sender_id: this.senderId,
      text: this.text
    };
  }

  toResponseFormat() {
    return {
      id: this.id,
      messageId: this.messageId,
      chatId: this.chatId,
      senderId: this.senderId,
      text: this.text,
      timestamp: this.timestamp
    };
  }
}

module.exports = Message;
