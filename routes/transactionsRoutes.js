const express = require('express');
const pool = require('../config/database');

const router = express.Router();

// Admin middleware - you can enhance this later with role-based access
const adminMiddleware = (req, res, next) => {
  // For now, bypass authentication for testing
  // Later you can add role checking here
  next();
};

// Get all transactions for admin panel
router.get('/', adminMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', type = 'all', status = 'all' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        id,
        transaction_id,
        type,
        amount,
        received,
        refunded,
        user_id,
        user_name,
        description,
        status,
        payment_method,
        reason,
        employee_id,
        employee_name,
        created_at
      FROM transactions
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramCount = 0;

    // Add search filter
    if (search) {
      paramCount++;
      query += ` AND (user_name ILIKE $${paramCount} OR description ILIKE $${paramCount} OR transaction_id ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    // Add type filter
    if (type !== 'all') {
      paramCount++;
      query += ` AND type = $${paramCount}`;
      queryParams.push(type);
    }

    // Add status filter
    if (status !== 'all') {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      queryParams.push(status);
    }

    // Add ordering and pagination
    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(parseInt(limit), offset);

    const result = await pool.query(query, queryParams);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM transactions WHERE 1=1';
    const countParams = [];
    let countParamCount = 0;

    if (search) {
      countParamCount++;
      countQuery += ` AND (user_name ILIKE $${countParamCount} OR description ILIKE $${countParamCount} OR transaction_id ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }

    if (type !== 'all') {
      countParamCount++;
      countQuery += ` AND type = $${countParamCount}`;
      countParams.push(type);
    }

    if (status !== 'all') {
      countParamCount++;
      countQuery += ` AND status = $${countParamCount}`;
      countParams.push(status);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    // Transform data to match frontend format
    const transactions = result.rows.map(transaction => ({
      id: transaction.transaction_id,
      type: transaction.type,
      amount: parseFloat(transaction.amount),
      received: parseFloat(transaction.received),
      refunded: parseFloat(transaction.refunded),
      userId: transaction.user_id,
      userName: transaction.user_name,
      description: transaction.description,
      status: transaction.status,
      paymentMethod: transaction.payment_method,
      reason: transaction.reason,
      employeeId: transaction.employee_id,
      employeeName: transaction.employee_name,
      createdAt: transaction.created_at.toISOString().split('T')[0]
    }));

    res.json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Transactions fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get transaction statistics
router.get('/stats', adminMiddleware, async (req, res) => {
  try {
    // Get total revenue
    const revenueResult = await pool.query(`
      SELECT 
        SUM(received) as total_received,
        SUM(refunded) as total_refunded,
        COUNT(*) as total_transactions
      FROM transactions 
      WHERE status = 'completed'
    `);
    
    const stats = revenueResult.rows[0];
    
    // Get pending amount
    const pendingResult = await pool.query(`
      SELECT SUM(amount) as pending_amount
      FROM transactions 
      WHERE status = 'pending'
    `);
    
    // Get transactions by type
    const typeResult = await pool.query(`
      SELECT type, COUNT(*) as count, SUM(received) as total
      FROM transactions 
      WHERE status = 'completed'
      GROUP BY type
    `);

    res.json({
      totalRevenue: parseFloat(stats.total_received || 0),
      totalRefunded: parseFloat(stats.total_refunded || 0),
      pendingAmount: parseFloat(pendingResult.rows[0].pending_amount || 0),
      totalTransactions: parseInt(stats.total_transactions || 0),
      transactionsByType: typeResult.rows.map(row => ({
        type: row.type,
        count: parseInt(row.count),
        total: parseFloat(row.total || 0)
      }))
    });

  } catch (error) {
    console.error('Transaction stats error:', error);
    res.status(500).json({ error: 'Failed to fetch transaction statistics' });
  }
});

// Create a new transaction
router.post('/', adminMiddleware, async (req, res) => {
  try {
    const {
      type,
      amount,
      received = 0,
      refunded = 0,
      userId,
      userName,
      description,
      status = 'pending',
      paymentMethod,
      reason,
      employeeId,
      employeeName
    } = req.body;

    // Generate unique transaction ID
    const transactionId = `tx${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const result = await pool.query(`
      INSERT INTO transactions (
        transaction_id, type, amount, received, refunded, user_id, user_name,
        description, status, payment_method, reason, employee_id, employee_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      transactionId, type, amount, received, refunded, userId, userName,
      description, status, paymentMethod, reason, employeeId, employeeName
    ]);

    const transaction = result.rows[0];
    
    res.status(201).json({
      id: transaction.transaction_id,
      type: transaction.type,
      amount: parseFloat(transaction.amount),
      received: parseFloat(transaction.received),
      refunded: parseFloat(transaction.refunded),
      userId: transaction.user_id,
      userName: transaction.user_name,
      description: transaction.description,
      status: transaction.status,
      paymentMethod: transaction.payment_method,
      reason: transaction.reason,
      employeeId: transaction.employee_id,
      employeeName: transaction.employee_name,
      createdAt: transaction.created_at.toISOString().split('T')[0]
    });

  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// Update transaction status
router.patch('/:transactionId/status', adminMiddleware, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { status, received, refunded, reason } = req.body;

    const result = await pool.query(`
      UPDATE transactions 
      SET status = $1, received = $2, refunded = $3, reason = $4, updated_at = CURRENT_TIMESTAMP
      WHERE transaction_id = $5
      RETURNING *
    `, [status, received || 0, refunded || 0, reason, transactionId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transaction = result.rows[0];
    
    res.json({
      id: transaction.transaction_id,
      type: transaction.type,
      amount: parseFloat(transaction.amount),
      received: parseFloat(transaction.received),
      refunded: parseFloat(transaction.refunded),
      userId: transaction.user_id,
      userName: transaction.user_name,
      description: transaction.description,
      status: transaction.status,
      paymentMethod: transaction.payment_method,
      reason: transaction.reason,
      employeeId: transaction.employee_id,
      employeeName: transaction.employee_name,
      createdAt: transaction.created_at.toISOString().split('T')[0]
    });

  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

module.exports = router;
