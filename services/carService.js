const pool = require('../config/database');
const { uploadMultipleImages, deleteImage } = require('../config/cloudinary');
const Car = require('../models/Car');

class CarService {
  // Get all cars with pagination and boost priority
  async getAllCars(page = 1, limit = 20, filters = {}) {
    try {
      let query = `
        SELECT 
          c.*,
          CASE 
            WHEN bo.status = 'completed' AND bo.boost_end_date > CURRENT_TIMESTAMP 
            THEN true 
            ELSE false 
          END as is_boosted,
          bo.boost_start_date,
          bo.boost_end_date
        FROM cars c
        LEFT JOIN boost_orders bo ON c.id = bo.car_id
        WHERE c.expiration_date > CURRENT_TIMESTAMP
      `;
      const params = [];
      let paramCount = 0;

      // Apply filters
      if (filters.make) {
        paramCount++;
        query += ` AND c.make ILIKE $${paramCount}`;
        params.push(`%${filters.make}%`);
      }

      if (filters.model) {
        paramCount++;
        query += ` AND c.model ILIKE $${paramCount}`;
        params.push(`%${filters.model}%`);
      }

      if (filters.minPrice) {
        paramCount++;
        query += ` AND c.price >= $${paramCount}`;
        params.push(filters.minPrice);
      }

      if (filters.maxPrice) {
        paramCount++;
        query += ` AND c.price <= $${paramCount}`;
        params.push(filters.maxPrice);
      }

      if (filters.fuelType) {
        paramCount++;
        query += ` AND c.fuel_type = $${paramCount}`;
        params.push(filters.fuelType);
      }

      if (filters.location) {
        paramCount++;
        query += ` AND c.location ILIKE $${paramCount}`;
        params.push(`%${filters.location}%`);
      }

      // Add pagination with boost priority ordering
      const offset = (page - 1) * limit;
      paramCount++;
      query += ` ORDER BY is_boosted DESC, c.created_at DESC LIMIT $${paramCount}`;
      params.push(limit);

      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(offset);

      const result = await pool.query(query, params);
      
      // Debug: Log the raw database results
      console.log('=== CAR SERVICE DEBUG ===');
      console.log('SQL Query:', query);
      console.log('Parameters:', params);
      console.log('Raw database results count:', result.rows.length);
      
      result.rows.forEach((row, index) => {
        console.log(`Row ${index + 1}:`, {
          id: row.id,
          make: row.make,
          model: row.model,
          is_boosted: row.is_boosted,
          boost_start_date: row.boost_start_date,
          boost_end_date: row.boost_end_date,
          boost_status: row.boost_status,
          boost_order_id: row.order_id
        });
      });
      
      const cars = result.rows.map(row => new Car(row));
      return cars;
    } catch (error) {
      console.error('Error getting cars:', error);
      throw new Error('Failed to fetch cars');
    }
  }

  // Get car by ID with boost information
  async getCarById(id) {
    try {
      const query = `
        SELECT 
          c.*,
          CASE 
            WHEN bo.status = 'completed' AND bo.boost_end_date > CURRENT_TIMESTAMP 
            THEN true 
            ELSE false 
          END as is_boosted,
          bo.boost_start_date,
          bo.boost_end_date
        FROM cars c
        LEFT JOIN boost_orders bo ON c.id = bo.car_id
        WHERE c.id = $1
      `;
      
      const result = await pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new Car(result.rows[0]);
    } catch (error) {
      console.error('Error getting car by ID:', error);
      throw new Error('Failed to fetch car');
    }
  }

