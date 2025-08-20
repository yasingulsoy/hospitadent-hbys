const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const pool = require('../config/database');

const router = express.Router();

// Yardımcı: Tablo var mı kontrol et
async function tableExists(tableName) {
  try {
    const result = await pool.query('SELECT to_regclass($1) as reg', [`public.${tableName}`]);
    return Boolean(result.rows[0] && result.rows[0].reg);
  } catch (e) {
    return false;
  }
}

// Tüm şubeleri getir
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let params = [];
    let paramIndex = 1;

    if (search) {
      whereClause += `WHERE (b.name ILIKE $${paramIndex} OR b.code ILIKE $${paramIndex} OR b.address ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      const statusCondition = status === 'active' ? 'AND b.is_active = true' : 'AND b.is_active = false';
      whereClause += whereClause ? ` ${statusCondition}` : `WHERE ${statusCondition}`;
    }

    // Toplam sayıyı al
    const countQuery = `SELECT COUNT(*) FROM branches b ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Şubeleri getir (tüm bilgiler branches tablosundan)
    const query = `
      SELECT * FROM branches b
      ${whereClause}
      ORDER BY b.created_at DESC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const finalParams = [...params, parseInt(limit), offset];
    const result = await pool.query(query, finalParams);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get branches error:', error);
    res.status(500).json({
      success: false,
      message: 'Şubeler alınırken hata oluştu'
    });
  }
});

// Tek şube getir
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT * FROM branches b
      WHERE b.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Şube bulunamadı'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get branch error:', error);
    res.status(500).json({
      success: false,
      message: 'Şube alınırken hata oluştu'
    });
  }
});

// Yeni şube oluştur
router.post('/', async (req, res) => {
  try {
    const {
      branch_id,
      name,
      code,
      province,
      address,
      phone,
      email,
      manager_id,
      manager_name,
      timezone = 'Europe/Istanbul',
      is_active = true
    } = req.body;

    // Kod kontrolü
    const existingResult = await pool.query('SELECT id FROM branches WHERE code = $1', [code]);
    
    if (existingResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu şube kodu zaten kullanılıyor'
      });
    }

    // Manager ID'yi kontrol et - boşsa NULL yap
    const finalManagerId = manager_id && manager_id !== '' && manager_id !== null ? parseInt(manager_id) : null;
    
    // Eğer branch_id verildiyse benzersiz ve sayısal olmalı
    if (branch_id !== undefined && branch_id !== null && branch_id !== '') {
      const numericId = parseInt(branch_id);
      if (Number.isNaN(numericId) || numericId <= 0) {
        return res.status(400).json({ success: false, message: 'Geçerli bir branch_id girin' });
      }
      const idExists = await pool.query('SELECT 1 FROM branches WHERE id = $1', [numericId]);
      if (idExists.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'Bu branch_id zaten kullanılıyor' });
      }
      // Belirtilen ID ile ekle
      const result = await pool.query(`
        INSERT INTO branches (id, name, code, province, address, phone, email, manager_id, manager_name, timezone, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [numericId, name, code, province, address, phone, email, finalManagerId, manager_name, timezone, is_active]);

      // Sequence'i en yüksek ID'ye ayarla
      await pool.query("SELECT setval(pg_get_serial_sequence('branches','id'), GREATEST((SELECT MAX(id) FROM branches), 1))");

      return res.status(201).json({
        success: true,
        message: 'Şube başarıyla oluşturuldu',
        data: result.rows[0]
      });
    }

    // branch_id verilmediyse otomatik ID ile ekle
    const result = await pool.query(`
      INSERT INTO branches (name, code, province, address, phone, email, manager_id, manager_name, timezone, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [name, code, province, address, phone, email, finalManagerId, manager_name, timezone, is_active]);

    res.status(201).json({
      success: true,
      message: 'Şube başarıyla oluşturuldu',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Create branch error:', error);
    res.status(500).json({
      success: false,
      message: 'Şube oluşturulurken hata oluştu'
    });
  }
});

// Şube güncelle
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      code,
      province,
      address,
      phone,
      email,
      manager_id,
      manager_name,
      timezone,
      is_active
    } = req.body;

    // Şube kontrolü
    const existingResult = await pool.query('SELECT id FROM branches WHERE id = $1', [id]);
    
    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Şube bulunamadı'
      });
    }

    // Kod kontrolü (kendi ID'si hariç)
    if (code) {
      const codeResult = await pool.query('SELECT id FROM branches WHERE code = $1 AND id != $2', [code, id]);
      if (codeResult.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Bu şube kodu zaten kullanılıyor'
        });
      }
    }

    // Manager ID'yi kontrol et - boşsa NULL yap
    const finalManagerId = manager_id && manager_id !== '' && manager_id !== null ? parseInt(manager_id) : null;
    
    console.log('Güncellenecek manager_id:', finalManagerId); // Debug log
    
    // Şubeyi güncelle
    const result = await pool.query(`
      UPDATE branches 
      SET name = COALESCE($1, name),
          code = COALESCE($2, code),
          province = COALESCE($3, province),
          address = COALESCE($4, address),
          phone = COALESCE($5, phone),
          email = COALESCE($6, email),
          manager_id = COALESCE($7, manager_id),
          manager_name = COALESCE($8, manager_name),
          timezone = COALESCE($9, timezone),
          is_active = COALESCE($10, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `, [name, code, province, address, phone, email, finalManagerId, manager_name, timezone, is_active, id]);
    
    console.log('Update sonucu:', result.rows[0]); // Debug log

    // Güncellenmiş şubeyi getir
    const updatedBranch = await pool.query(`
      SELECT * FROM branches b
      WHERE b.id = $1
    `, [id]);

    res.json({
      success: true,
      message: 'Şube başarıyla güncellendi',
      data: updatedBranch.rows[0]
    });

  } catch (error) {
    console.error('Update branch error:', error);
    res.status(500).json({
      success: false,
      message: 'Şube güncellenirken hata oluştu'
    });
  }
});

// Şube sil
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Şube kontrolü
    const existingResult = await pool.query('SELECT id, name FROM branches WHERE id = $1', [id]);
    
    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Şube bulunamadı'
      });
    }

    // İlişkili kayıtlarla birlikte şubeyi güvenli şekilde sil (transaksiyon)
    try {
      await pool.query('BEGIN');
      // Varsa şubeye bağlı kartları sil (tablo mevcutsa)
      if (await tableExists('branch_cards')) {
        await pool.query('DELETE FROM branch_cards WHERE branch_id = $1', [id]);
      }
      // Ardından şubeyi sil
      await pool.query('DELETE FROM branches WHERE id = $1', [id]);
      await pool.query('COMMIT');
    } catch (txError) {
      await pool.query('ROLLBACK');
      throw txError;
    }

    res.json({
      success: true,
      message: 'Şube başarıyla silindi'
    });

  } catch (error) {
    console.error('Delete branch error:', error);
    res.status(500).json({
      success: false,
      message: 'Şube silinirken hata oluştu'
    });
  }
});

// Şube istatistikleri
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;

    // Şube kontrolü
    const branchResult = await pool.query('SELECT id, name, code FROM branches WHERE id = $1', [id]);
    
    if (branchResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Şube bulunamadı'
      });
    }

    const branch = branchResult.rows[0];

    // Basit istatistikler (şimdilik)
    res.json({
      success: true,
      data: {
        branch: {
          id: branch.id,
          name: branch.name,
          code: branch.code
        },
        counts: {
          users: 0,
          patients: 0,
          appointments: 0,
          treatments: 0,
          appointments: 0
        },
        appointments: {
          total: 0,
          confirmed: 0,
          completed: 0,
          cancelled: 0
        },
        revenue: {
          total: 0,
          paid: 0,
          pending: 0
        }
      }
    });

  } catch (error) {
    console.error('Get branch stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Şube istatistikleri alınırken hata oluştu'
    });
  }
});

module.exports = router; 