const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Admin yetkisi kontrolü
const requireAdmin = (req, res, next) => {
  // Artık JWT middleware kullanıyoruz, bu fonksiyon gerekli değil
  next();
};

// Tüm activity logları getir (admin/superadmin için)
router.get('/', authenticateToken, authorizeRoles(1, 2), async (req, res) => {
  try {
    const { limit = 100, page = 1, action, username, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    let queryParams = [];
    let paramCount = 1;
    
    if (action) {
      whereClause += ` AND action ILIKE $${paramCount}`;
      queryParams.push(`%${action}%`);
      paramCount++;
    }
    
    if (username) {
      whereClause += ` AND username ILIKE $${paramCount}`;
      queryParams.push(`%${username}%`);
      paramCount++;
    }
    
    if (startDate) {
      whereClause += ` AND created_at >= $${paramCount}`;
      queryParams.push(startDate);
      paramCount++;
    }
    
    if (endDate) {
      whereClause += ` AND created_at <= $${paramCount}`;
      queryParams.push(endDate);
      paramCount++;
    }
    
    // Toplam sayıyı al
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM activity_logs ${whereClause}`,
      queryParams
    );
    
    // Logları getir
    const result = await pool.query(
      `SELECT * FROM activity_logs ${whereClause} ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...queryParams, limit, offset]
    );
    
    res.json({
      success: true,
      logs: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(countResult.rows[0].count / limit)
    });
    
  } catch (error) {
    console.error('Activity logları getirilemedi:', error);
    res.status(500).json({
      success: false,
      message: 'Activity logları getirilemedi',
      error: error.message
    });
  }
});

// Manuel log ekle (admin/superadmin için)
router.post('/', authenticateToken, authorizeRoles(1, 2), async (req, res) => {
  try {
    const { action, details, page_url } = req.body;
    
    if (!action) {
      return res.status(400).json({
        success: false,
        message: 'Action alanı gereklidir'
      });
    }
    
    const result = await pool.query(
      'INSERT INTO activity_logs (user_id, username, action, details, ip_address, user_agent, page_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [
        req.user.id,
        req.user.username,
        action,
        details || '',
        req.ip || req.connection.remoteAddress,
        req.get('User-Agent'),
        page_url || req.originalUrl
      ]
    );
    
    res.status(201).json({
      success: true,
      message: 'Activity log başarıyla eklendi',
      log: result.rows[0]
    });
    
  } catch (error) {
    console.error('Activity log eklenemedi:', error);
    res.status(500).json({
      success: false,
      message: 'Activity log eklenemedi',
      error: error.message
    });
  }
});

// Log istatistikleri (admin/superadmin için)
router.get('/stats', authenticateToken, authorizeRoles(1, 2), async (req, res) => {
  try {
    // Bugünkü log sayısı
    const todayResult = await pool.query(
      'SELECT COUNT(*) FROM activity_logs WHERE DATE(created_at) = CURRENT_DATE'
    );
    
    // Son 24 saatteki log sayısı
    const last24hResult = await pool.query(
      'SELECT COUNT(*) FROM activity_logs WHERE created_at >= NOW() - INTERVAL \'24 hours\''
    );
    
    // En aktif kullanıcılar
    const topUsersResult = await pool.query(
      'SELECT username, COUNT(*) as activity_count FROM activity_logs GROUP BY username ORDER BY activity_count DESC LIMIT 5'
    );
    
    // En çok yapılan işlemler
    const topActionsResult = await pool.query(
      'SELECT action, COUNT(*) as count FROM activity_logs GROUP BY action ORDER BY count DESC LIMIT 5'
    );
    
    res.json({
      success: true,
      stats: {
        today: parseInt(todayResult.rows[0].count),
        last24h: parseInt(last24hResult.rows[0].count),
        topUsers: topUsersResult.rows,
        topActions: topActionsResult.rows
      }
    });
    
  } catch (error) {
    console.error('İstatistikler getirilemedi:', error);
    res.status(500).json({
      success: false,
      message: 'İstatistikler getirilemedi',
      error: error.message
    });
  }
});

module.exports = router;
