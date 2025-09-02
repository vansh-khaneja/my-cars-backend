const carService = require('../services/carService');
const Car = require('../models/Car');
const { simpleAuthMiddleware } = require('../middleware/simpleAuth');

class CarController {
  // Get all cars with optional filtering and pagination
  async getAllCars(req, res) {
    try {
      const { page = 1, limit = 20, ...filters } = req.query;
      
      const cars = await carService.getAllCars(
        parseInt(page), 
        parseInt(limit), 
        filters
      );
      
      res.json(cars.map(car => car.toResponseFormat()));
    } catch (error) {
      console.error('Controller error - getAllCars:', error);
      res.status(500).json({ 
        error: 'Failed to fetch cars',
        message: error.message 
      });
    }
  }

  // Get car by ID
  async getCarById(req, res) {
    try {
      const { id } = req.params;
      const car = await carService.getCarById(parseInt(id));
      
      if (!car) {
        return res.status(404).json({ error: 'Car not found' });
      }
      
      res.json(car.toResponseFormat());
    } catch (error) {
      console.error('Controller error - getCarById:', error);
      res.status(500).json({ 
        error: 'Failed to fetch car',
        message: error.message 
      });
    }
  }

  // Create new car listing
  async createCar(req, res) {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const carData = req.body;
      const imageFiles = req.files || [];
      
      // Override seller information with authenticated user data
      carData.sellerId = req.user.sub; // Simple auth user ID
      carData.sellerName = req.user.name || req.user.email || 'Unknown';

      // Enforce per-user ad limit
      try {
        const pool = require('../config/database');
        const userResult = await pool.query('SELECT allowed_ads FROM users WHERE user_id = $1', [carData.sellerId]);
        const allowedAds = userResult.rows[0]?.allowed_ads ?? 1;
        const countResult = await pool.query('SELECT COUNT(*)::int AS count FROM cars WHERE seller_id = $1', [carData.sellerId]);
        const postedAds = countResult.rows[0]?.count ?? 0;
        if (postedAds >= allowedAds) {
          return res.status(403).json({ error: 'Listing limit reached', allowedAds, postedAds });
        }
      } catch (e) {
        // If check fails, continue without blocking
      }
      
      // Sanitize and validate numeric fields
      if (carData.year) {
        const year = parseInt(carData.year);
        if (isNaN(year)) {
          return res.status(400).json({
            error: 'Invalid year format',
            details: ['Year must be a valid number']
          });
        }
        carData.year = year;
      }
      
      if (carData.price) {
        const price = parseInt(carData.price);
        if (isNaN(price)) {
          return res.status(400).json({
            error: 'Invalid price format',
            details: ['Price must be a valid number']
          });
        }
        carData.price = price;
      }
      
      if (carData.mileage) {
        const mileage = parseInt(carData.mileage);
        if (isNaN(mileage)) {
          return res.status(400).json({
            error: 'Invalid mileage format',
            details: ['Mileage must be a valid number']
          });
        }
        carData.mileage = mileage;
      }
      
      // Validate required fields
      const validation = Car.validate(carData);
      if (!validation.isValid) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.errors
        });
      }

      // Create car with images
      const car = await carService.createCar(carData, imageFiles);
      
      res.status(201).json({
        message: 'Car listing created successfully',
        car: car.toResponseFormat()
      });
    } catch (error) {
      console.error('Controller error - createCar:', error);
      res.status(500).json({ 
        error: 'Failed to create car listing',
        message: error.message 
      });
    }
  }

  // Update car listing
  async updateCar(req, res) {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      const carData = req.body;
      const imageFiles = req.files || [];
      
      // Check if user owns this car listing
      const existingCar = await carService.getCarById(parseInt(id));
      if (!existingCar) {
        return res.status(404).json({ error: 'Car not found' });
      }
      
      if (existingCar.sellerId !== req.user.sub) {
        return res.status(403).json({ error: 'You can only edit your own listings' });
      }
      
      // Sanitize and validate numeric fields
      if (carData.year) {
        const year = parseInt(carData.year);
        if (isNaN(year)) {
          return res.status(400).json({
            error: 'Invalid year format',
            details: ['Year must be a valid number']
          });
        }
        carData.year = year;
      }
      
      if (carData.price) {
        const price = parseInt(carData.price);
        if (isNaN(price)) {
          return res.status(400).json({
            error: 'Invalid price format',
            details: ['Price must be a valid number']
          });
        }
        carData.price = price;
      }
      
      if (carData.mileage) {
        const mileage = parseInt(carData.mileage);
        if (isNaN(mileage)) {
          return res.status(400).json({
            error: 'Invalid mileage format',
            details: ['Mileage must be a valid number']
          });
        }
        carData.mileage = mileage;
      }
      
      // Validate required fields
      const validation = Car.validate(carData);
      if (!validation.isValid) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.errors
        });
      }

      // Update car
      const car = await carService.updateCar(parseInt(id), carData, imageFiles);
      
      res.json({
        message: 'Car listing updated successfully',
        car: car.toResponseFormat()
      });
    } catch (error) {
      console.error('Controller error - updateCar:', error);
      
      if (error.message === 'Car not found') {
        return res.status(404).json({ error: 'Car not found' });
      }
      
      res.status(500).json({ 
        error: 'Failed to update car listing',
        message: error.message 
      });
    }
  }

  // Delete car listing
  async deleteCar(req, res) {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      
      // Check if user owns this car listing
      const existingCar = await carService.getCarById(parseInt(id));
      if (!existingCar) {
        return res.status(404).json({ error: 'Car not found' });
      }
      
      if (existingCar.sellerId !== req.user.sub) {
        return res.status(403).json({ error: 'You can only delete your own listings' });
      }
      
      await carService.deleteCar(parseInt(id));
      
      res.json({ message: 'Car listing deleted successfully' });
    } catch (error) {
      console.error('Controller error - deleteCar:', error);
      
      if (error.message === 'Car not found') {
        return res.status(404).json({ error: 'Car not found' });
      }
      
      res.status(500).json({ 
        error: 'Failed to delete car listing',
        message: error.message 
      });
    }
  }

  // Search cars with advanced filters
  async searchCars(req, res) {
    try {
      const searchParams = req.query;
      const cars = await carService.searchCars(searchParams);
      
      res.json({
        results: cars.map(car => car.toResponseFormat()),
        total: cars.length,
        filters: searchParams
      });
    } catch (error) {
      console.error('Controller error - searchCars:', error);
      res.status(500).json({ 
        error: 'Failed to search cars',
        message: error.message 
      });
    }
  }

  // Get cars by seller
  async getCarsBySeller(req, res) {
    try {
      const { sellerId } = req.params;
      const cars = await carService.getCarsBySeller(sellerId);
      
      res.json(cars.map(car => car.toResponseFormat()));
    } catch (error) {
      console.error('Controller error - getCarsBySeller:', error);
      res.status(500).json({ 
        error: 'Failed to fetch seller cars',
        message: error.message 
      });
    }
  }

  // Get car statistics
  async getCarStats(req, res) {
    try {
      const totalCars = await carService.getCarCount();
      
      res.json({
        totalCars,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Controller error - getCarStats:', error);
      res.status(500).json({ 
        error: 'Failed to fetch car statistics',
        message: error.message 
      });
    }
  }

  // Upload images for existing car (separate endpoint)
  async uploadCarImages(req, res) {
    try {
      const { id } = req.params;
      const imageFiles = req.files || [];
      
      if (imageFiles.length === 0) {
        return res.status(400).json({ error: 'No images provided' });
      }

      // Get existing car
      const existingCar = await carService.getCarById(parseInt(id));
      if (!existingCar) {
        return res.status(404).json({ error: 'Car not found' });
      }

      // Upload new images
      const { uploadMultipleImages } = require('../config/cloudinary');
      const newImages = await uploadMultipleImages(imageFiles, 'mycars/cars');
      
      // Process new images
      const processedNewImages = Car.processImages(newImages);
      
      // Combine with existing images
      const updatedImages = [...existingCar.images, ...processedNewImages];
      
      // Update car with new images
      const updatedCar = await carService.updateCar(parseInt(id), { images: updatedImages });
      
      res.json({
        message: 'Images uploaded successfully',
        car: updatedCar.toResponseFormat()
      });
    } catch (error) {
      console.error('Controller error - uploadCarImages:', error);
      res.status(500).json({ 
        error: 'Failed to upload images',
        message: error.message 
      });
    }
  }

  // Delete specific image from car
  async deleteCarImage(req, res) {
    try {
      const { id, imageIndex } = req.params;
      
      // Get existing car
      const existingCar = await carService.getCarById(parseInt(id));
      if (!existingCar) {
        return res.status(404).json({ error: 'Car not found' });
      }

      const imageIndexNum = parseInt(imageIndex);
      if (imageIndexNum < 0 || imageIndexNum >= existingCar.images.length) {
        return res.status(400).json({ error: 'Invalid image index' });
      }

      const imageToDelete = existingCar.images[imageIndexNum];
      
      // Delete from Cloudinary if it's a Cloudinary image
      if (imageToDelete.publicId) {
        const { deleteImage } = require('../config/cloudinary');
        await deleteImage(imageToDelete.publicId);
      }

      // Remove image from array
      const updatedImages = existingCar.images.filter((_, index) => index !== imageIndexNum);
      
      // Update car
      const updatedCar = await carService.updateCar(parseInt(id), { images: updatedImages });
      
      res.json({
        message: 'Image deleted successfully',
        car: updatedCar.toResponseFormat()
      });
    } catch (error) {
      console.error('Controller error - deleteCarImage:', error);
      res.status(500).json({ 
        error: 'Failed to delete image',
        message: error.message 
      });
    }
  }
}

module.exports = new CarController();