  // Create new car listing with image uploads
  async createCar(carData, imageFiles = []) {
    try {
      // Validate car data
      const validation = Car.validate(carData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Ensure user exists
      const userResult = await pool.query(
        'SELECT user_id FROM users WHERE user_id = $1',
        [carData.sellerId]
      );
      
      if (userResult.rows.length === 0) {
        // Create new user with a default password hash
        // Since this is a simple auth system, we'll use a placeholder hash
        const defaultPasswordHash = '$2a$10$placeholder.hash.for.simple.auth.system';
        
        await pool.query(
          'INSERT INTO users (user_id, name, email, password_hash) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id) DO NOTHING',
          [carData.sellerId, carData.sellerName, `${carData.sellerId}@example.com`, defaultPasswordHash]
        );
      }

      // Upload images to Cloudinary if provided
      let images = [];
      if (imageFiles && imageFiles.length > 0) {
        images = await uploadMultipleImages(imageFiles, 'mycars/cars');
      }

      // Process images for database storage
      const processedImages = Car.processImages(images);

      // Create car object
      const car = new Car({
        ...carData,
        images: processedImages
      });

      // Insert into database with 60-day expiration
      const result = await pool.query(
        `INSERT INTO cars (make, model, year, price, fuel_type, description, images, seller_id, seller_name, location, mileage, transmission, color, expiration_date) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW() + INTERVAL '60 days') 
         RETURNING *`,
        [
          car.make, car.model, car.year, car.price, car.fuelType, car.description,
          JSON.stringify(car.images), car.sellerId, car.sellerName, car.location,
          car.mileage, car.transmission, car.color
        ]
      );

      return new Car(result.rows[0]);
    } catch (error) {
      console.error('Error creating car:', error);
      throw error;
    }
  }

  // Update car listing
  async updateCar(id, carData, imageFiles = []) {
    try {
      // Check if car exists
      const existingCar = await this.getCarById(id);
      if (!existingCar) {
        throw new Error('Car not found');
      }

      // Upload new images if provided
      let newImages = [];
      if (imageFiles && imageFiles.length > 0) {
        newImages = await uploadMultipleImages(imageFiles, 'mycars/cars');
      }

      // Process new images
      const processedNewImages = Car.processImages(newImages);

      // Combine existing and new images
      const updatedImages = [...existingCar.images, ...processedNewImages];

      // Update car data
      const updatedCar = new Car({
        ...existingCar,
        ...carData,
        images: updatedImages
      });

      // Update database
      const result = await pool.query(
        `UPDATE cars 
         SET make = $1, model = $2, year = $3, price = $4, fuel_type = $5, 
             description = $6, images = $7, location = $8, mileage = $9, 
             transmission = $10, color = $11
         WHERE id = $12 
         RETURNING *`,
        [
          updatedCar.make, updatedCar.model, updatedCar.year, updatedCar.price,
          updatedCar.fuelType, updatedCar.description, JSON.stringify(updatedCar.images),
          updatedCar.location, updatedCar.mileage, updatedCar.transmission,
          updatedCar.color, id
        ]
      );

      return new Car(result.rows[0]);
    } catch (error) {
      console.error('Error updating car:', error);
      throw error;
    }
  }

  // Delete car listing
  async deleteCar(id) {
    try {
      // Get car to delete images
      const car = await this.getCarById(id);
      if (!car) {
        throw new Error('Car not found');
      }

      // Delete images from Cloudinary
      if (car.images && car.images.length > 0) {
        const deletePromises = car.images
          .filter(image => image.publicId)
          .map(image => deleteImage(image.publicId));
        
        await Promise.all(deletePromises);
      }

      // Delete from database
      await pool.query('DELETE FROM cars WHERE id = $1', [id]);
      
      return true;
    } catch (error) {
      console.error('Error deleting car:', error);
      throw error;
    }
  }

  // Search cars with advanced filters and boost priority
  async searchCars(searchParams) {
    try {
      const {
        query,
        make,
        model,
        minPrice,
        maxPrice,
        fuelType,
        transmission,
        minYear,
        maxYear,
        location,
        page = 1,
        limit = 20
      } = searchParams;

      let sqlQuery = `
        SELECT 
          c.*,
          CASE 
            WHEN bo.status = 'completed' AND bo.boost_end_date > CURRENT_TIMESTAMP 
            THEN true 
            ELSE false 
          END as is_boosted,
          bo.boost_start_date,
          bo.boost_end_date
        FROM cars c
        LEFT JOIN boost_orders bo ON c.id = bo.car_id
        WHERE c.expiration_date > CURRENT_TIMESTAMP
      `;
      const params = [];
      let paramCount = 0;

      // Text search
      if (query) {
        paramCount++;
        sqlQuery += ` AND (c.make ILIKE $${paramCount} OR c.model ILIKE $${paramCount} OR c.description ILIKE $${paramCount})`;
        params.push(`%${query}%`);
      }

      // Specific filters
      if (make) {
        paramCount++;
        sqlQuery += ` AND c.make ILIKE $${paramCount}`;
        params.push(`%${make}%`);
      }

      if (model) {
        paramCount++;
        sqlQuery += ` AND c.model ILIKE $${paramCount}`;
        params.push(`%${model}%`);
      }

      if (minPrice) {
        paramCount++;
        sqlQuery += ` AND c.price >= $${paramCount}`;
        params.push(minPrice);
      }

      if (maxPrice) {
        paramCount++;
        sqlQuery += ` AND c.price <= $${paramCount}`;
        params.push(maxPrice);
      }

      if (fuelType) {
        paramCount++;
        sqlQuery += ` AND c.fuel_type = $${paramCount}`;
        params.push(fuelType);
      }

      if (transmission) {
        paramCount++;
        sqlQuery += ` AND c.transmission = $${paramCount}`;
        params.push(transmission);
      }

      if (minYear) {
        paramCount++;
        sqlQuery += ` AND c.year >= $${paramCount}`;
        params.push(minYear);
      }

      if (maxYear) {
        paramCount++;
        sqlQuery += ` AND c.year <= $${paramCount}`;
        params.push(maxYear);
      }

      if (location) {
        paramCount++;
        sqlQuery += ` AND c.location ILIKE $${paramCount}`;
        params.push(`%${location}%`);
      }

      // Add pagination with boost priority ordering
      const offset = (page - 1) * limit;
      paramCount++;
      sqlQuery += ` ORDER BY is_boosted DESC, c.created_at DESC LIMIT $${paramCount}`;
      params.push(limit);

      paramCount++;
      sqlQuery += ` OFFSET $${paramCount}`;
      params.push(offset);

      const result = await pool.query(sqlQuery, params);
      return result.rows.map(row => new Car(row));
    } catch (error) {
      console.error('Error searching cars:', error);
      throw new Error('Failed to search cars');
    }
  }

  // Get cars by seller with boost information
  async getCarsBySeller(sellerId) {
    try {
      const query = `
        SELECT 
          c.*,
          CASE 
            WHEN bo.status = 'completed' AND bo.boost_end_date > CURRENT_TIMESTAMP 
            THEN true 
            ELSE false 
          END as is_boosted,
          bo.boost_start_date,
          bo.boost_end_date
        FROM cars c
        LEFT JOIN boost_orders bo ON c.id = bo.car_id
        WHERE c.seller_id = $1 
        ORDER BY is_boosted DESC, c.created_at DESC
      `;
      
      const result = await pool.query(query, [sellerId]);
      return result.rows.map(row => new Car(row));
    } catch (error) {
      console.error('Error getting cars by seller:', error);
      throw new Error('Failed to fetch seller cars');
    }
  }

  // Get car count for statistics
  async getCarCount() {
    try {
      const result = await pool.query('SELECT COUNT(*) FROM cars');
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('Error getting car count:', error);
      throw new Error('Failed to get car count');
    }
  }
}

module.exports = new CarService();
