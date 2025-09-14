const express = require('express');
const pool = require('../config/database');
const { simpleAuthMiddleware } = require('../middleware/simpleAuth');

const router = express.Router();

// Admin middleware - you can enhance this later with role-based access
const adminMiddleware = (req, res, next) => {
  // For now, bypass authentication for testing
  // Later you can add role checking here
  next();
};

// Get all users for admin panel
router.get('/users', adminMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', status = 'all', role = 'all' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        id,
        user_id,
        name,
        email,
        created_at,
        listing_quota,
        CASE 
          WHEN created_at > NOW() - INTERVAL '7 days' THEN 'active'
          ELSE 'active'
        END as status
      FROM users
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramCount = 0;

    // Add search filter
    if (search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    // Add status filter
    if (status !== 'all') {
      // For now, we'll just return all users as 'active'
      // You can enhance this based on your business logic
    }

    // Add ordering and pagination
    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(parseInt(limit), offset);

    const result = await pool.query(query, queryParams);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM users WHERE 1=1';
    const countParams = [];
    let countParamCount = 0;

    if (search) {
      countParamCount++;
      countQuery += ` AND (name ILIKE $${countParamCount} OR email ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    // Get listing counts for each user to determine role
    const userIds = result.rows.map(user => user.user_id);
    let listingCounts = {};
    
    if (userIds.length > 0) {
      const listingCountQuery = `
        SELECT seller_id, COUNT(*) as listing_count 
        FROM cars 
        WHERE seller_id = ANY($1) 
        GROUP BY seller_id
      `;
      const listingCountResult = await pool.query(listingCountQuery, [userIds]);
      listingCounts = listingCountResult.rows.reduce((acc, row) => {
        acc[row.seller_id] = parseInt(row.listing_count);
        return acc;
      }, {});
    }

    // Transform data to match admin panel format
    let users = result.rows.map(user => {
      const userListingCount = listingCounts[user.user_id] || 0;
      return {
        id: user.user_id,
        name: user.name,
        email: user.email,
        role: userListingCount > 0 ? 'dealer' : 'buyer', // Dealer if has listings, buyer otherwise
        status: user.status,
        listingQuota: user.listing_quota || 1,
        createdAt: user.created_at.toISOString().split('T')[0]
      };
    });

    // Apply role filter
    if (role !== 'all') {
      if (role === 'dealers') {
        users = users.filter(user => user.role === 'dealer');
      } else if (role === 'buyers') {
        users = users.filter(user => user.role === 'buyer');
      }
    }

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Admin users fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get all listings for admin panel
router.get('/listings', adminMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', status = 'all' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        c.id,
        c.make,
        c.model,
        c.year,
        c.price,
        c.seller_name,
        c.seller_id,
        c.created_at,
        c.description,
        c.expiration_date,
        CASE 
          WHEN bo.id IS NOT NULL AND bo.boost_end_date > NOW() THEN true
          ELSE false
        END as is_featured,
        CASE 
          WHEN c.created_at > NOW() - INTERVAL '7 days' THEN 'approved'
          ELSE 'approved'
        END as status
      FROM cars c
      LEFT JOIN boost_orders bo ON c.id = bo.car_id 
        AND bo.status = 'completed' 
        AND bo.boost_end_date > NOW()
      WHERE c.expiration_date > NOW()
    `;
    
    const queryParams = [];
    let paramCount = 0;

    // Add search filter
    if (search) {
      paramCount++;
      query += ` AND (c.make ILIKE $${paramCount} OR c.model ILIKE $${paramCount} OR c.seller_name ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    // Add status filter
    if (status !== 'all') {
      // For now, we'll just return all listings as 'approved'
      // You can enhance this based on your business logic
    }

    // Add ordering and pagination
    query += ` ORDER BY c.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(parseInt(limit), offset);

    const result = await pool.query(query, queryParams);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM cars c WHERE c.expiration_date > NOW()';
    const countParams = [];
    let countParamCount = 0;

    if (search) {
      countParamCount++;
      countQuery += ` AND (c.make ILIKE $${countParamCount} OR c.model ILIKE $${countParamCount} OR c.seller_name ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    // Transform data to match admin panel format
    const listings = result.rows.map(car => ({
      id: `lst${car.id.toString().padStart(3, '0')}`,
      title: `${car.year} ${car.make} ${car.model}`,
      status: car.status,
      price: car.price,
      user: car.seller_name,
      createdAt: car.created_at.toISOString().split('T')[0],
      isFeatured: car.is_featured,
      expirationDate: car.expiration_date.toISOString()
    }));

    res.json({
      listings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Admin listings fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// Get dashboard stats
router.get('/stats', adminMiddleware, async (req, res) => {
  try {
    // Get total users count
    const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');
    const totalUsers = parseInt(usersResult.rows[0].count);

    // Get total listings count
    const listingsResult = await pool.query('SELECT COUNT(*) as count FROM cars');
    const totalListings = parseInt(listingsResult.rows[0].count);

    // Get active users (registered in last 30 days)
    const activeUsersResult = await pool.query(`
      SELECT COUNT(*) as count FROM users 
      WHERE created_at > NOW() - INTERVAL '30 days'
    `);
    const activeUsers = parseInt(activeUsersResult.rows[0].count);

    // Get featured listings count
    const featuredResult = await pool.query(`
      SELECT COUNT(*) as count FROM cars c
      JOIN boost_orders bo ON c.id = bo.car_id 
      WHERE bo.status = 'completed' AND bo.boost_end_date > NOW()
    `);
    const featuredListings = parseInt(featuredResult.rows[0].count);

    res.json({
      totalUsers,
      totalListings,
      activeUsers,
      featuredListings,
      quotaUsage: Math.round((featuredListings / Math.max(totalListings, 1)) * 100)
    });

  } catch (error) {
    console.error('Admin stats fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Get listing trends data
router.get('/trends', adminMiddleware, async (req, res) => {
  try {
    const { period = '7', type = 'daily' } = req.query;
    
    // Validate period - updated to 7, 15, 30 days
    const validPeriods = ['7', '15', '30'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid period. Must be 7, 15, or 30 days' 
      });
    }
    
    // Validate type
    const validTypes = ['daily', 'weekly', 'monthly'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid type. Must be daily, weekly, or monthly' 
      });
    }

    // Get trends data from analytics table - simplified query
    const trendsQuery = `
      SELECT 
        date,
        active_listings,
        total_users,
        featured_listings
      FROM analytics 
      WHERE date >= CURRENT_DATE - INTERVAL '${parseInt(period)} days'
      ORDER BY date ASC
    `;

    const trendsResult = await pool.query(trendsQuery);

    // Format the data for the frontend - only 3 metrics
    const trendsData = trendsResult.rows.map(row => ({
      date: row.date,
      activeListings: parseInt(row.active_listings) || 0,
      totalUsers: parseInt(row.total_users) || 0,
      featuredListings: parseInt(row.featured_listings) || 0
    }));

    // Use real data from analytics table
    console.log(`📊 Fetched ${trendsData.length} analytics records`);

    res.json({
      success: true,
      data: trendsData,
      period: parseInt(period),
      type
    });

  } catch (error) {
    console.error('Trends fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch trends data' });
  }
});

// Update user status (suspend/activate)
router.patch('/users/:userId/status', adminMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // For now, we'll just return success
    // You can implement actual status update logic here
    res.json({ 
      message: 'User status updated successfully',
      userId,
      status 
    });

  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Update user listing quota
router.patch('/users/:userId/quota', adminMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { listingQuota } = req.body;

    if (!listingQuota || typeof listingQuota !== 'number' || listingQuota < 0) {
      return res.status(400).json({ error: 'Valid listing quota is required' });
    }

    // Check if user exists
    const userResult = await pool.query('SELECT user_id FROM users WHERE user_id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update listing quota
    await pool.query(
      'UPDATE users SET listing_quota = $1 WHERE user_id = $2',
      [listingQuota, userId]
    );

    res.json({ 
      message: 'User listing quota updated successfully',
      userId,
      listingQuota 
    });

  } catch (error) {
    console.error('Update user quota error:', error);
    res.status(500).json({ error: 'Failed to update user quota' });
  }
});

// Update listing status (approve/reject/pause)
router.patch('/listings/:listingId/status', adminMiddleware, async (req, res) => {
  try {
    const { listingId } = req.params;
    const { status } = req.body;

    if (!['pending', 'approved', 'rejected', 'paused'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // For now, we'll just return success
    // You can implement actual status update logic here
    res.json({ 
      message: 'Listing status updated successfully',
      listingId,
      status 
    });

  } catch (error) {
    console.error('Update listing status error:', error);
    res.status(500).json({ error: 'Failed to update listing status' });
  }
});

// Update listing featured status
router.patch('/listings/:listingId/featured', adminMiddleware, async (req, res) => {
  try {
    const { listingId } = req.params;
    const { isFeatured } = req.body;

    // Extract the actual car ID from the listing ID (remove 'lst' prefix and padding)
    const carId = parseInt(listingId.replace('lst', ''));

    if (typeof isFeatured !== 'boolean') {
      return res.status(400).json({ error: 'isFeatured must be a boolean' });
    }

    if (isFeatured) {
      // Add featured status by creating a boost order
      const boostEndDate = new Date();
      boostEndDate.setDate(boostEndDate.getDate() + 30); // 30 days from now

      // First, delete any existing boost order for this car
      await pool.query('DELETE FROM boost_orders WHERE car_id = $1', [carId]);
      
      // Get the seller_id for this car to use as user_id
      const carResult = await pool.query('SELECT seller_id FROM cars WHERE id = $1', [carId]);
      if (carResult.rows.length === 0) {
        return res.status(404).json({ error: 'Car not found' });
      }
      const sellerId = carResult.rows[0].seller_id;
      
      // Generate a unique order_id
      const orderId = `boost_${carId}_${Date.now()}`;
      
      // Then insert a new one
      await pool.query(`
        INSERT INTO boost_orders (order_id, user_id, car_id, amount, status, boost_start_date, boost_end_date, created_at)
        VALUES ($1, $2, $3, $4, 'completed', NOW(), $5, NOW())
      `, [orderId, sellerId, carId, 0, boostEndDate]);
    } else {
      // Remove featured status by deleting boost order
      await pool.query('DELETE FROM boost_orders WHERE car_id = $1', [carId]);
    }

    res.json({ 
      message: 'Listing featured status updated successfully',
      listingId,
      isFeatured 
    });

  } catch (error) {
    console.error('Update listing featured status error:', error);
    res.status(500).json({ error: 'Failed to update listing featured status', details: error.message });
  }
});

// Update listing expiration date
router.patch('/listings/:listingId/expiration', adminMiddleware, async (req, res) => {
  try {
    const { listingId } = req.params;
    const { expirationDate } = req.body;

    // Extract the actual car ID from the listing ID (remove 'lst' prefix and padding)
    const carId = parseInt(listingId.replace('lst', ''));

    if (!expirationDate) {
      return res.status(400).json({ error: 'expirationDate is required' });
    }

    // Validate date format
    const expirationDateObj = new Date(expirationDate);
    if (isNaN(expirationDateObj.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // Check if car exists
    const carResult = await pool.query('SELECT id FROM cars WHERE id = $1', [carId]);
    if (carResult.rows.length === 0) {
      return res.status(404).json({ error: 'Car not found' });
    }

    // Update expiration date
    await pool.query(
      'UPDATE cars SET expiration_date = $1 WHERE id = $2',
      [expirationDate, carId]
    );

    res.json({ 
      message: 'Listing expiration date updated successfully',
      listingId,
      expirationDate 
    });

  } catch (error) {
    console.error('Update listing expiration error:', error);
    res.status(500).json({ error: 'Failed to update listing expiration', details: error.message });
  }
});

module.exports = router;
