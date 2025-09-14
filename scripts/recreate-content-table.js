const { Pool } = require('pg');

async function recreateContentTable() {
  // Use a simple connection string for local development
  const pool = new Pool({
    connectionString: 'postgresql://postgres:password@localhost:5432/mycars',
    ssl: false
  });

  try {
    console.log('Recreating content table...');
    
    // Drop the existing content table
    await pool.query('DROP TABLE IF EXISTS content CASCADE');
    
    // Recreate the content table without foreign key constraint
    await pool.query(`
      CREATE TABLE content (
        id SERIAL PRIMARY KEY,
        content_id VARCHAR(50) UNIQUE NOT NULL,
        title VARCHAR(200) NOT NULL,
        slug VARCHAR(200) UNIQUE NOT NULL,
        type VARCHAR(20) NOT NULL DEFAULT 'blog_post',
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        content_html TEXT NOT NULL,
        excerpt TEXT,
        author_id VARCHAR(50) NOT NULL,
        author_name VARCHAR(100) NOT NULL,
        category VARCHAR(50),
        tags TEXT[],
        featured_image JSONB,
        meta_title VARCHAR(200),
        meta_description TEXT,
        views INTEGER DEFAULT 0,
        published_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_content_type ON content(type)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_content_status ON content(status)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_content_author_id ON content(author_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_content_slug ON content(slug)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_content_published_at ON content(published_at)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_content_category ON content(category)');
    
    console.log('Content table recreated successfully without foreign key constraint');
    
  } catch (error) {
    console.error('Error recreating content table:', error);
  } finally {
    await pool.end();
  }
}

recreateContentTable();
