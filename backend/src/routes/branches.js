const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const pool = require('../config/database');

const router = express.Router();

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

    // Şubeleri getir (manager bilgileri ile birlikte)
    const query = `
      SELECT 
        b.*,
        u.username as manager_name,
        u.email as manager_email
      FROM branches b
      LEFT JOIN users u ON b.manager_id = u.id
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
      SELECT 
        b.*,
        u.username as manager_name,
        u.email as manager_email
      FROM branches b
      LEFT JOIN users u ON b.manager_id = u.id
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
      name,
      code,
      province,
      address,
      phone,
      email,
      manager_id,
      timezone = 'Europe/Istanbul'
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
    
    // Yeni şube oluştur
    const result = await pool.query(`
      INSERT INTO branches (name, code, province, address, phone, email, manager_id, timezone)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [name, code, province, address, phone, email, finalManagerId, timezone]);

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
          timezone = COALESCE($8, timezone),
          is_active = COALESCE($9, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `, [name, code, province, address, phone, email, finalManagerId, timezone, is_active, id]);
    
    console.log('Update sonucu:', result.rows[0]); // Debug log

    // Güncellenmiş şubeyi manager bilgileri ile birlikte getir
    const updatedBranch = await pool.query(`
      SELECT 
        b.*,
        u.username as manager_name,
        u.email as manager_email
      FROM branches b
      LEFT JOIN users u ON b.manager_id = u.id
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

    // Şubeyi sil
    await pool.query('DELETE FROM branches WHERE id = $1', [id]);

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
          invoices: 0
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