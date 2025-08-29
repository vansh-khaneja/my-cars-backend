class Chat {
  constructor(data) {
    this.id = data.id;
    this.chatId = data.chat_id || data.chatId;
    this.carId = data.car_id || data.carId;
    this.buyerId = data.buyer_id || data.buyerId;
    this.sellerId = data.seller_id || data.sellerId;
    this.createdAt = data.created_at || data.createdAt || new Date();
    this.messages = data.messages || [];
    this.car = data.car || null;
    this.buyerName = data.buyer_name || data.buyerName;
    this.sellerName = data.seller_name || data.sellerName;
  }

  static validate(data) {
    const errors = [];
    
    if (!data.carId) {
      errors.push('Car ID is required');
    }
    
    if (!data.buyerId || data.buyerId.trim().length === 0) {
      errors.push('Buyer ID is required');
    }
    
    if (!data.sellerId || data.sellerId.trim().length === 0) {
      errors.push('Seller ID is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  toDatabaseFormat() {
    return {
      car_id: this.carId,
      buyer_id: this.buyerId,
      seller_id: this.sellerId
    };
  }

  toResponseFormat() {
    return {
      id: this.id,
      chatId: this.chatId,
      carId: this.carId,
      buyerId: this.buyerId,
      sellerId: this.sellerId,
      createdAt: this.createdAt,
      messages: this.messages,
      car: this.car,
      buyerName: this.buyerName,
      sellerName: this.sellerName
    };
  }
}

module.exports = Chat;
