const express = require('express');
const router = express.Router();
const Content = require('../models/Content');
const { simpleAuthMiddleware } = require('../middleware/simpleAuth');

const contentModel = new Content();

// Get all content (with optional filters) - temporarily without auth for testing
router.get('/', async (req, res) => {
  try {
    const { type, status, category, author_id, limit, offset, search } = req.query;
    
    let content;
    if (search) {
      content = await contentModel.search(search, { type, status, category, author_id, limit, offset });
    } else {
      content = await contentModel.getAll({ type, status, category, author_id, limit, offset });
    }
    
    res.json({
      success: true,
      data: content,
      count: content.length
    });
  } catch (error) {
    console.error('Error fetching content:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch content',
      error: error.message
    });
  }
});

// Get published content for public display
router.get('/published', async (req, res) => {
  try {
    const { type, category, limit, offset } = req.query;
    const content = await contentModel.getPublished({ type, category, limit, offset });
    
    res.json({
      success: true,
      data: content,
      count: content.length
    });
  } catch (error) {
    console.error('Error fetching published content:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch published content',
      error: error.message
    });
  }
});

// Get content by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const content = await contentModel.getById(id);
    
    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }
    
    res.json({
      success: true,
      data: content
    });
  } catch (error) {
    console.error('Error fetching content by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch content',
      error: error.message
    });
  }
});

// Get content by slug (for public URLs)
router.get('/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const content = await contentModel.getBySlug(slug);
    
    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }
    
    // Increment view count for published content
    if (content.status === 'published') {
      await contentModel.incrementViews(content.content_id);
    }
    
    res.json({
      success: true,
      data: content
    });
  } catch (error) {
    console.error('Error fetching content by slug:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch content',
      error: error.message
    });
  }
});

// Create new content - temporarily without auth for testing
router.post('/', async (req, res) => {
  try {
    const contentData = {
      ...req.body,
      author_id: req.body.author_id || 'admin-001',
      author_name: req.body.author_name || 'Admin User'
    };
    
    const content = await contentModel.create(contentData);
    
    res.status(201).json({
      success: true,
      data: content,
      message: 'Content created successfully'
    });
  } catch (error) {
    console.error('Error creating content:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create content',
      error: error.message
    });
  }
});

// Update content - temporarily without auth for testing
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const content = await contentModel.update(id, updateData);
    
    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }
    
    res.json({
      success: true,
      data: content,
      message: 'Content updated successfully'
    });
  } catch (error) {
    console.error('Error updating content:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update content',
      error: error.message
    });
  }
});

// Delete content - temporarily without auth for testing
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const content = await contentModel.delete(id);
    
    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Content deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting content:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete content',
      error: error.message
    });
  }
});

// Get content statistics - temporarily without auth for testing
router.get('/stats/overview', async (req, res) => {
  try {
    const allContent = await contentModel.getAll();
    const publishedContent = allContent.filter(c => c.status === 'published');
    const draftContent = allContent.filter(c => c.status === 'draft');
    const totalViews = allContent.reduce((sum, c) => sum + (c.views || 0), 0);
    
    const stats = {
      total: allContent.length,
      published: publishedContent.length,
      draft: draftContent.length,
      archived: allContent.filter(c => c.status === 'archived').length,
      totalViews
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching content stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch content statistics',
      error: error.message
    });
  }
});

module.exports = router;
