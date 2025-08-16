const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const router = express.Router();

// Kullanıcı kaydı
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role, görev_tanımı } = req.body;

    // Gerekli alanları kontrol et
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı adı, e-posta ve şifre gereklidir'
      });
    }

    // Email kontrolü
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu e-posta adresi veya kullanıcı adı zaten kullanılıyor'
      });
    }

    // Şifre hash'leme yok - direkt kaydet
    const plainPassword = password;

    // Yeni kullanıcı oluştur
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash, role, görev_tanımı, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING id, username, email, role, görev_tanımı, is_active, created_at',
      [username, email, plainPassword, role || 0, görev_tanımı || 'Belirtilmemiş', true]
    );

    const newUser = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'Kullanıcı başarıyla oluşturuldu',
      data: newUser
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı oluşturulurken hata oluştu',
      error: error.message
    });
  }
});

// Kullanıcı girişi
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Gerekli alanları kontrol et
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı adı ve şifre gereklidir'
      });
    }

    // Kullanıcıyı bul (username veya email ile)
    const result = await pool.query(
      'SELECT id, username, email, password_hash, role, görev_tanımı, is_active FROM users WHERE (username = $1 OR email = $1) AND is_active = true',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Geçersiz kullanıcı adı veya şifre'
      });
    }

    const user = result.rows[0];

    // Şifre kontrolü - direkt string karşılaştırması
    const isValidPassword = (password === user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Geçersiz kullanıcı adı veya şifre'
      });
    }

    // JWT token oluştur
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // HttpOnly cookie olarak token ayarla
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 saat
      path: '/'
    });

    // Şifreyi response'dan çıkar
    const { password_hash: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Giriş başarılı',
      user: userWithoutPassword,
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Giriş yapılırken hata oluştu',
      error: error.message
    });
  }
});

// Kullanıcı profilini getir
router.get('/profile', async (req, res) => {
  try {
    // Önce HttpOnly cookie'den al, yoksa Authorization header'dan al
    const cookieToken = req.cookies?.token;
    const authHeader = req.headers.authorization;
    const headerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const token = cookieToken || headerToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token gerekli'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      
      const result = await pool.query(
        'SELECT id, username, email, role, görev_tanımı, is_active, created_at, updated_at FROM users WHERE id = $1',
        [decoded.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Kullanıcı bulunamadı'
        });
      }

      res.json({
        success: true,
        data: result.rows[0]
      });

    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Geçersiz token'
      });
    }

  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Profil getirilemedi',
      error: error.message
    });
  }
});

// Şifre değiştirme
router.put('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Token'dan user ID'yi al
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token gerekli'
      });
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      
      // Mevcut şifreyi kontrol et
      const result = await pool.query(
        'SELECT password FROM users WHERE id = $1',
        [decoded.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Kullanıcı bulunamadı'
        });
      }

      const isValidPassword = await bcrypt.compare(currentPassword, result.rows[0].password);

      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: 'Mevcut şifre yanlış'
        });
      }

      // Yeni şifreyi hash'le ve güncelle
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);
      
      await pool.query(
        'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
        [hashedNewPassword, decoded.id]
      );

      res.json({
        success: true,
        message: 'Şifre başarıyla değiştirildi'
      });

    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Geçersiz token'
      });
    }

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Şifre değiştirilemedi',
      error: error.message
    });
  }
});

// Çıkış yap
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({
    success: true,
    message: 'Başarıyla çıkış yapıldı'
  });
});

module.exports = router; 