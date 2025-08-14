const express = require('express');
const pool = require('../config/database');

const router = express.Router();

// Tüm şube kartlarını getir
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        bc.*,
        b.name as branch_name
      FROM branch_cards bc
      LEFT JOIN branches b ON bc.branch_id = b.id
      ORDER BY bc.branch_id, bc.order_index
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get branch cards error:', error);
    res.status(500).json({
      success: false,
      message: 'Şube kartları alınırken hata oluştu'
    });
  }
});

// Belirli bir şubenin kartlarını getir
router.get('/branch/:branchId', async (req, res) => {
  try {
    const { branchId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        bc.*,
        b.name as branch_name
      FROM branch_cards bc
      LEFT JOIN branches b ON bc.branch_id = b.id
      WHERE bc.branch_id = $1 AND bc.is_active = true
      ORDER BY bc.order_index
    `, [branchId]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get branch cards error:', error);
    res.status(500).json({
      success: false,
      message: 'Şube kartları alınırken hata oluştu'
    });
  }
});

// Tek şube kartı getir
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        bc.*,
        b.name as branch_name
      FROM branch_cards bc
      LEFT JOIN branches b ON bc.branch_id = b.id
      WHERE bc.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Şube kartı bulunamadı'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get branch card error:', error);
    res.status(500).json({
      success: false,
      message: 'Şube kartı alınırken hata oluştu'
    });
  }
});

// Yeni şube kartı oluştur
router.post('/', async (req, res) => {
  try {
    const {
      branch_id,
      card_title,
      card_subtitle,
      card_icon,
      sql_query,
      data_type,
      format_string,
      order_index,
      is_active = true
    } = req.body;

    // Şube kontrolü
    const branchResult = await pool.query('SELECT id FROM branches WHERE id = $1', [branch_id]);
    if (branchResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz şube ID'
      });
    }

    const result = await pool.query(`
      INSERT INTO branch_cards (
        branch_id, card_title, card_subtitle, card_icon, 
        sql_query, data_type, format_string, order_index, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [branch_id, card_title, card_subtitle, card_icon, sql_query, data_type, format_string, order_index, is_active]);

    res.status(201).json({
      success: true,
      message: 'Şube kartı başarıyla oluşturuldu',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create branch card error:', error);
    res.status(500).json({
      success: false,
      message: 'Şube kartı oluşturulurken hata oluştu'
    });
  }
});

// Şube kartı güncelle
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      branch_id,
      card_title,
      card_subtitle,
      card_icon,
      sql_query,
      data_type,
      format_string,
      order_index,
      is_active
    } = req.body;

    // Şube kartı kontrolü
    const existingResult = await pool.query('SELECT id FROM branch_cards WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Şube kartı bulunamadı'
      });
    }

    // Şube kontrolü
    if (branch_id) {
      const branchResult = await pool.query('SELECT id FROM branches WHERE id = $1', [branch_id]);
      if (branchResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Geçersiz şube ID'
        });
      }
    }

    const result = await pool.query(`
      UPDATE branch_cards 
      SET branch_id = COALESCE($1, branch_id),
          card_title = COALESCE($2, card_title),
          card_subtitle = COALESCE($3, card_subtitle),
          card_icon = COALESCE($4, card_icon),
          sql_query = COALESCE($5, sql_query),
          data_type = COALESCE($6, data_type),
          format_string = COALESCE($7, format_string),
          order_index = COALESCE($8, order_index),
          is_active = COALESCE($9, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `, [branch_id, card_title, card_subtitle, card_icon, sql_query, data_type, format_string, order_index, is_active, id]);

    res.json({
      success: true,
      message: 'Şube kartı başarıyla güncellendi',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update branch card error:', error);
    res.status(500).json({
      success: false,
      message: 'Şube kartı güncellenirken hata oluştu'
    });
  }
});

// Şube kartı sil
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existingResult = await pool.query('SELECT id FROM branch_cards WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Şube kartı bulunamadı'
      });
    }

    await pool.query('DELETE FROM branch_cards WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Şube kartı başarıyla silindi'
    });
  } catch (error) {
    console.error('Delete branch card error:', error);
    res.status(500).json({
      success: false,
      message: 'Şube kartı silinirken hata oluştu'
    });
  }
});

// SQL sorgusu test et
router.post('/test-query', async (req, res) => {
  try {
    const { sql_query, branch_id } = req.body;

    if (!sql_query || !sql_query.trim()) {
      return res.status(400).json({
        success: false,
        message: 'SQL sorgusu gerekli'
      });
    }

    // SQL injection koruması için basit kontroller
    const lowerQuery = sql_query.toLowerCase();
    if (lowerQuery.includes('drop') || lowerQuery.includes('delete') || lowerQuery.includes('truncate')) {
      return res.status(400).json({
        success: false,
        message: 'Bu tür SQL komutlarına izin verilmiyor'
      });
    }

    // Sorguyu test et
    const result = await pool.query(sql_query, [branch_id]);

    res.json({
      success: true,
      message: 'SQL sorgusu başarıyla test edildi',
      data: {
        rowCount: result.rowCount,
        columns: result.fields.map(field => field.name),
        sampleData: result.rows.slice(0, 5) // İlk 5 satırı göster
      }
    });
  } catch (error) {
    console.error('Test query error:', error);
    res.status(500).json({
      success: false,
      message: 'SQL sorgusu test edilirken hata oluştu: ' + error.message
    });
  }
});

module.exports = router;
