const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Kullanıcı kaydı (sadece super admin yapabilir)
router.post('/register', async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      role,
      branchId
    } = req.body;

    // Email kontrolü
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Bu email adresi zaten kullanılıyor'
      });
    }

    // Şifre hash'leme
    const hashedPassword = await bcrypt.hash(password, 12);

    // Kullanıcı oluşturma
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role: role || 'STAFF',
        branchId
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        branchId: true,
        createdAt: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Kullanıcı başarıyla oluşturuldu',
      data: user
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı oluşturulurken hata oluştu'
    });
  }
});

// Kullanıcı girişi
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Kullanıcıyı bul
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        managedBranch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Geçersiz email veya şifre'
      });
    }

    // Şifre kontrolü
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Geçersiz email veya şifre'
      });
    }

    // JWT token oluştur
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        role: user.role,
        branchId: user.branchId
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Activity log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        branchId: user.branchId,
        action: 'LOGIN',
        details: 'Kullanıcı giriş yaptı',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    // Kullanıcı bilgilerini döndür (şifre hariç)
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Giriş başarılı',
      data: {
        user: userWithoutPassword,
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Giriş yapılırken hata oluştu'
    });
  }
});

// Kullanıcı çıkışı
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Activity log
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        branchId: req.user.branchId,
        action: 'LOGOUT',
        details: 'Kullanıcı çıkış yaptı',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json({
      success: true,
      message: 'Çıkış başarılı'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Çıkış yapılırken hata oluştu'
    });
  }
});

// Mevcut kullanıcı bilgilerini getir
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        managedBranch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        branchId: true,
        branch: true,
        managedBranch: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı bilgileri alınırken hata oluştu'
    });
  }
});

// Şifre değiştirme
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Mevcut şifreyi kontrol et
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Mevcut şifre yanlış'
      });
    }

    // Yeni şifreyi hash'le
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Şifreyi güncelle
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedNewPassword }
    });

    // Activity log
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        branchId: req.user.branchId,
        action: 'CHANGE_PASSWORD',
        details: 'Kullanıcı şifresini değiştirdi',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json({
      success: true,
      message: 'Şifre başarıyla değiştirildi'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Şifre değiştirilirken hata oluştu'
    });
  }
});

module.exports = router; 