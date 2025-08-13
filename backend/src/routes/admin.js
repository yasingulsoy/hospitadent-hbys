const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

// Database connections listele
router.get('/database-connections', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, type, host, port, database_name, username, is_active, created_at FROM database_connections ORDER BY id');
    res.json({ 
      success: true, 
      count: result.rows.length,
      connections: result.rows
    });
  } catch (error) {
    console.error('Database connections listesi hatası:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Database connections listelenirken hata oluştu',
      error: error.message 
    });
  }
});

// Database connection ekle
router.post('/database-connections', async (req, res) => {
  try {
    const { name, type, host, port, database_name, username, password } = req.body;
    
    // Şifreyi hash'le
    const passwordHash = await bcrypt.hash(password, 12);
    
    const result = await pool.query(
      'INSERT INTO database_connections (name, type, host, port, database_name, username, password_hash) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, type, host, port, database_name, username, is_active, created_at',
      [name, type, host, port, database_name, username, passwordHash]
    );
    
    res.status(201).json({
      success: true,
      message: 'Database connection başarıyla eklendi',
      connection: result.rows[0]
    });
    
  } catch (error) {
    console.error('Database connection ekleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection eklenirken hata oluştu',
      error: error.message
    });
  }
});

// Database connection güncelle
router.put('/database-connections/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, host, port, database_name, username, password, is_active } = req.body;
    
    let query, params;
    
    if (password) {
      // Şifre değişiyorsa hash'le
      const passwordHash = await bcrypt.hash(password, 12);
      query = 'UPDATE database_connections SET name = $1, type = $2, host = $3, port = $4, database_name = $5, username = $6, password_hash = $7, is_active = $8, updated_at = CURRENT_TIMESTAMP WHERE id = $9 RETURNING id, name, type, host, port, database_name, username, is_active, created_at';
      params = [name, type, host, port, database_name, username, passwordHash, is_active, id];
    } else {
      // Şifre değişmiyorsa
      query = 'UPDATE database_connections SET name = $1, type = $2, host = $3, port = $4, database_name = $5, username = $6, is_active = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8 RETURNING id, name, type, host, port, database_name, username, is_active, created_at';
      params = [name, type, host, port, database_name, username, is_active, id];
    }
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Database connection bulunamadı'
      });
    }
    
    res.json({
      success: true,
      message: 'Database connection başarıyla güncellendi',
      connection: result.rows[0]
    });
    
  } catch (error) {
    console.error('Database connection güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection güncellenirken hata oluştu',
      error: error.message
    });
  }
});

// Database connection sil
router.delete('/database-connections/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM database_connections WHERE id = $1 RETURNING id, name',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Database connection bulunamadı'
      });
    }
    
    res.json({
      success: true,
      message: 'Database connection başarıyla silindi',
      connection: result.rows[0]
    });
    
  } catch (error) {
    console.error('Database connection silme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection silinirken hata oluştu',
      error: error.message
    });
  }
});

// Database connection test et
router.post('/database-connections/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Connection bilgilerini al
    const connectionResult = await pool.query(
      'SELECT * FROM database_connections WHERE id = $1',
      [id]
    );
    
    if (connectionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Database connection bulunamadı'
      });
    }
    
    const connection = connectionResult.rows[0];
    
    // Şifreyi doğrula
    const isValidPassword = await bcrypt.compare(req.body.password, connection.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Geçersiz şifre'
      });
    }
    
    // Gerçek MariaDB bağlantı testi
    try {
      const mariadbConnection = await mysql.createConnection({
        host: connection.host,
        port: parseInt(connection.port),
        user: connection.username,
        password: req.body.password,
        database: connection.database_name
      });
      
      // Test sorgusu çalıştır
      const [rows] = await mariadbConnection.execute('SELECT 1 as test');
      
      // Bağlantıyı kapat
      await mariadbConnection.end();
      
      res.json({
        success: true,
        message: 'MariaDB bağlantısı başarılı! Test sorgusu çalıştı.',
        connection: {
          id: connection.id,
          name: connection.name,
          type: connection.type,
          host: connection.host,
          port: connection.port,
          database_name: connection.database_name,
          username: connection.username
        },
        testResult: rows[0]
      });
      
    } catch (dbError) {
      res.status(500).json({
        success: false,
        message: 'MariaDB bağlantısı başarısız',
        error: dbError.message
      });
    }
    
  } catch (error) {
    console.error('Database connection test hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection test edilirken hata oluştu',
      error: error.message
    });
  }
});

// MariaDB'den veri çek
router.post('/database-connections/:id/query', async (req, res) => {
  try {
    const { id } = req.params;
    const { password, query } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'SQL sorgusu gerekli'
      });
    }
    
    // Connection bilgilerini al
    const connectionResult = await pool.query(
      'SELECT * FROM database_connections WHERE id = $1',
      [id]
    );
    
    if (connectionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Database connection bulunamadı'
      });
    }
    
    const connection = connectionResult.rows[0];
    
    // Şifreyi doğrula
    const isValidPassword = await bcrypt.compare(password, connection.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Geçersiz şifre'
      });
    }
    
    // MariaDB'ye bağlan ve sorgu çalıştır
    try {
      const mariadbConnection = await mysql.createConnection({
        host: connection.host,
        port: parseInt(connection.port),
        user: connection.username,
        password: password,
        database: connection.database_name
      });
      
      // Sorguyu çalıştır
      const [rows] = await mariadbConnection.execute(query);
      
      // Bağlantıyı kapat
      await mariadbConnection.end();
      
      res.json({
        success: true,
        message: 'Sorgu başarıyla çalıştırıldı',
        query: query,
        results: rows,
        rowCount: rows.length
      });
      
    } catch (dbError) {
      res.status(500).json({
        success: false,
        message: 'Sorgu çalıştırılamadı',
        error: dbError.message
      });
    }
    
  } catch (error) {
    console.error('Sorgu çalıştırma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sorgu çalıştırılırken hata oluştu',
      error: error.message
    });
  }
});

module.exports = router;
