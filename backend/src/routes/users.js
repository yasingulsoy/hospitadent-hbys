const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Yeni kullanıcı oluştur
router.post('/', authenticateToken, authorizeRoles(1, 2), async (req, res) => {
  try {
    console.log('Received request body:', req.body);
    
    const { username, email, password, role, görev_tanımı, name, surname, branch_id, branch_role, is_active = true } = req.body;
    
    console.log('Extracted data:', { username, email, password, role, görev_tanımı, name, surname, branch_id, branch_role, is_active });
    
    // Gerekli alanları kontrol et
    if (!username || !email || !password || (role === undefined || role === null || role === '') || !branch_id) {
      console.log('Validation failed:', { username: !!username, email: !!email, password: !!password, role: role, branch_id: !!branch_id });
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı adı, email, şifre, rol ve şube zorunludur'
      });
    }
    
    // Email formatını kontrol et
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir email adresi giriniz'
      });
    }
    
    // Kullanıcı adı ve email benzersizlik kontrolü
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu kullanıcı adı veya email zaten kullanılıyor'
      });
    }
    
         console.log('About to insert user with data:', [username, email, password, role, görev_tanımı || 'Belirtilmemiş', name || '', surname || '', branch_id, branch_role || 3, is_active]);
     
     // Kullanıcıyı oluştur
     const userResult = await pool.query(`
       INSERT INTO users (username, email, password_hash, role, görev_tanımı, name, surname, branch_id, branch_role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
       RETURNING id
     `, [username, email, password, role, görev_tanımı || 'Belirtilmemiş', name || '', surname || '', branch_id, branch_role || 3, is_active]);
    
    const userId = userResult.rows[0].id;
    console.log('User created successfully with ID:', userId);
    
    res.status(201).json({
      success: true,
      message: 'Kullanıcı başarıyla oluşturuldu',
      data: { id: userId, username, email, role }
    });
    
  } catch (error) {
    console.error('Kullanıcı oluşturulamadı:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı oluşturulamadı',
      error: error.message
    });
  }
});

// Tüm kullanıcıları getir
router.get('/', authenticateToken, authorizeRoles(1, 2), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id, 
        u.username, 
        u.email, 
        u.role, 
        u.görev_tanımı, 
        u.name,
        u.surname,
        u.branch_id,
        u.branch_role,
        u.is_active, 
        u.created_at, 
        u.updated_at,
        jsonb_build_object(
          'id', b.id,
          'name', b.name,
          'code', b.code
        ) as branch
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      ORDER BY u.id
    `);
    
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

// ID'ye göre kullanıcı getir (şube bilgileri ile birlikte)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Kullanıcı bilgilerini getir
    const userResult = await pool.query(`
      SELECT id, username, email, role, görev_tanımı, is_active, created_at, updated_at 
      FROM users WHERE id = $1
    `, [id]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }
    
    const user = userResult.rows[0];
    
    // Kullanıcının şube bilgilerini getir
    const branchesResult = await pool.query(`
      SELECT b.branch_id, b.name, b.code, b.location
      FROM branches b
      WHERE b.branch_id = $1
      ORDER BY b.name
    `, [id]);
    
    user.branches = branchesResult.rows;
    
    res.json({
      success: true,
      data: user
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
router.put('/:id', authenticateToken, authorizeRoles(1, 2), async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, password, role, görev_tanımı, name, surname, branch_id, branch_role, is_active } = req.body;
    
    // Kullanıcının var olup olmadığını kontrol et
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }
    
    let updateQuery = 'UPDATE users SET username = $1, email = $2, role = $3, görev_tanımı = $4, name = $5, surname = $6, branch_id = $7, branch_role = $8, is_active = $9, updated_at = NOW()';
    let queryParams = [username, email, role, görev_tanımı || 'Belirtilmemiş', name || '', surname || '', branch_id || null, branch_role || 3, is_active];
    
         // Şifre değiştirilecekse
     if (password && password.trim() !== '') {
       updateQuery += ', password_hash = $10';
       queryParams.push(password);
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
router.delete('/:id', authenticateToken, authorizeRoles(1, 2), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Kullanıcının var olup olmadığını kontrol et
    const userCheck = await pool.query('SELECT id, role FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }
    
    const userToDelete = userCheck.rows[0];
    
    // Kendini silmeye çalışıyorsa engelle
    if (parseInt(id) === req.user?.id) {
      return res.status(400).json({
        success: false,
        message: 'Kendi hesabınızı silemezsiniz'
      });
    }
    
    // Yetki kontrolü: Kim kimi silebilir?
    const currentUserRole = req.user?.role || 0;
    
    // Superadmin herkesi silebilir (kendisi hariç)
    if (currentUserRole === 2) {
      if (userToDelete.role === 2) {
        return res.status(403).json({
          success: false,
          message: 'Diğer Superadmin kullanıcıları silinemez'
        });
      }
    }
    // Admin sadece normal kullanıcıları silebilir
    else if (currentUserRole === 1) {
      if (userToDelete.role === 1 || userToDelete.role === 2) {
        return res.status(403).json({
          success: false,
          message: 'Yetkiniz yeterli değil. Admin ve Superadmin kullanıcıları silemezsiniz.'
        });
      }
    }
    // Normal kullanıcı hiç kimseyi silemez
    else {
      return res.status(403).json({
        success: false,
        message: 'Yetkiniz yeterli değil. Kullanıcı silme yetkiniz bulunmuyor.'
      });
    }
    
    // Önce kullanıcıyı sil
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

// Tüm şubeleri getir (kullanıcı ekleme için)
router.get('/branches/all', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, code, province, is_active
      FROM branches 
      WHERE is_active = true
      ORDER BY name
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Şubeler getirilemedi:', error);
    res.status(500).json({
      success: false,
      message: 'Şubeler getirilemedi',
      error: error.message
    });
  }
});

module.exports = router;
