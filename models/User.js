class User {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id || data.userId;
    this.name = data.name;
    this.email = data.email;
    this.listingQuota = data.listing_quota || data.listingQuota || 1;
    this.createdAt = data.created_at || data.createdAt || new Date();
  }

  static validate(data) {
    const errors = [];
    
    if (!data.userId || data.userId.trim().length === 0) {
      errors.push('User ID is required');
    }
    
    if (!data.name || data.name.trim().length === 0) {
      errors.push('Name is required');
    }
    
    if (!data.email || !this.isValidEmail(data.email)) {
      errors.push('Valid email is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  toDatabaseFormat() {
    return {
      user_id: this.userId,
      name: this.name,
      email: this.email,
      listing_quota: this.listingQuota
    };
  }

  toResponseFormat() {
    return {
      id: this.id,
      userId: this.userId,
      name: this.name,
      email: this.email,
      listingQuota: this.listingQuota,
      createdAt: this.createdAt
    };
  }
}

module.exports = User;
