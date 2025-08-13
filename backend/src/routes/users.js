const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/database');

// Tüm kullanıcıları getir
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, role, görev_tanımı, is_active, created_at, updated_at FROM users ORDER BY id'
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Kullanıcılar getirilemedi:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcılar getirilemedi',
      error: error.message
    });
  }
});

// ID'ye göre kullanıcı getir
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, username, email, role, görev_tanımı, is_active, created_at, updated_at FROM users WHERE id = $1',
      [id]
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
  } catch (error) {
    console.error('Kullanıcı getirilemedi:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı getirilemedi',
      error: error.message
    });
  }
});

// Kullanıcı güncelle
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, password, role, görev_tanımı, is_active } = req.body;
    
    // Kullanıcının var olup olmadığını kontrol et
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }
    
    let updateQuery = 'UPDATE users SET username = $1, email = $2, role = $3, görev_tanımı = $4, is_active = $5, updated_at = NOW()';
    let queryParams = [username, email, role, görev_tanımı || 'Belirtilmemiş', is_active];
    
    // Şifre değiştirilecekse
    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery += ', password = $6, updated_at = NOW()';
      queryParams.push(hashedPassword);
    }
    
    updateQuery += ' WHERE id = $' + (queryParams.length + 1);
    queryParams.push(id);
    
    await pool.query(updateQuery, queryParams);
    
    res.json({
      success: true,
      message: 'Kullanıcı başarıyla güncellendi'
    });
  } catch (error) {
    console.error('Kullanıcı güncellenemedi:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı güncellenemedi',
      error: error.message
    });
  }
});

// Kullanıcı sil
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Kullanıcının var olup olmadığını kontrol et
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }
    
    // Kendini silmeye çalışıyorsa engelle
    if (parseInt(id) === req.user?.id) {
      return res.status(400).json({
        success: false,
        message: 'Kendi hesabınızı silemezsiniz'
      });
    }
    
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    
    res.json({
      success: true,
      message: 'Kullanıcı başarıyla silindi'
    });
  } catch (error) {
    console.error('Kullanıcı silinemedi:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı silinemedi',
      error: error.message
    });
  }
});

module.exports = router;
