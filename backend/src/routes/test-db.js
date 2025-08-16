const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Test database connection
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    res.json({
      success: true,
      message: 'Database connection successful',
      current_time: result.rows[0].current_time
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// Check if activity_logs table exists
router.get('/check-activity-logs', async (req, res) => {
  try {
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'activity_logs'
      );
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    
    if (tableExists) {
      // Get table structure
      const structure = await pool.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'activity_logs' 
        ORDER BY ordinal_position;
      `);
      
      // Get record count
      const count = await pool.query('SELECT COUNT(*) FROM activity_logs');
      
      res.json({
        success: true,
        table_exists: true,
        record_count: parseInt(count.rows[0].count),
        structure: structure.rows
      });
    } else {
      res.json({
        success: true,
        table_exists: false,
        message: 'activity_logs table does not exist'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking activity_logs table',
      error: error.message
    });
  }
});

// Create activity_logs table if it doesn't exist
router.post('/create-activity-logs', async (req, res) => {
  try {
    const createTable = await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        username VARCHAR(255) NOT NULL,
        action VARCHAR(100) NOT NULL,
        details TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        page_url TEXT,
        http_method VARCHAR(10),
        request_path VARCHAR(255),
        additional_info TEXT,
        response_info TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    res.json({
      success: true,
      message: 'activity_logs table created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating activity_logs table',
      error: error.message
    });
  }
});

module.exports = router;
