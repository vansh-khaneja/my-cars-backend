class Car {
  constructor(data) {
    this.id = data.id;
    this.make = data.make;
    this.model = data.model;
    this.year = data.year;
    this.price = data.price;
    this.fuelType = data.fuel_type || data.fuelType;
    this.description = data.description || '';
    this.images = data.images || data.imageUrls || [];
    this.sellerId = data.seller_id || data.sellerId;
    this.sellerName = data.seller_name || data.sellerName;
    this.location = data.location || 'Unknown';
    this.mileage = data.mileage || 0;
    this.transmission = data.transmission || 'Unknown';
    this.color = data.color || 'Unknown';
    this.createdAt = data.created_at || data.createdAt || new Date();
    this.expirationDate = data.expiration_date || data.expirationDate || null;
    
    // Ensure proper mapping of boost fields
    this.isBoosted = Boolean(data.is_boosted) || Boolean(data.isBoosted) || false;
    this.boostStartDate = data.boost_start_date || data.boostStartDate || null;
    this.boostEndDate = data.boost_end_date || data.boostEndDate || null;
  }

  static validate(data) {
    const errors = [];
    
    if (!data.make || data.make.trim().length === 0) {
      errors.push('Make is required');
    }
    
    if (!data.model || data.model.trim().length === 0) {
      errors.push('Model is required');
    }
    
    if (!data.year || data.year < 1900 || data.year > new Date().getFullYear() + 1) {
      errors.push('Valid year is required');
    }
    
    if (!data.price || data.price <= 0) {
      errors.push('Valid price is required');
    }
    
    if (!data.sellerId || data.sellerId.trim().length === 0) {
      errors.push('Seller ID is required');
    }
    
    if (!data.sellerName || data.sellerName.trim().length === 0) {
      errors.push('Seller name is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Convert Cloudinary upload results to database format
  static processImages(uploadResults) {
    if (!uploadResults || !Array.isArray(uploadResults)) {
      return [];
    }
    
    return uploadResults.map(result => ({
      publicId: result.publicId,
      url: result.url,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.size
    }));
  }

  // Get optimized image URLs for different sizes
  getOptimizedImages(options = {}) {
    if (!this.images || !Array.isArray(this.images)) {
      return [];
    }
    
    return this.images.map(image => {
      if (image.publicId) {
        // This is a Cloudinary image, return optimized URL
        return {
          ...image,
          optimizedUrl: image.url, // You can add transformation logic here
          thumbnailUrl: image.url.replace('/upload/', '/upload/w_300,h_200,c_fill/'),
          mediumUrl: image.url.replace('/upload/', '/upload/w_600,h_400,c_limit/'),
          largeUrl: image.url.replace('/upload/', '/upload/w_1200,h_800,c_limit/')
        };
      } else {
        // This is a regular URL, return as is
        return {
          url: image,
          publicId: null,
          width: null,
          height: null,
          format: null,
          size: null
        };
      }
    });
  }

  toDatabaseFormat() {
    return {
      make: this.make,
      model: this.model,
      year: this.year,
      price: this.price,
      fuel_type: this.fuelType,
      description: this.description,
      images: this.images, // Store as JSONB in PostgreSQL
      seller_id: this.sellerId,
      seller_name: this.sellerName,
      location: this.location,
      mileage: this.mileage,
      transmission: this.transmission,
      color: this.color
    };
  }

  toResponseFormat() {
    return {
      id: this.id,
      make: this.make,
      model: this.model,
      year: this.year,
      price: this.price,
      fuelType: this.fuelType,
      description: this.description,
      images: this.getOptimizedImages(),
      sellerId: this.sellerId,
      sellerName: this.sellerName,
      location: this.location,
      mileage: this.mileage,
      transmission: this.transmission,
      color: this.color,
      createdAt: this.createdAt,
      expirationDate: this.expirationDate,
      isBoosted: this.isBoosted,
      boostStartDate: this.boostStartDate,
      boostEndDate: this.boostEndDate
    };
  }

  // Get primary image (first image or placeholder)
  getPrimaryImage() {
    if (this.images && this.images.length > 0) {
      const firstImage = this.images[0];
      if (firstImage.url) {
        return firstImage.url;
      }
    }
    return 'https://via.placeholder.com/400x300?text=No+Image';
  }

  // Get thumbnail image
  getThumbnailImage() {
    if (this.images && this.images.length > 0) {
      const firstImage = this.images[0];
      if (firstImage.publicId) {
        // Cloudinary image - return thumbnail
        return firstImage.url.replace('/upload/', '/upload/w_300,h_200,c_fill/');
      } else if (firstImage.url) {
        // Regular URL
        return firstImage.url;
      }
    }
    return 'https://via.placeholder.com/300x200?text=No+Image';
  }
}

module.exports = Car;
