const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// JWT token doğrulama middleware'i
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log('🔍 Auth Middleware:', {
      hasAuthHeader: !!authHeader,
      tokenLength: token ? token.length : 0,
      tokenStart: token ? token.substring(0, 20) + '...' : 'none'
    });

    if (!token) {
      console.log('❌ Token bulunamadı');
      return res.status(401).json({
        success: false,
        message: 'Erişim token\'ı gerekli'
      });
    }

    try {
      // JWT token'ı doğrula
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      console.log('✅ JWT decoded:', decoded);
      
      // Veritabanından kullanıcıyı al
      const result = await pool.query(
        'SELECT id, username, email, role, görev_tanımı, is_active, branch_id FROM users WHERE id = $1',
        [decoded.id]
      );

      if (result.rows.length === 0 || !result.rows[0].is_active) {
        console.log('❌ Kullanıcı bulunamadı veya aktif değil');
        return res.status(401).json({
          success: false,
          message: 'Geçersiz kullanıcı'
        });
      }

      // Kullanıcı bilgisini request'e ekle
      req.user = result.rows[0];
      console.log('✅ Kullanıcı doğrulandı:', req.user.username);
      
      next();
    } catch (jwtError) {
      console.error('❌ JWT doğrulama hatası:', jwtError.message);
      return res.status(403).json({
        success: false,
        message: 'Geçersiz token',
        error: jwtError.message
      });
    }

  } catch (error) {
    console.error('❌ Auth middleware hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Kimlik doğrulama hatası',
      error: error.message
    });
  }
};

// Rol bazlı yetkilendirme middleware'i
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimlik doğrulaması gerekli'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için yetkiniz bulunmuyor'
      });
    }

    next();
  };
};

// Şube bazlı yetkilendirme middleware'i
const authorizeBranch = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Kullanıcı kimlik doğrulaması gerekli'
    });
  }

  // Super admin (role 2) tüm şubelere erişebilir
  if (req.user.role === 2) {
    return next();
  }

  // Admin (role 1) tüm şubelere erişebilir
  if (req.user.role === 1) {
    return next();
  }

  // Normal kullanıcılar (role 0) sadece kendi şubelerine erişebilir
  const requestedBranchId = req.params.branchId || req.body.branch_id;
  if (req.user.branch_id && req.user.branch_id.toString() !== requestedBranchId?.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Bu şube için yetkiniz bulunmuyor'
    });
  }

  next();
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  authorizeBranch
}; 