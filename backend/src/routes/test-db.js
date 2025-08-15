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

// Tablo yapısını kontrol et
router.get('/table-structure', async (req, res) => {
  try {
    const { table } = req.query;
    if (!table) {
      return res.status(400).json({
        success: false,
        message: 'Tablo adı gerekli'
      });
    }
    
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = $1 
      ORDER BY ordinal_position
    `, [table]);
    
    res.json({ 
      success: true, 
      table: table,
      columns: result.rows
    });
  } catch (error) {
    console.error('Tablo yapısı hatası:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Tablo yapısı alınırken hata oluştu',
      error: error.message 
    });
  }
});

// Admin şifresini güncelle
router.post('/update-admin-password', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const { username } = req.body;
    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    const result = await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE username = $2 RETURNING id, username, email, role',
      [hashedPassword, username]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }
    
    res.json({
      success: true,
      message: 'Kullanıcı şifresi güncellendi',
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

// Database connections tablosunu oluştur
router.post('/create-database-connections-table', async (req, res) => {
  try {
    const result = await pool.query(`
      CREATE TABLE IF NOT EXISTS database_connections (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(20) NOT NULL,
        host VARCHAR(255) NOT NULL,
        port VARCHAR(10) NOT NULL,
        database_name VARCHAR(100) NOT NULL,
        username VARCHAR(100) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    res.json({
      success: true,
      message: 'Database connections tablosu oluşturuldu',
      result: result
    });
    
  } catch (error) {
    console.error('Tablo oluşturma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Tablo oluşturulurken hata oluştu',
      error: error.message
    });
  }
});

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

// Şube kartları için gerekli tabloları oluştur
router.post('/create-branch-cards-tables', async (req, res) => {
  try {
    // Şube kartları tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS branch_cards (
        id SERIAL PRIMARY KEY,
        branch_id INTEGER REFERENCES branches(id),
        title VARCHAR(100) NOT NULL,
        subtitle VARCHAR(200),
        icon VARCHAR(50),
        color VARCHAR(20) DEFAULT 'blue',
        order_index INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Şube kartı veri sorguları tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS branch_card_queries (
        id SERIAL PRIMARY KEY,
        card_id INTEGER REFERENCES branch_cards(id) ON DELETE CASCADE,
        query_name VARCHAR(100) NOT NULL,
        sql_query TEXT NOT NULL,
        data_type VARCHAR(20) DEFAULT 'number', -- 'number', 'text', 'currency', 'percentage'
        format_string VARCHAR(100), -- '₺{value}', '{value}%', etc.
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Örnek şube kartları ekle
    await pool.query(`
      INSERT INTO branch_cards (branch_id, title, subtitle, icon, color, order_index) VALUES
      (1, 'Hasta Sayısı', 'Toplam aktif hasta', 'users', 'blue', 1),
      (1, 'Günlük Tahakkuk', 'Bugün tahakkuk edilen tutar', 'trending-up', 'green', 2),
      (1, 'Günlük Tahsilat', 'Bugün tahsil edilen tutar', 'dollar-sign', 'purple', 3),
      (1, 'Randevu Sayısı', 'Bugünkü randevular', 'calendar', 'orange', 4)
      ON CONFLICT DO NOTHING
    `);

    // Örnek sorgular ekle
    await pool.query(`
      INSERT INTO branch_card_queries (card_id, query_name, sql_query, data_type, format_string) VALUES
      (1, 'total_patients', 'SELECT COUNT(*) as value FROM patients WHERE branch_id = $1 AND is_active = true', 'number', '{value}'),
      (2, 'daily_accrual', 'SELECT COALESCE(SUM(amount), 0) as value FROM invoices WHERE branch_id = $1 AND DATE(created_at) = CURRENT_DATE', 'currency', '₺{value}'),
      (3, 'daily_collection', 'SELECT COALESCE(SUM(paid_amount), 0) as value FROM invoices WHERE branch_id = $1 AND DATE(paid_at) = CURRENT_DATE', 'currency', '₺{value}'),
      (4, 'daily_appointments', 'SELECT COUNT(*) as value FROM appointments WHERE branch_id = $1 AND DATE(appointment_date) = CURRENT_DATE', 'number', '{value}')
      ON CONFLICT DO NOTHING
    `);

    res.json({
      success: true,
      message: 'Şube kartları tabloları başarıyla oluşturuldu',
      tables: ['branch_cards', 'branch_card_queries']
    });

  } catch (error) {
    console.error('Şube kartları tabloları oluşturma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Şube kartları tabloları oluşturulurken hata oluştu',
      error: error.message
    });
  }
});

