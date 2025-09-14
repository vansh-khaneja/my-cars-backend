const express = require('express');
const pool = require('../config/database');

// Admin middleware - you can enhance this later with role-based access
const adminMiddleware = (req, res, next) => {
  // For now, bypass authentication for testing
  // Later you can add role checking here
  next();
};

const router = express.Router();

// Get all leads for admin panel
router.get('/', adminMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', status = 'all', priority = 'all' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        id,
        name,
        email,
        phone,
        message,
        listing_id,
        status,
        priority,
        assigned_to,
        created_at,
        updated_at
      FROM leads
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramCount = 0;

    // Add search filter
    if (search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount} OR phone ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    // Add status filter
    if (status !== 'all') {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      queryParams.push(status);
    }

    // Add priority filter
    if (priority !== 'all') {
      paramCount++;
      query += ` AND priority = $${paramCount}`;
      queryParams.push(priority);
    }

    // Add ordering and pagination
    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(parseInt(limit), offset);

    const result = await pool.query(query, queryParams);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM leads WHERE 1=1';
    const countParams = [];
    let countParamCount = 0;

    if (search) {
      countParamCount++;
      countQuery += ` AND (name ILIKE $${countParamCount} OR email ILIKE $${countParamCount} OR phone ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }

    if (status !== 'all') {
      countParamCount++;
      countQuery += ` AND status = $${countParamCount}`;
      countParams.push(status);
    }

    if (priority !== 'all') {
      countParamCount++;
      countQuery += ` AND priority = $${countParamCount}`;
      countParams.push(priority);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    // Transform data to match admin panel format
    const leads = result.rows.map(lead => ({
      id: `ld${lead.id.toString().padStart(3, '0')}`,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      message: lead.message,
      listingId: lead.listing_id,
      status: lead.status,
      priority: lead.priority,
      assignedTo: lead.assigned_to,
      createdAt: lead.created_at.toISOString().split('T')[0],
      updatedAt: lead.updated_at.toISOString().split('T')[0]
    }));

    res.json({
      leads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// Create new lead
router.post('/', adminMiddleware, async (req, res) => {
  try {
    const { name, email, phone, message, listingId, status = 'new', priority = 'medium', assignedTo } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const result = await pool.query(
      `INSERT INTO leads (name, email, phone, message, listing_id, status, priority, assigned_to) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [name, email, phone, message, listingId, status, priority, assignedTo]
    );

    const lead = result.rows[0];
    res.status(201).json({
      id: `ld${lead.id.toString().padStart(3, '0')}`,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      message: lead.message,
      listingId: lead.listing_id,
      status: lead.status,
      priority: lead.priority,
      assignedTo: lead.assigned_to,
      createdAt: lead.created_at.toISOString().split('T')[0],
      updatedAt: lead.updated_at.toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// Update lead status
router.patch('/:leadId/status', adminMiddleware, async (req, res) => {
  try {
    const { leadId } = req.params;
    const { status } = req.body;

    // Extract the actual lead ID from the lead ID (remove 'ld' prefix and padding)
    const actualLeadId = parseInt(leadId.replace('ld', ''));

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const validStatuses = ['new', 'contacted', 'qualified', 'converted', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await pool.query(
      'UPDATE leads SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, actualLeadId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const lead = result.rows[0];
    res.json({
      id: `ld${lead.id.toString().padStart(3, '0')}`,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      message: lead.message,
      listingId: lead.listing_id,
      status: lead.status,
      priority: lead.priority,
      assignedTo: lead.assigned_to,
      createdAt: lead.created_at.toISOString().split('T')[0],
      updatedAt: lead.updated_at.toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Update lead status error:', error);
    res.status(500).json({ error: 'Failed to update lead status' });
  }
});

// Update lead priority
router.patch('/:leadId/priority', adminMiddleware, async (req, res) => {
  try {
    const { leadId } = req.params;
    const { priority } = req.body;

    // Extract the actual lead ID from the lead ID (remove 'ld' prefix and padding)
    const actualLeadId = parseInt(leadId.replace('ld', ''));

    if (!priority) {
      return res.status(400).json({ error: 'Priority is required' });
    }

    const validPriorities = ['low', 'medium', 'high'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority' });
    }

    const result = await pool.query(
      'UPDATE leads SET priority = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [priority, actualLeadId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const lead = result.rows[0];
    res.json({
      id: `ld${lead.id.toString().padStart(3, '0')}`,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      message: lead.message,
      listingId: lead.listing_id,
      status: lead.status,
      priority: lead.priority,
      assignedTo: lead.assigned_to,
      createdAt: lead.created_at.toISOString().split('T')[0],
      updatedAt: lead.updated_at.toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Update lead priority error:', error);
    res.status(500).json({ error: 'Failed to update lead priority' });
  }
});

// Assign lead to agent
router.patch('/:leadId/assign', adminMiddleware, async (req, res) => {
  try {
    const { leadId } = req.params;
    const { assignedTo } = req.body;

    // Extract the actual lead ID from the lead ID (remove 'ld' prefix and padding)
    const actualLeadId = parseInt(leadId.replace('ld', ''));

    const result = await pool.query(
      'UPDATE leads SET assigned_to = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [assignedTo, actualLeadId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const lead = result.rows[0];
    res.json({
      id: `ld${lead.id.toString().padStart(3, '0')}`,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      message: lead.message,
      listingId: lead.listing_id,
      status: lead.status,
      priority: lead.priority,
      assignedTo: lead.assigned_to,
      createdAt: lead.created_at.toISOString().split('T')[0],
      updatedAt: lead.updated_at.toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Assign lead error:', error);
    res.status(500).json({ error: 'Failed to assign lead' });
  }
});

// Delete lead
router.delete('/:leadId', adminMiddleware, async (req, res) => {
  try {
    const { leadId } = req.params;

    // Extract the actual lead ID from the lead ID (remove 'ld' prefix and padding)
    const actualLeadId = parseInt(leadId.replace('ld', ''));

    const result = await pool.query('DELETE FROM leads WHERE id = $1 RETURNING *', [actualLeadId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

module.exports = router;
