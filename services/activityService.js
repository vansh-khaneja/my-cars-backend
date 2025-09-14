const pool = require('../config/database');

class ActivityService {
  // Log a new activity
  static async logActivity(activityData) {
    try {
      const {
        type,
        action,
        description,
        user,
        referenceId = null,
        metadata = null
      } = activityData;

      const result = await pool.query(`
        INSERT INTO activities (activity_type, action, description, user_name, reference_id, metadata)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, created_at
      `, [type, action, description, user, referenceId, metadata ? JSON.stringify(metadata) : null]);

      console.log(`📝 Activity logged: ${type} - ${description}`);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error logging activity:', error);
      throw error;
    }
  }

  // Get recent activities
  static async getRecentActivities(limit = 5) {
    try {
      const result = await pool.query(`
        SELECT 
          id,
          activity_type as type,
          action,
          description,
          user_name as user,
          reference_id as referenceId,
          metadata,
          created_at as timestamp
        FROM activities 
        ORDER BY created_at DESC 
        LIMIT $1
      `, [limit]);

      return result.rows;
    } catch (error) {
      console.error('❌ Error fetching activities:', error);
      throw error;
    }
  }

  // Helper function to calculate time ago
  static getTimeAgo(timestamp) {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now - activityTime) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  }

  // Format activities for API response
  static formatActivities(activities) {
    return activities.map(activity => ({
      id: `${activity.type}_${activity.referenceId || 'unknown'}_${new Date(activity.timestamp).getTime()}`,
      type: activity.type,
      action: activity.action,
      description: activity.description,
      user: activity.user,
      timestamp: activity.timestamp,
      timeAgo: this.getTimeAgo(activity.timestamp),
      metadata: activity.metadata ? (typeof activity.metadata === 'string' ? JSON.parse(activity.metadata) : activity.metadata) : null
    }));
  }
}

module.exports = ActivityService;