// Şube kartlarını listele
router.get('/branch-cards', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        bc.id,
        bc.branch_id,
        bc.card_title,
        bc.card_subtitle,
        bc.card_icon,
        bc.sql_query,
        bc.data_type,
        bc.format_string,
        bc.order_index,
        bc.is_active,
        bc.created_at,
        bc.updated_at,
        b.name as branch_name
      FROM branch_cards bc
      LEFT JOIN branches b ON bc.branch_id = b.id
      WHERE bc.is_active = true
      ORDER BY bc.order_index
    `);

    res.json({
      success: true,
      cards: result.rows
    });

  } catch (error) {
    console.error('Şube kartları listesi hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Şube kartları listelenirken hata oluştu',
      error: error.message
    });
  }
});

// Şube kartı ekle/güncelle
router.post('/branch-cards', async (req, res) => {
  try {
    const { branch_id, title, subtitle, icon, color, order_index, queries } = req.body;

    // Şube kartını ekle
    const cardResult = await pool.query(`
      INSERT INTO branch_cards (branch_id, card_title, card_subtitle, card_icon, color, order_index, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING id
    `, [branch_id, title, subtitle, icon, color, order_index]);

    const cardId = cardResult.rows[0].id;

    // Sorguları ekle (opsiyonel)
    if (queries && queries.length > 0) {
      for (const query of queries) {
        await pool.query(`
          INSERT INTO branch_card_queries (card_id, query_name, sql_query, data_type, format_string)
          VALUES ($1, $2, $3, $4, $5)
        `, [cardId, query.query_name, query.sql_query, query.data_type, query.format_string]);
      }
    }

    res.json({
      success: true,
      message: 'Şube kartı başarıyla eklendi',
      card_id: cardId
    });

  } catch (error) {
    console.error('Şube kartı ekleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Şube kartı eklenirken hata oluştu',
      error: error.message
    });
  }
});

// Şube kartı güncelle
router.put('/branch-cards/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { branch_id, title, subtitle, icon, color, order_index, queries } = req.body;

    // Şube kartını güncelle
    await pool.query(`
      UPDATE branch_cards 
      SET branch_id = $1, card_title = $2, card_subtitle = $3, card_icon = $4, color = $5, order_index = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
    `, [branch_id, title, subtitle, icon, color, order_index, id]);

    // Eski sorguları sil
    await pool.query('DELETE FROM branch_card_queries WHERE card_id = $1', [id]);

    // Yeni sorguları ekle
    if (queries && queries.length > 0) {
      for (const query of queries) {
        await pool.query(`
          INSERT INTO branch_card_queries (card_id, query_name, sql_query, data_type, format_string)
          VALUES ($1, $2, $3, $4, $5)
        `, [id, query.query_name, query.sql_query, query.data_type, query.format_string]);
      }
    }

    res.json({
      success: true,
      message: 'Şube kartı başarıyla güncellendi'
    });

  } catch (error) {
    console.error('Şube kartı güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Şube kartı güncellenirken hata oluştu',
      error: error.message
    });
  }
});

// Şube kartı sil
router.delete('/branch-cards/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Şube kartını sil (cascade ile sorgular da silinecek)
    await pool.query('DELETE FROM branch_cards WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Şube kartı başarıyla silindi'
    });

  } catch (error) {
    console.error('Şube kartı silme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Şube kartı silinirken hata oluştu',
      error: error.message
    });
  }
});

// Şube kartı verilerini çek (anasaayfa için)
router.post('/branch-cards/data', async (req, res) => {
  try {
    const { branch_id } = req.body;

    // Şube kartlarını ve sorgularını al
    const cardsResult = await pool.query(`
      SELECT 
        bc.*,
        array_agg(
          json_build_object(
            'id', bcq.id,
            'query_name', bcq.query_name,
            'sql_query', bcq.sql_query,
            'data_type', bcq.data_type,
            'format_string', bcq.format_string
          )
        ) as queries
      FROM branch_cards bc
      LEFT JOIN branch_card_queries bcq ON bc.id = bcq.card_id
      WHERE bc.branch_id = $1 AND bc.is_active = true
      GROUP BY bc.id
      ORDER BY bc.order_index
    `);

    const cards = [];

    // Her kart için verileri çek
    for (const card of cardsResult.rows) {
      const cardData = {
        id: card.id,
        title: card.title,
        subtitle: card.subtitle,
        icon: card.icon,
        color: card.color,
        data: {}
      };

      // Her sorgu için veri çek
      if (card.queries && card.queries.length > 0) {
        for (const query of card.queries) {
          try {
            const dataResult = await pool.query(query.sql_query, [branch_id]);
            const value = dataResult.rows[0]?.value || 0;
            
            // Format string'i uygula
            let formattedValue = query.format_string || '{value}';
            formattedValue = formattedValue.replace('{value}', value);
            
            cardData.data[query.query_name] = {
              raw_value: value,
              formatted_value: formattedValue,
              data_type: query.data_type
            };
          } catch (queryError) {
            console.error(`Sorgu hatası (${query.query_name}):`, queryError);
            cardData.data[query.query_name] = {
              raw_value: 0,
              formatted_value: 'Hata',
              data_type: query.data_type,
              error: true
            };
          }
        }
      }

      cards.push(cardData);
    }

    res.json({
      success: true,
      cards: cards
    });

  } catch (error) {
    console.error('Şube kartı verileri çekme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Şube kartı verileri çekilirken hata oluştu',
      error: error.message
    });
  }
});

// Activity logs tablosunu kontrol et
router.get('/check-activity-logs', async (req, res) => {
  try {
    // Tablo var mı kontrol et
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'activity_logs'
      )
    `);
    
    if (!tableExists.rows[0].exists) {
      return res.json({
        success: false,
        message: 'activity_logs tablosu bulunamadı',
        tableExists: false
      });
    }
    
    // Tablo yapısını kontrol et
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'activity_logs' 
      ORDER BY ordinal_position
    `);
    
    // Kayıt sayısını kontrol et
    const count = await pool.query('SELECT COUNT(*) FROM activity_logs');
    
    // Son 5 kaydı getir
    const recentLogs = await pool.query(`
      SELECT * FROM activity_logs 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    res.json({
      success: true,
      message: 'activity_logs tablosu mevcut',
      tableExists: true,
      columns: columns.rows,
      totalRecords: parseInt(count.rows[0].count),
      recentLogs: recentLogs.rows
    });
    
  } catch (error) {
    console.error('Activity logs kontrol hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Activity logs kontrol edilirken hata oluştu',
      error: error.message
    });
  }
});

// Activity logs tablosunu oluştur
router.post('/create-activity-logs-table', async (req, res) => {
  try {
    const result = await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        username VARCHAR(100) NOT NULL,
        action VARCHAR(100) NOT NULL,
        details TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        page_url TEXT,
        http_method VARCHAR(10),
        request_path TEXT,
        additional_info JSONB,
        response_info JSONB,
        session_duration BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // İndeksler ekle
    await pool.query('CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at)');
    
    res.json({
      success: true,
      message: 'Activity logs tablosu başarıyla oluşturuldu',
      result: result
    });
    
  } catch (error) {
    console.error('Activity logs tablosu oluşturma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Activity logs tablosu oluşturulurken hata oluştu',
      error: error.message
    });
  }
});

module.exports = router;
