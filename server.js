const express = require('express');
const cors = require('cors');
const pool = require('./config/database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const carRoutes = require('./routes/carRoutes');
const chatRoutes = require('./routes/chatRoutes');
const authRoutes = require('./routes/authRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const boostRoutes = require('./routes/boostRoutes');
const adminRoutes = require('./routes/adminRoutes');
const leadsRoutes = require('./routes/leadsRoutes');
const transactionsRoutes = require('./routes/transactionsRoutes');
const contentRoutes = require('./routes/contentRoutes');
const activityRoutes = require('./routes/activityRoutes');

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to MyCars API' });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Debug route to check boost orders
app.get('/debug/boost-orders', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM boost_orders ORDER BY created_at DESC');
    res.json({
      count: result.rows.length,
      orders: result.rows
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug route to check database structure
app.get('/debug/db-structure', async (req, res) => {
  try {
    // Check if boost_orders table exists
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('cars', 'boost_orders', 'users')
      ORDER BY table_name
    `);
    
    // Check boost_orders table structure
    let boostStructure = null;
    try {
      const structureResult = await pool.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'boost_orders' 
        ORDER BY ordinal_position
      `);
      boostStructure = structureResult.rows;
    } catch (e) {
      boostStructure = { error: 'Table does not exist' };
    }
    
    res.json({
      existingTables: tableCheck.rows.map(row => row.table_name),
      boostOrdersStructure: boostStructure
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug route to check boost status of a specific car
app.get('/debug/car-boost/:carId', async (req, res) => {
  try {
    const { carId } = req.params;
    
    // Check boost orders for this car
    const boostResult = await pool.query(`
      SELECT * FROM boost_orders 
      WHERE car_id = $1 
      ORDER BY created_at DESC
    `, [carId]);
    
    // Check if car exists
    const carResult = await pool.query('SELECT * FROM cars WHERE id = $1', [carId]);
    
    res.json({
      car: carResult.rows[0] || null,
      boostOrders: boostResult.rows,
      boostCount: boostResult.rows.length
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to show car data format
app.get('/debug/cars-format', async (req, res) => {
  try {
    // Get first car with boost info
    const result = await pool.query(`
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
      LIMIT 1
    `);
    
    if (result.rows.length > 0) {
      const rawCar = result.rows[0];
      const processedCar = new (require('./models/Car'))(rawCar);
      
      res.json({
        rawDatabaseRow: rawCar,
        processedCarObject: processedCar,
        processedCarKeys: Object.keys(processedCar),
        isBoostedValue: processedCar.isBoosted,
        isBoostedType: typeof processedCar.isBoosted
      });
    } else {
      res.json({ error: 'No cars found' });
    }
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/boost', boostRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/content', contentRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      error: 'Validation Error',
      message: err.message 
    });
  }
  
  if (err.name === 'MulterError') {
    return res.status(400).json({ 
      error: 'File Upload Error',
      message: err.message 
    });
  }
  
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    message: `The route ${req.originalUrl} does not exist` 
  });
});

app.listen(PORT, () => {
  console.log(`🚗 MyCars API Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🚙 Cars API: http://localhost:${PORT}/api/cars`);
  console.log(`🔍 Search API: http://localhost:${PORT}/api/cars/search`);
  console.log(`📊 Stats API: http://localhost:${PORT}/api/cars/stats`);
});
