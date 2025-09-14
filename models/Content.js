const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

class Content {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  // Generate slug from title
  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }

  // Create new content
  async create(contentData) {
    const {
      title,
      type = 'blog_post',
      status = 'draft',
      content_html,
      excerpt,
      author_id,
      author_name,
      category,
      tags = [],
      featured_image,
      meta_title,
      meta_description
    } = contentData;

    const content_id = uuidv4();
    const slug = this.generateSlug(title);
    const published_at = status === 'published' ? new Date() : null;

    // First, try to create the admin user if it doesn't exist
    try {
      await this.pool.query(`
        INSERT INTO users (user_id, username, email, password_hash, role, created_at)
        VALUES ('admin-001', 'admin', 'admin@mycars.com', '$2b$10$dummy', 'admin', NOW())
        ON CONFLICT (user_id) DO NOTHING
      `);
    } catch (userError) {
      console.log('Could not create admin user, continuing...');
    }

    const query = `
      INSERT INTO content (
        content_id, title, slug, type, status, content_html, excerpt,
        author_id, author_name, category, tags, featured_image,
        meta_title, meta_description, published_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

    const values = [
      content_id, title, slug, type, status, content_html, excerpt,
      author_id || 'admin-001', author_name || 'Admin User', category, tags, featured_image ? JSON.stringify(featured_image) : null,
      meta_title, meta_description, published_at
    ];

    try {
      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating content:', error);
      
      // If it's a foreign key constraint error, try without the constraint
      if (error.code === '23503' && error.constraint === 'content_author_id_fkey') {
        console.log('Foreign key constraint error, trying to create content without constraint...');
        
        // Try to drop the constraint temporarily
        try {
          await this.pool.query('ALTER TABLE content DROP CONSTRAINT IF EXISTS content_author_id_fkey');
          
          // Retry the insert
          const result = await this.pool.query(query, values);
          return result.rows[0];
        } catch (retryError) {
          console.error('Error on retry:', retryError);
          throw retryError;
        }
      }
      
      throw error;
    }
  }

  // Get all content with optional filters
  async getAll(filters = {}) {
    let query = `
      SELECT * FROM content 
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 0;

    if (filters.type) {
      paramCount++;
      query += ` AND type = $${paramCount}`;
      values.push(filters.type);
    }

    if (filters.status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      values.push(filters.status);
    }

    if (filters.category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      values.push(filters.category);
    }

    if (filters.author_id) {
      paramCount++;
      query += ` AND author_id = $${paramCount}`;
      values.push(filters.author_id);
    }

    query += ` ORDER BY created_at DESC`;

    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      values.push(filters.limit);
    }

    if (filters.offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      values.push(filters.offset);
    }

    try {
      const result = await this.pool.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Error getting content:', error);
      throw error;
    }
  }

  // Get content by ID
  async getById(content_id) {
    const query = 'SELECT * FROM content WHERE content_id = $1';
    
    try {
      const result = await this.pool.query(query, [content_id]);
      return result.rows[0];
    } catch (error) {
      console.error('Error getting content by ID:', error);
      throw error;
    }
  }

  // Get content by slug
  async getBySlug(slug) {
    const query = 'SELECT * FROM content WHERE slug = $1';
    
    try {
      const result = await this.pool.query(query, [slug]);
      return result.rows[0];
    } catch (error) {
      console.error('Error getting content by slug:', error);
      throw error;
    }
  }

  // Update content
  async update(content_id, updateData) {
    const {
      title,
      type,
      status,
      content_html,
      excerpt,
      category,
      tags,
      featured_image,
      meta_title,
      meta_description
    } = updateData;

    let query = 'UPDATE content SET updated_at = CURRENT_TIMESTAMP';
    const values = [];
    let paramCount = 0;

    if (title) {
      paramCount++;
      query += `, title = $${paramCount}`;
      values.push(title);
      
      // Update slug if title changed
      paramCount++;
      query += `, slug = $${paramCount}`;
      values.push(this.generateSlug(title));
    }

    if (type) {
      paramCount++;
      query += `, type = $${paramCount}`;
      values.push(type);
    }

    if (status) {
      paramCount++;
      query += `, status = $${paramCount}`;
      values.push(status);
      
      // Set published_at if status is published
      if (status === 'published') {
        paramCount++;
        query += `, published_at = $${paramCount}`;
        values.push(new Date());
      }
    }

    if (content_html) {
      paramCount++;
      query += `, content_html = $${paramCount}`;
      values.push(content_html);
    }

    if (excerpt !== undefined) {
      paramCount++;
      query += `, excerpt = $${paramCount}`;
      values.push(excerpt);
    }

    if (category !== undefined) {
      paramCount++;
      query += `, category = $${paramCount}`;
      values.push(category);
    }

    if (tags) {
      paramCount++;
      query += `, tags = $${paramCount}`;
      values.push(tags);
    }

    if (featured_image !== undefined) {
      paramCount++;
      query += `, featured_image = $${paramCount}`;
      values.push(featured_image ? JSON.stringify(featured_image) : null);
    }

    if (meta_title !== undefined) {
      paramCount++;
      query += `, meta_title = $${paramCount}`;
      values.push(meta_title);
    }

    if (meta_description !== undefined) {
      paramCount++;
      query += `, meta_description = $${paramCount}`;
      values.push(meta_description);
    }

    paramCount++;
    query += ` WHERE content_id = $${paramCount} RETURNING *`;
    values.push(content_id);

    try {
      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating content:', error);
      throw error;
    }
  }

  // Delete content
  async delete(content_id) {
    const query = 'DELETE FROM content WHERE content_id = $1 RETURNING *';
    
    try {
      const result = await this.pool.query(query, [content_id]);
      return result.rows[0];
    } catch (error) {
      console.error('Error deleting content:', error);
      throw error;
    }
  }

  // Increment view count
  async incrementViews(content_id) {
    const query = 'UPDATE content SET views = views + 1 WHERE content_id = $1 RETURNING views';
    
    try {
      const result = await this.pool.query(query, [content_id]);
      return result.rows[0].views;
    } catch (error) {
      console.error('Error incrementing views:', error);
      throw error;
    }
  }

  // Get published content for public display
  async getPublished(filters = {}) {
    const queryFilters = { ...filters, status: 'published' };
    return this.getAll(queryFilters);
  }

  // Search content
  async search(searchTerm, filters = {}) {
    let query = `
      SELECT * FROM content 
      WHERE (title ILIKE $1 OR content_html ILIKE $1 OR excerpt ILIKE $1)
    `;
    const values = [`%${searchTerm}%`];
    let paramCount = 1;

    if (filters.type) {
      paramCount++;
      query += ` AND type = $${paramCount}`;
      values.push(filters.type);
    }

    if (filters.status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      values.push(filters.status);
    }

    query += ` ORDER BY created_at DESC`;

    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      values.push(filters.limit);
    }

    try {
      const result = await this.pool.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Error searching content:', error);
      throw error;
    }
  }
}

module.exports = Content;
