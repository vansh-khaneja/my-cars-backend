const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { JWT_SECRET, simpleAuthMiddleware } = require('../middleware/simpleAuth');

const router = express.Router();
// Get user ad limits and posted count (requires auth)
router.get('/me/ad-limits', simpleAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user.sub;
    const userResult = await pool.query('SELECT allowed_ads FROM users WHERE user_id = $1', [userId]);
    const allowedAds = userResult.rows[0]?.allowed_ads ?? 1;

    const countResult = await pool.query('SELECT COUNT(*)::int AS count FROM cars WHERE seller_id = $1', [userId]);
    const postedAds = countResult.rows[0]?.count ?? 0;

    res.json({
      allowedAds,
      postedAds,
      remaining: Math.max(allowedAds - postedAds, 0)
    });
  } catch (error) {
    console.error('Ad limits fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch ad limits' });
  }
});

// Sign up
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if user already exists
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate user ID
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Insert user
    const result = await pool.query(
      'INSERT INTO users (user_id, name, email, password_hash, allowed_ads) VALUES ($1, $2, $3, $4, $5) RETURNING id, user_id, name, email, created_at, allowed_ads',
      [userId, name, email, passwordHash, 1]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { 
        sub: user.user_id, 
        name: user.name, 
        email: user.email 
      }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        userId: user.user_id,
        name: user.name,
        email: user.email,
        createdAt: user.created_at,
        allowedAds: user.allowed_ads || 1
      },
      token
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Sign in
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        sub: user.user_id, 
        name: user.name, 
        email: user.email 
      }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Sign in successful',
      user: {
        id: user.id,
        userId: user.user_id,
        name: user.name,
        email: user.email,
        createdAt: user.created_at,
        allowedAds: user.allowed_ads || 1
      },
      token
    });

  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: 'Failed to sign in' });
  }
});

module.exports = router;
