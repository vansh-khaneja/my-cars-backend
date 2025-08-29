const express = require('express');
const carController = require('../controllers/carController');
const { 
  uploadMultiple, 
  uploadSingle, 
  cleanupUploads, 
  handleUploadError 
} = require('../middleware/upload');
const { simpleAuthMiddleware } = require('../middleware/simpleAuth');

const router = express.Router();

// Apply upload error handling to all routes
router.use(handleUploadError);

// Get all cars with filtering and pagination
router.get('/', carController.getAllCars);

// Search cars with advanced filters
router.get('/search', carController.searchCars);

// Get car statistics
router.get('/stats', carController.getCarStats);

// Get car by ID
router.get('/:id', carController.getCarById);

// Get cars by seller
router.get('/seller/:sellerId', carController.getCarsBySeller);

// Create new car listing with image uploads
router.post('/',
  simpleAuthMiddleware,
  uploadMultiple,
  cleanupUploads,
  carController.createCar
);

// Update car listing
router.put('/:id',
  simpleAuthMiddleware,
  uploadMultiple,
  cleanupUploads,
  carController.updateCar
);

// Delete car listing
router.delete('/:id',
  simpleAuthMiddleware,
  carController.deleteCar
);

// Upload additional images for existing car
router.post('/:id/images',
  simpleAuthMiddleware,
  uploadMultiple,
  cleanupUploads,
  carController.uploadCarImages
);

// Delete specific image from car
router.delete('/:id/images/:imageIndex',
  simpleAuthMiddleware,
  carController.deleteCarImage
);

module.exports = router;
