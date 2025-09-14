const express = require('express');
const ActivityService = require('../services/activityService');

const router = express.Router();

// Admin middleware - you can enhance this later with role-based access
const adminMiddleware = (req, res, next) => {
  // For now, bypass authentication for testing
  // Later you can add role checking here
  next();
};

// Get recent activity for admin dashboard
router.get('/recent-activity', adminMiddleware, async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    // Get activities from database
    const activities = await ActivityService.getRecentActivities(parseInt(limit));
    
    // Format activities for frontend
    const formattedActivities = ActivityService.formatActivities(activities);
    
    res.json({
      success: true,
      activities: formattedActivities,
      total: formattedActivities.length
    });
    
  } catch (error) {
    console.error('Recent activity fetch error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch recent activity' 
    });
  }
});

module.exports = router;
