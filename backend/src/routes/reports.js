const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Genel istatistikler
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { branchId, period = 'month' } = req.query;

    // Tarih aralığı hesapla
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

    // Şube filtresi
    const where = {};
    if (branchId) {
      where.branchId = branchId;
    } else if (req.user.role !== 'SUPER_ADMIN') {
      where.branchId = req.user.branchId;
    }

    const dateWhere = {
      ...where,
      createdAt: {
        gte: startDate
      }
    };

    // İstatistikleri hesapla
    const [
      totalPatients,
      totalAppointments,
      totalTreatments,
      totalInvoices,
      totalRevenue,
      appointmentStats,
      treatmentStats,
      revenueStats
    ] = await Promise.all([
      // Toplam hasta sayısı
      prisma.patient.count({ where }),
      
      // Toplam randevu sayısı
      prisma.appointment.count({ where: dateWhere }),
      
      // Toplam tedavi sayısı
      prisma.treatment.count({ where: dateWhere }),
      
      // Toplam fatura sayısı
      prisma.invoice.count({ where: dateWhere }),
      
      // Toplam gelir
      prisma.invoice.aggregate({
        where: {
          ...dateWhere,
          status: 'PAID'
        },
        _sum: {
          total: true
        }
      }),
      
      // Randevu istatistikleri
      prisma.appointment.groupBy({
        by: ['status'],
        where: dateWhere,
        _count: {
          status: true
        }
      }),
      
      // Tedavi istatistikleri
      prisma.treatment.groupBy({
        by: ['type'],
        where: dateWhere,
        _count: {
          type: true
        },
        _sum: {
          cost: true
        }
      }),
      
      // Gelir istatistikleri
      prisma.invoice.groupBy({
        by: ['status'],
        where: dateWhere,
        _sum: {
          total: true
        },
        _count: {
          status: true
        }
      })
    ]);

    // Randevu durumları
    const appointmentStatuses = {};
    appointmentStats.forEach(stat => {
      appointmentStatuses[stat.status] = stat._count.status;
    });

    // Tedavi türleri
    const treatmentTypes = {};
    treatmentStats.forEach(stat => {
      treatmentTypes[stat.type] = {
        count: stat._count.type,
        revenue: stat._sum.cost || 0
      };
    });

    // Gelir durumları
    const revenueStatuses = {};
    revenueStats.forEach(stat => {
      revenueStatuses[stat.status] = {
        total: stat._sum.total || 0,
        count: stat._count.status
      };
    });

    res.json({
      success: true,
      data: {
        period,
        summary: {
          totalPatients,
          totalAppointments,
          totalTreatments,
          totalInvoices,
          totalRevenue: totalRevenue._sum.total || 0
        },
        appointments: appointmentStatuses,
        treatments: treatmentTypes,
        revenue: revenueStatuses
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'İstatistikler alınırken hata oluştu'
    });
  }
});

