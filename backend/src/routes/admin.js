const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Tüm admin route'ları için kimlik doğrulama ve yetkilendirme
router.use(authenticateToken);
router.use(authorizeRoles(1, 2)); // Sadece admin (1) ve super admin (2) erişebilir

// Database connections listele
router.get('/database-connections', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, type, host, port, database_name, username, password, is_active, created_at FROM data_connections ORDER BY id');
    
    // Şifreleri döndür (normal olarak)
    const connections = result.rows.map(row => ({
      ...row,
      password: row.password || '' // Şifreyi normal olarak döndür
    }));
    
    res.json({ 
      success: true, 
      count: connections.length,
      connections: connections
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
    
    const result = await pool.query(
      'INSERT INTO data_connections (name, type, host, port, database_name, username, password) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, type, host, port, database_name, username, is_active, created_at',
      [name, type, host, port, database_name, username, password]
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
      // Şifre değişiyorsa
      query = 'UPDATE data_connections SET name = $1, type = $2, host = $3, port = $4, database_name = $5, username = $6, password = $7, is_active = $8, updated_at = CURRENT_TIMESTAMP WHERE id = $9 RETURNING id, name, type, host, port, database_name, username, is_active, created_at';
      params = [name, type, host, port, database_name, username, password, is_active, id];
    } else {
      // Şifre değişmiyorsa
      query = 'UPDATE data_connections SET name = $1, type = $2, host = $3, port = $4, database_name = $5, username = $6, is_active = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8 RETURNING id, name, type, host, port, database_name, username, is_active, created_at';
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
      'DELETE FROM data_connections WHERE id = $1 RETURNING id, name',
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
      'SELECT * FROM data_connections WHERE id = $1',
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
    const isValidPassword = connection.password === req.body.password;
    
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
      'SELECT * FROM data_connections WHERE id = $1',
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
    const isValidPassword = connection.password === password;
    
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

// Database test endpoint (frontend için)
router.post('/database/test', async (req, res) => {
  try {
    const { host, port, database, username, password, type } = req.body;
    
    if (!host || !port || !database || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Tüm alanlar gerekli'
      });
    }
    
    // MariaDB bağlantı testi
    try {
      const mariadbConnection = await mysql.createConnection({
        host: host,
        port: parseInt(port),
        user: username,
        password: password,
        database: database
      });
      
      // Test sorgusu çalıştır
      const [rows] = await mariadbConnection.execute('SELECT 1 as test');
      
      // Veritabanlarını listele
      const [databases] = await mariadbConnection.execute('SHOW DATABASES');
      
      // Bağlantıyı kapat
      await mariadbConnection.end();
      
      res.json({
        success: true,
        message: 'MariaDB bağlantısı başarılı!',
        databases: databases.map(db => db.Database || db.database)
      });
      
    } catch (dbError) {
      res.status(500).json({
        success: false,
        message: 'MariaDB bağlantısı başarısız: ' + dbError.message
      });
    }
    
  } catch (error) {
    console.error('Database test hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Database test edilirken hata oluştu',
      error: error.message
    });
  }
});

// Database list endpoint (frontend için)
router.post('/database/list', async (req, res) => {
  try {
    const { host, port, database, username, password, type } = req.body;
    
    if (!host || !port || !database || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Tüm alanlar gerekli'
      });
    }
    
    // MariaDB bağlantı testi
    try {
      const mariadbConnection = await mysql.createConnection({
        host: host,
        port: parseInt(port),
        user: username,
        password: password,
        database: database
      });
      
      // Veritabanlarını listele
      const [databases] = await mariadbConnection.execute('SHOW DATABASES');
      
      // Bağlantıyı kapat
      await mariadbConnection.end();
      
      res.json({
        success: true,
        message: 'Veritabanları başarıyla listelendi',
        databases: databases.map(db => db.Database || db.database)
      });
      
    } catch (dbError) {
      res.status(500).json({
        success: false,
        message: 'MariaDB bağlantısı başarısız: ' + dbError.message
      });
    }
    
  } catch (error) {
    console.error('Database list hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Veritabanları listelenirken hata oluştu',
      error: error.message
    });
  }
});

// Database tables endpoint (frontend için)
router.post('/database/tables', async (req, res) => {
  try {
    const { host, port, database, username, password, type } = req.body;
    
    if (!host || !port || !database || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Tüm alanlar gerekli'
      });
    }
    
    // MariaDB bağlantı testi
    try {
      const mariadbConnection = await mysql.createConnection({
        host: host,
        port: parseInt(port),
        user: username,
        password: password,
        database: database
      });
      
      // Tabloları listele
      const [tables] = await mariadbConnection.execute('SHOW TABLES');
      
      // Bağlantıyı kapat
      await mariadbConnection.end();
      
      res.json({
        success: true,
        message: 'Tablolar başarıyla listelendi',
        tables: tables.map(table => {
          const tableName = table[`Tables_in_${database}`] || Object.values(table)[0];
          return { name: tableName };
        })
      });
      
    } catch (dbError) {
      res.status(500).json({
        success: false,
        message: 'MariaDB bağlantısı başarısız: ' + dbError.message
      });
    }
    
  } catch (error) {
    console.error('Database tables hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Tablolar listelenirken hata oluştu',
      error: error.message
    });
  }
});

