const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Veritabanı bağlantı testi
router.get('/test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time, version() as db_version');
    res.json({ 
      success: true, 
      message: 'PostgreSQL bağlantısı başarılı!',
      timestamp: result.rows[0].current_time,
      version: result.rows[0].db_version
    });
  } catch (error) {
    console.error('Veritabanı test hatası:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Veritabanı bağlantı hatası',
      error: error.message 
    });
  }
});

// Şubeleri listele test
router.get('/branches', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM branches ORDER BY id');
    res.json({ 
      success: true, 
      count: result.rows.length,
      branches: result.rows
    });
  } catch (error) {
    console.error('Şubeler listesi hatası:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Şubeler listelenirken hata oluştu',
      error: error.message 
    });
  }
});

// Kullanıcıları listele test
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, email, role, is_active FROM users ORDER BY id');
    res.json({ 
      success: true, 
      count: result.rows.length,
      users: result.rows
    });
  } catch (error) {
    console.error('Kullanıcılar listesi hatası:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Kullanıcılar listelenirken hata oluştu',
      error: error.message 
    });
  }
});

// Kullanıcıları listele test (hash'ler dahil)
router.get('/users-with-hash', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, email, password_hash, role, is_active FROM users ORDER BY id');
    res.json({ 
      success: true, 
      count: result.rows.length,
      users: result.rows
    });
  } catch (error) {
    console.error('Kullanıcılar listesi hatası:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Kullanıcılar listelenirken hata oluştu',
      error: error.message 
    });
  }
});

// Admin şifresini güncelle
router.post('/update-admin-password', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    const result = await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE username = $2 RETURNING id, username, email, role',
      [hashedPassword, 'admin']
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Admin kullanıcısı bulunamadı'
      });
    }
    
    res.json({
      success: true,
      message: 'Admin şifresi güncellendi',
      newPassword: newPassword,
      user: result.rows[0]
    });
    
  } catch (error) {
    console.error('Şifre güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Şifre güncellenirken hata oluştu',
      error: error.message
    });
  }
});

// Tüm şifreleri admin123 yap (hash olmadan)
router.post('/set-all-passwords-admin123', async (req, res) => {
  try {
    // Direkt tüm şifreleri admin123 yap
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 RETURNING id, username, email, password_hash, role',
      ['admin123']
    );
    
    res.json({
      success: true,
      message: 'Tüm kullanıcıların şifresi admin123 olarak ayarlandı',
      updatedCount: result.rows.length,
      users: result.rows
    });
    
  } catch (error) {
    console.error('Şifre güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Şifreler güncellenirken hata oluştu',
      error: error.message
    });
  }
});

module.exports = router;