// Şube bazlı istatistikler
router.get('/branch-stats', authenticateToken, async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    // Tarih aralığı hesapla
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

    // Şube istatistikleri
    const branchStats = await prisma.branch.findMany({
      where: req.user.role !== 'SUPER_ADMIN' ? { id: req.user.branchId } : {},
      include: {
        _count: {
          select: {
            patients: true,
            appointments: {
              where: {
                createdAt: {
                  gte: startDate
                }
              }
            },
            treatments: {
              where: {
                createdAt: {
                  gte: startDate
                }
              }
            },
            invoices: {
              where: {
                createdAt: {
                  gte: startDate
                }
              }
            }
          }
        },
        invoices: {
          where: {
            createdAt: {
              gte: startDate
            },
            status: 'PAID'
          },
          select: {
            total: true
          }
        }
      }
    });

    const stats = branchStats.map(branch => ({
      id: branch.id,
      name: branch.name,
      code: branch.code,
      patients: branch._count.patients,
      appointments: branch._count.appointments,
      treatments: branch._count.treatments,
      invoices: branch._count.invoices,
      revenue: branch.invoices.reduce((sum, inv) => sum + parseFloat(inv.total), 0)
    }));

    res.json({
      success: true,
      data: {
        period,
        branches: stats
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

// Doktor performans raporu
router.get('/doctor-performance', authenticateToken, async (req, res) => {
  try {
    const { branchId, period = 'month' } = req.query;

    // Tarih aralığı hesapla
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

    // Şube filtresi
    const where = {};
    if (branchId) {
      where.branchId = branchId;
    } else if (req.user.role !== 'SUPER_ADMIN') {
      where.branchId = req.user.branchId;
    }

    const dateWhere = {
      ...where,
      createdAt: {
        gte: startDate
      }
    };

    // Doktor performansları
    const doctorStats = await prisma.user.findMany({
      where: {
        ...where,
        role: 'DOCTOR'
      },
      include: {
        _count: {
          select: {
            appointments: {
              where: dateWhere
            },
            treatments: {
              where: dateWhere
            },
            invoices: {
              where: dateWhere
            }
          }
        },
        invoices: {
          where: {
            ...dateWhere,
            status: 'PAID'
          },
          select: {
            total: true
          }
        }
      }
    });

    const performance = doctorStats.map(doctor => ({
      id: doctor.id,
      name: `${doctor.firstName} ${doctor.lastName}`,
      email: doctor.email,
      appointments: doctor._count.appointments,
      treatments: doctor._count.treatments,
      invoices: doctor._count.invoices,
      revenue: doctor.invoices.reduce((sum, inv) => sum + parseFloat(inv.total), 0)
    }));

    res.json({
      success: true,
      data: {
        period,
        doctors: performance
      }
    });

  } catch (error) {
    console.error('Get doctor performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Doktor performans raporu alınırken hata oluştu'
    });
  }
});

// Gelir raporu
router.get('/revenue', authenticateToken, async (req, res) => {
  try {
    const { branchId, startDate, endDate } = req.query;

    // Tarih aralığı
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();

    // Şube filtresi
    const where = {
      createdAt: {
        gte: start,
        lte: end
      }
    };

    if (branchId) {
      where.branchId = branchId;
    } else if (req.user.role !== 'SUPER_ADMIN') {
      where.branchId = req.user.branchId;
    }

    // Gelir istatistikleri
    const revenueStats = await prisma.invoice.groupBy({
      by: ['status'],
      where,
      _sum: {
        total: true,
        amount: true,
        tax: true
      },
      _count: {
        status: true
      }
    });

    // Günlük gelir
    const dailyRevenue = await prisma.invoice.groupBy({
      by: ['createdAt'],
      where: {
        ...where,
        status: 'PAID'
      },
      _sum: {
        total: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Tedavi bazlı gelir
    const treatmentRevenue = await prisma.treatment.groupBy({
      by: ['type'],
      where: {
        createdAt: {
          gte: start,
          lte: end
        }
      },
      _sum: {
        cost: true
      },
      _count: {
        type: true
      }
    });

    const revenue = {
      summary: {},
      daily: dailyRevenue.map(day => ({
        date: day.createdAt,
        revenue: day._sum.total || 0
      })),
      treatments: treatmentRevenue.map(treatment => ({
        type: treatment.type,
        revenue: treatment._sum.cost || 0,
        count: treatment._count.type
      }))
    };

    // Özet istatistikler
    revenueStats.forEach(stat => {
      revenue.summary[stat.status] = {
        total: stat._sum.total || 0,
        amount: stat._sum.amount || 0,
        tax: stat._sum.tax || 0,
        count: stat._count.status
      };
    });

    res.json({
      success: true,
      data: revenue
    });

  } catch (error) {
    console.error('Get revenue report error:', error);
    res.status(500).json({
      success: false,
      message: 'Gelir raporu alınırken hata oluştu'
    });
  }
});

// Hasta raporu
router.get('/patients', authenticateToken, async (req, res) => {
  try {
    const { branchId, status, gender } = req.query;

    // Şube filtresi
    const where = {};
    if (branchId) {
      where.branchId = branchId;
    } else if (req.user.role !== 'SUPER_ADMIN') {
      where.branchId = req.user.branchId;
    }

    if (status) {
      where.status = status;
    }

    if (gender) {
      where.gender = gender;
    }

    // Hasta istatistikleri
    const patientStats = await prisma.patient.groupBy({
      by: ['status', 'gender'],
      where,
      _count: {
        status: true,
        gender: true
      }
    });

    // Yaş grupları
    const ageGroups = await prisma.patient.findMany({
      where,
      select: {
        dateOfBirth: true
      }
    });

    const ageDistribution = {
      '0-18': 0,
      '19-30': 0,
      '31-50': 0,
      '51-70': 0,
      '70+': 0
    };

    const now = new Date();
    ageGroups.forEach(patient => {
      if (patient.dateOfBirth) {
        const age = now.getFullYear() - patient.dateOfBirth.getFullYear();
        if (age <= 18) ageDistribution['0-18']++;
        else if (age <= 30) ageDistribution['19-30']++;
        else if (age <= 50) ageDistribution['31-50']++;
        else if (age <= 70) ageDistribution['51-70']++;
        else ageDistribution['70+']++;
      }
    });

    res.json({
      success: true,
      data: {
        stats: patientStats,
        ageDistribution
      }
    });

  } catch (error) {
    console.error('Get patient report error:', error);
    res.status(500).json({
      success: false,
      message: 'Hasta raporu alınırken hata oluştu'
    });
  }
});

module.exports = router; 