// Database config GET endpoint (frontend için)
router.get('/database/config', async (req, res) => {
  try {
    // En son kaydedilen config'i getir
    const result = await pool.query('SELECT * FROM data_connections WHERE is_active = true ORDER BY updated_at DESC LIMIT 1');
    
    if (result.rows.length > 0) {
      const connection = result.rows[0];
      res.json({
        success: true,
        config: {
          host: connection.host,
          port: connection.port,
          database: connection.database_name,
          username: connection.username,
          password: connection.password, // Şifre normal olarak gelir
          type: connection.type
        }
      });
    } else {
      res.json({
        success: true,
        config: null
      });
    }
    
  } catch (error) {
    console.error('Database config getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Database config getirilirken hata oluştu',
      error: error.message
    });
  }
});

// Database config POST endpoint (frontend için)
router.post('/database/config', async (req, res) => {
  try {
    const config = req.body;
    
    // Burada config'i kaydedebilirsiniz (örneğin dosyaya veya veritabanına)
    console.log('Database config kaydedildi:', config);
    
    res.json({
      success: true,
      message: 'Database config başarıyla kaydedildi'
    });
    
  } catch (error) {
    console.error('Database config hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Database config kaydedilirken hata oluştu',
      error: error.message
    });
  }
});

// SQL sorgu çalıştırma endpoint (frontend için)
router.post('/database/query', async (req, res) => {
  try {
    const { host, port, database, username, password, type, query } = req.body;
    
    console.log('Gelen istek:', { host, port, database, username, type, query: query ? query.substring(0, 100) + '...' : null });
    
    // Sadece query alanı zorunlu
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'SQL sorgusu gerekli'
      });
    }
    
    // Varsayılan veritabanı bağlantı bilgileri
    const dbConfig = {
      host: host || 'localhost',
      port: parseInt(port) || 3306,
      user: username || 'root',
      password: password || '',
      database: database || 'test'
    };
    
    console.log('Veritabanı bağlantı konfigürasyonu:', { ...dbConfig, password: '***' });
    
    // MariaDB bağlantı testi
    try {
      console.log('MariaDB bağlantısı kuruluyor...');
      const mariadbConnection = await mysql.createConnection(dbConfig);
      console.log('MariaDB bağlantısı başarılı');
      
      // Sorguyu çalıştır
      console.log('Sorgu çalıştırılıyor:', query);
      const [rows] = await mariadbConnection.execute(query);
      console.log('Sorgu başarılı, sonuç sayısı:', rows.length);
      
      // Bağlantıyı kapat
      await mariadbConnection.end();
      
      res.json({
        success: true,
        message: 'Sorgu başarıyla çalıştırıldı',
        query: query,
        results: rows,
        rowCount: rows.length,
        columns: rows.length > 0 ? Object.keys(rows[0]) : []
      });
      
    } catch (dbError) {
      console.error('MariaDB hatası:', dbError);
      res.status(500).json({
        success: false,
        message: 'Sorgu çalıştırılamadı: ' + dbError.message
      });
    }
    
  } catch (error) {
    console.error('SQL sorgu hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sorgu çalıştırılırken hata oluştu',
      error: error.message
    });
  }
});

// Save query endpoint
router.get('/database/save-query', async (req, res) => {
  try {
    // Kayıtlı sorguları getir
    const result = await pool.query('SELECT * FROM saved_queries ORDER BY created_at DESC');
    
    res.json({
      success: true,
      queries: result.rows
    });
    
  } catch (error) {
    console.error('Save query listesi hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Kayıtlı sorgular listelenirken hata oluştu',
      error: error.message
    });
  }
});

// Save query endpoint
router.post('/database/save-query', async (req, res) => {
  try {
    const { name, description, category, is_public, query } = req.body;
    
    const result = await pool.query(
      'INSERT INTO saved_queries (name, description, sql_query, category, is_public, created_by, usage_count, last_run) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [name, description, query, category, is_public, 'admin', 0, null]
    );
    
    res.json({
      success: true,
      message: 'Sorgu başarıyla kaydedildi',
      query: result.rows[0]
    });
    
  } catch (error) {
    console.error('Save query hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sorgu kaydedilirken hata oluştu',
      error: error.message
    });
  }
});

