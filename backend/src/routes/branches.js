const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Tüm şubeleri getir
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const skip = (page - 1) * limit;

    // Filtreleme koşulları
    const where = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (status) {
      where.isActive = status === 'active';
    }

    // Super admin değilse sadece kendi şubesini görebilir
    if (req.user.role !== 'SUPER_ADMIN') {
      where.id = req.user.branchId;
    }

    const [branches, total] = await Promise.all([
      prisma.branch.findMany({
        where,
        include: {
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          _count: {
            select: {
              users: true,
              patients: true,
              appointments: true
            }
          }
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.branch.count({ where })
    ]);

    res.json({
      success: true,
      data: branches,
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
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Yetki kontrolü
    if (req.user.role !== 'SUPER_ADMIN' && req.user.branchId !== id) {
      return res.status(403).json({
        success: false,
        message: 'Bu şube için yetkiniz bulunmuyor'
      });
    }

    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            isActive: true
          }
        },
        _count: {
          select: {
            users: true,
            patients: true,
            appointments: true,
            treatments: true,
            invoices: true
          }
        }
      }
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Şube bulunamadı'
      });
    }

    res.json({
      success: true,
      data: branch
    });

  } catch (error) {
    console.error('Get branch error:', error);
    res.status(500).json({
      success: false,
      message: 'Şube alınırken hata oluştu'
    });
  }
});

// Yeni şube oluştur (sadece super admin)
router.post('/', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (req, res) => {
  try {
    const {
      name,
      code,
      address,
      phone,
      email,
      managerId,
      timezone = 'Europe/Istanbul'
    } = req.body;

    // Kod kontrolü
    const existingBranch = await prisma.branch.findUnique({
      where: { code }
    });

    if (existingBranch) {
      return res.status(400).json({
        success: false,
        message: 'Bu şube kodu zaten kullanılıyor'
      });
    }

    // Manager kontrolü
    if (managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: managerId }
      });

      if (!manager) {
        return res.status(400).json({
          success: false,
          message: 'Belirtilen yönetici bulunamadı'
        });
      }
    }

    const branch = await prisma.branch.create({
      data: {
        name,
        code,
        address,
        phone,
        email,
        managerId,
        timezone
      },
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Activity log
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE_BRANCH',
        details: `Yeni şube oluşturuldu: ${branch.name}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.status(201).json({
      success: true,
      message: 'Şube başarıyla oluşturuldu',
      data: branch
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
router.put('/:id', authenticateToken, authorizeRoles('SUPER_ADMIN', 'BRANCH_MANAGER'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      address,
      phone,
      email,
      managerId,
      timezone,
      isActive
    } = req.body;

    // Yetki kontrolü
    if (req.user.role === 'BRANCH_MANAGER' && req.user.managedBranch?.id !== id) {
      return res.status(403).json({
        success: false,
        message: 'Bu şube için yetkiniz bulunmuyor'
      });
    }

    // Şube kontrolü
    const existingBranch = await prisma.branch.findUnique({
      where: { id }
    });

    if (!existingBranch) {
      return res.status(404).json({
        success: false,
        message: 'Şube bulunamadı'
      });
    }

    // Manager kontrolü
    if (managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: managerId }
      });

      if (!manager) {
        return res.status(400).json({
          success: false,
          message: 'Belirtilen yönetici bulunamadı'
        });
      }
    }

    const branch = await prisma.branch.update({
      where: { id },
      data: {
        name,
        address,
        phone,
        email,
        managerId,
        timezone,
        isActive
      },
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Activity log
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        branchId: id,
        action: 'UPDATE_BRANCH',
        details: `Şube güncellendi: ${branch.name}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json({
      success: true,
      message: 'Şube başarıyla güncellendi',
      data: branch
    });

  } catch (error) {
    console.error('Update branch error:', error);
    res.status(500).json({
      success: false,
      message: 'Şube güncellenirken hata oluştu'
    });
  }
});

// Şube sil (sadece super admin)
router.delete('/:id', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    // Şube kontrolü
    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            patients: true,
            appointments: true
          }
        }
      }
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Şube bulunamadı'
      });
    }

    // Şubede veri varsa silmeyi engelle
    if (branch._count.users > 0 || branch._count.patients > 0 || branch._count.appointments > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu şubede veri bulunduğu için silinemez. Önce verileri taşıyın veya arşivleyin.'
      });
    }

    await prisma.branch.delete({
      where: { id }
    });

    // Activity log
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'DELETE_BRANCH',
        details: `Şube silindi: ${branch.name}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

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
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { period = 'month' } = req.query;

    // Yetki kontrolü
    if (req.user.role !== 'SUPER_ADMIN' && req.user.branchId !== id) {
      return res.status(403).json({
        success: false,
        message: 'Bu şube için yetkiniz bulunmuyor'
      });
    }

    const now = new Date();
    let startDate;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const [stats] = await prisma.$transaction([
      prisma.branch.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              users: true,
              patients: true,
              appointments: true,
              treatments: true,
              invoices: true
            }
          },
          appointments: {
            where: {
              createdAt: {
                gte: startDate
              }
            },
            select: {
              status: true,
              type: true
            }
          },
          invoices: {
            where: {
              createdAt: {
                gte: startDate
              }
            },
            select: {
              total: true,
              status: true
            }
          }
        }
      })
    ]);

    if (!stats) {
      return res.status(404).json({
        success: false,
        message: 'Şube bulunamadı'
      });
    }

    // İstatistikleri hesapla
    const appointmentStats = {
      total: stats.appointments.length,
      confirmed: stats.appointments.filter(a => a.status === 'CONFIRMED').length,
      completed: stats.appointments.filter(a => a.status === 'COMPLETED').length,
      cancelled: stats.appointments.filter(a => a.status === 'CANCELLED').length
    };

    const revenueStats = {
      total: stats.invoices.reduce((sum, inv) => sum + parseFloat(inv.total), 0),
      paid: stats.invoices
        .filter(inv => inv.status === 'PAID')
        .reduce((sum, inv) => sum + parseFloat(inv.total), 0),
      pending: stats.invoices
        .filter(inv => inv.status === 'PENDING')
        .reduce((sum, inv) => sum + parseFloat(inv.total), 0)
    };

    res.json({
      success: true,
      data: {
        branch: {
          id: stats.id,
          name: stats.name,
          code: stats.code
        },
        counts: stats._count,
        appointments: appointmentStats,
        revenue: revenueStats,
        period
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