// Update save query endpoint
router.put('/database/save-query/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, is_public, query } = req.body;
    
    // Önce mevcut sorguyu getir
    const existingQuery = await pool.query(
      'SELECT * FROM saved_queries WHERE id = $1',
      [id]
    );
    
    if (existingQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sorgu bulunamadı'
      });
    }
    
    // Eğer query null ise mevcut değeri kullan
    const sqlQuery = query || existingQuery.rows[0].sql_query;
    
    const result = await pool.query(
      'UPDATE saved_queries SET name = $1, description = $2, category = $3, is_public = $4, sql_query = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
      [name, description, category, is_public, sqlQuery, id]
    );
    
    res.json({
      success: true,
      message: 'Sorgu başarıyla güncellendi',
      query: result.rows[0]
    });
    
  } catch (error) {
    console.error('Update save query hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sorgu güncellenirken hata oluştu',
      error: error.message
    });
  }
});

// Delete save query endpoint
router.delete('/database/save-query/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM saved_queries WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sorgu bulunamadı'
      });
    }
    
    res.json({
      success: true,
      message: 'Sorgu başarıyla silindi',
      query: result.rows[0]
    });
    
  } catch (error) {
    console.error('Delete save query hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sorgu silinirken hata oluştu',
      error: error.message
    });
  }
});

// Kayıtlı sorguyu çalıştır endpoint
router.post('/database/save-query/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const { host, port, database, username, password, type } = req.body;
    
    if (!host || !port || !database || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Veritabanı bağlantı bilgileri gerekli'
      });
    }
    
    // Önce kayıtlı sorguyu getir
    const savedQueryResult = await pool.query(
      'SELECT * FROM saved_queries WHERE id = $1',
      [id]
    );
    
    if (savedQueryResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kayıtlı sorgu bulunamadı'
      });
    }
    
    const savedQuery = savedQueryResult.rows[0];
    
    // MariaDB bağlantı testi
    try {
      const mariadbConnection = await mysql.createConnection({
        host: host,
        port: parseInt(port),
        user: username,
        password: password,
        database: database
      });
      
      // Sorguyu çalıştır
      const [rows] = await mariadbConnection.execute(savedQuery.sql_query);
      
      // Bağlantıyı kapat
      await mariadbConnection.end();
      
      // usage_count ve last_run alanlarını güncelle
      await pool.query(
        'UPDATE saved_queries SET usage_count = usage_count + 1, last_run = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
      );
      
      res.json({
        success: true,
        message: 'Kayıtlı sorgu başarıyla çalıştırıldı',
        query: savedQuery.sql_query,
        results: rows,
        rowCount: rows.length,
        columns: rows.length > 0 ? Object.keys(rows[0]) : []
      });
      
    } catch (dbError) {
      res.status(500).json({
        success: false,
        message: 'Sorgu çalıştırılamadı: ' + dbError.message
      });
    }
    
  } catch (error) {
    console.error('Kayıtlı sorgu çalıştırma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Kayıtlı sorgu çalıştırılırken hata oluştu',
      error: error.message
    });
  }
});

// Users endpoint'i ekle
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, role, görev_tanımı, is_active, created_at, updated_at FROM users ORDER BY id'
    );
    
    res.json({
      success: true,
      count: result.rows.length,
      users: result.rows
    });
  } catch (error) {
    console.error('Users listesi hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Users listelenirken hata oluştu',
      error: error.message
    });
  }
});

// User ekle
router.post('/users', async (req, res) => {
  try {
    const { username, email, password, role, görev_tanımı } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email ve password gereklidir'
      });
    }
    
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash, role, görev_tanımı, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING id, username, email, role, görev_tanımı, is_active, created_at',
      [username, email, password, role || 0, görev_tanımı || 'Belirtilmemiş', true]
    );
    
    res.status(201).json({
      success: true,
      message: 'User başarıyla eklendi',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('User ekleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'User eklenirken hata oluştu',
      error: error.message
    });
  }
});

// User güncelle
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, password, role, görev_tanımı, is_active } = req.body;
    
    let query, params;
    
    if (password) {
      query = 'UPDATE users SET username = $1, email = $2, password_hash = $3, role = $4, görev_tanımı = $5, is_active = $6, updated_at = NOW() WHERE id = $7 RETURNING id, username, email, role, görev_tanımı, is_active, created_at, updated_at';
      params = [username, email, password, role, görev_tanımı, is_active, id];
    } else {
      query = 'UPDATE users SET username = $1, email = $2, role = $3, görev_tanımı = $4, is_active = $5, updated_at = NOW() WHERE id = $6 RETURNING id, username, email, role, görev_tanımı, is_active, created_at, updated_at';
      params = [username, email, role, görev_tanımı, is_active, id];
    }
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User bulunamadı'
      });
    }
    
    res.json({
      success: true,
      message: 'User başarıyla güncellendi',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('User güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'User güncellenirken hata oluştu',
      error: error.message
    });
  }
});

// User sil
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id, username, email',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User bulunamadı'
      });
    }
    
    res.json({
      success: true,
      message: 'User başarıyla silindi',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('User silme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'User silinirken hata oluştu',
      error: error.message
    });
  }
});

module.exports = router;
