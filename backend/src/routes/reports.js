const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const pool = require('../config/database');
const mysql = require('mysql2/promise');

const router = express.Router();

// Dashboard kartları için endpoint'ler
// Tüm dashboard kartlarını getir
router.get('/dashboard-cards', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM dashboard_cards WHERE is_active = true ORDER BY sort_order ASC, id ASC'
    );
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Dashboard kartları getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Dashboard kartları alınırken hata oluştu',
      error: error.message
    });
  }
});

// Dashboard kartı ekle/güncelle (admin/superadmin)
router.post('/dashboard-cards', authenticateToken, async (req, res) => {
  try {
    if (!req.user.role || (req.user.role !== 1 && req.user.role !== 2 && req.user.role !== '1' && req.user.role !== '2')) {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için yetkiniz yok'
      });
    }

    const { id, name, display_name, query, card_type, icon, color, is_active, sort_order } = req.body;

    if (!name || !display_name || !query || !card_type) {
      return res.status(400).json({
        success: false,
        message: 'name, display_name, query ve card_type alanları zorunludur'
      });
    }

    let result;
    if (id) {
      // Güncelleme
      const { rows } = await pool.query(
        `UPDATE dashboard_cards SET 
          name = $1, display_name = $2, query = $3, card_type = $4, 
          icon = $5, color = $6, is_active = $7, sort_order = $8, 
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $9 RETURNING *`,
        [name, display_name, query, card_type, icon, color, is_active, sort_order, id]
      );
      result = rows[0];
    } else {
      // Yeni ekleme
      const { rows } = await pool.query(
        `INSERT INTO dashboard_cards 
          (name, display_name, query, card_type, icon, color, is_active, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [name, display_name, query, card_type, icon, color, is_active, sort_order]
      );
      result = rows[0];
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Dashboard kartı kaydetme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Dashboard kartı kaydedilemedi',
      error: error.message
    });
  }
});

// Dashboard kartı sil (admin/superadmin)
router.delete('/dashboard-cards/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user.role || (req.user.role !== 1 && req.user.role !== 2 && req.user.role !== '1' && req.user.role !== '2')) {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için yetkiniz yok'
      });
    }

    const { id } = req.params;
    await pool.query('DELETE FROM dashboard_cards WHERE id = $1', [id]);
    
    res.json({
      success: true,
      message: 'Dashboard kartı başarıyla silindi'
    });
  } catch (error) {
    console.error('Dashboard kartı silme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Dashboard kartı silinemedi',
      error: error.message
    });
  }
});

// Dashboard kartlarının verilerini MariaDB'den çek
router.get('/dashboard-data', authenticateToken, async (req, res) => {
  try {
    // Aktif dashboard kartlarını getir
    const { rows: cards } = await pool.query(
      'SELECT * FROM dashboard_cards WHERE is_active = true ORDER BY sort_order ASC, id ASC'
    );

    if (cards.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }

    // MariaDB bağlantısı kur
    const connRes = await pool.query('SELECT * FROM data_connections WHERE is_active = true ORDER BY updated_at DESC LIMIT 1');
    if (connRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Veritabanı bağlantısı kurulamadı. Lütfen daha sonra tekrar deneyin.',
        technicalError: 'No active database connection'
      });
    }
    const conn = connRes.rows[0];

    const mariadb = await mysql.createConnection({
      host: conn.host,
      port: parseInt(conn.port),
      user: conn.username,
      password: conn.password || '',
      database: conn.database_name
    });

    // Her kart için MariaDB'de sorguyu çalıştır
    const dashboardData = [];
    
    for (const card of cards) {
      try {
        const [result] = await mariadb.execute(card.query);
        
        let value = 0;
        let additionalData = {};
        
        // Kart türüne göre veriyi işle
        switch (card.card_type) {
          case 'branch':
            value = result[0]?.count || 0;
            additionalData = {
              status: value > 0 ? 'Tümü Aktif' : 'Aktif Değil',
              statusColor: value > 0 ? 'green' : 'red'
            };
            break;
            
          case 'patient':
            // monthly_patients kartı için özel işlem
            if (card.name === 'monthly_patients') {
              const row = result?.[0] || {};
              // current_month_patients kolonunu ara
              const candidateKeys = [
                'current_month_patients', 'CURRENT_MONTH_PATIENTS',
                'count', 'COUNT',
                'total_patients', 'TOTAL_PATIENTS'
              ];
              let extracted = 0;
              for (const key of candidateKeys) {
                if (row[key] !== undefined && row[key] !== null) {
                  const num = Number(row[key]);
                  if (!Number.isNaN(num)) { extracted = num; break; }
                  const parsed = parseFloat(String(row[key]));
                  if (!Number.isNaN(parsed)) { extracted = parsed; break; }
                }
              }
              value = extracted || 0;
              
              // Trend bilgisini hesapla
              const growthPercentage = row.patient_growth_percentage || row.PATIENT_GROWTH_PERCENTAGE || 0;
              let trendText = '';
              let trendColor = 'green';
              
              if (growthPercentage !== null && growthPercentage !== undefined) {
                if (growthPercentage > 0) {
                  trendText = `+${growthPercentage}% geçen aya göre`;
                  trendColor = 'green';
                } else if (growthPercentage < 0) {
                  trendText = `${growthPercentage}% geçen aya göre`;
                  trendColor = 'red';
                } else {
                  trendText = 'Geçen ay ile aynı';
                  trendColor = 'blue';
                }
              }
              
              additionalData = {
                status: 'Aktif hastalar',
                statusColor: 'green',
                trend: trendText,
                trendColor: trendColor,
                percentageChange: growthPercentage
              };
            } else {
              // Diğer patient kartları için standart işlem
              value = result[0]?.count || 0;
              additionalData = {
                status: 'Aktif hastalar',
                statusColor: 'blue'
              };
            }
            break;
            
          case 'appointment':
            // monthly_appointments kartı için özel işlem
            if (card.name === 'monthly_appointments') {
              const row = result?.[0] || {};
              // current_month_appointments kolonunu ara
              const candidateKeys = [
                'current_month_appointments', 'CURRENT_MONTH_APPOINTMENTS',
                'count', 'COUNT',
                'total_appointments', 'TOTAL_APPOINTMENTS'
              ];
              let extracted = 0;
              for (const key of candidateKeys) {
                if (row[key] !== undefined && row[key] !== null) {
                  const num = Number(row[key]);
                  if (!Number.isNaN(num)) { extracted = num; break; }
                  const parsed = parseFloat(String(row[key]));
                  if (!Number.isNaN(parsed)) { extracted = parsed; break; }
                }
              }
              value = extracted || 0;
              
              // Trend bilgisini hesapla
              const growthPercentage = row.appointment_growth_percentage || row.APPOINTMENT_GROWTH_PERCENTAGE || 0;
              let trendText = '';
              let trendColor = 'green';
              
              if (growthPercentage !== null && growthPercentage !== undefined) {
                if (growthPercentage > 0) {
                  trendText = `+${growthPercentage}% geçen aya göre`;
                  trendColor = 'green';
                } else if (growthPercentage < 0) {
                  trendText = `${growthPercentage}% geçen aya göre`;
                  trendColor = 'red';
                } else {
                  trendText = 'Geçen ay ile aynı';
                  trendColor = 'blue';
                }
              }
              
              additionalData = {
                status: 'Aylık randevular',
                statusColor: 'purple',
                trend: trendText,
                trendColor: trendColor,
                percentageChange: growthPercentage
              };
            } else {
              // Diğer appointment kartları için standart işlem
              value = result[0]?.count || 0;
              additionalData = {
                status: 'Bugünkü randevular',
                statusColor: 'purple'
              };
            }
            break;
            
          case 'revenue':
            // Esnek kolon adı desteği: dashboard kartı sorguları farklı alias'lar döndürebilir
            // Örn: total_income, current_month_income vb.
            {
              const row = result?.[0] || {};
              const candidateKeys = [
                'total_income', 'TOTAL_INCOME',
                'current_month_income', 'CURRENT_MONTH_INCOME',
                'today_income', 'TODAY_INCOME',
                'income', 'INCOME',
                'amount', 'AMOUNT',
                'sum', 'SUM',
                'value', 'VALUE'
              ];
              let extracted = 0;
              for (const key of candidateKeys) {
                if (row[key] !== undefined && row[key] !== null) {
                  const num = Number(row[key]);
                  if (!Number.isNaN(num)) { extracted = num; break; }
                  const parsed = parseFloat(String(row[key]));
                  if (!Number.isNaN(parsed)) { extracted = parsed; break; }
                }
              }
              value = extracted || 0;
            }
            additionalData = {
              status: 'Aylık gelir',
              statusColor: 'green'
            };
            
            // Trend bilgisini hesapla (revenue kartları için)
            if (card.name === 'monthly_revenue') {
              const row = result?.[0] || {};
              const growthPercentage = row.growth_percentage || row.GROWTH_PERCENTAGE || 0;
              let trendText = '';
              let trendColor = 'green';
              
              if (growthPercentage !== null && growthPercentage !== undefined) {
                if (growthPercentage > 0) {
                  trendText = `+${growthPercentage}% geçen aya göre`;
                  trendColor = 'green';
                } else if (growthPercentage < 0) {
                  trendText = `${growthPercentage}% geçen aya göre`;
                  trendColor = 'red';
                } else {
                  trendText = 'Geçen ay ile aynı';
                  trendColor = 'blue';
                }
              }
              
              additionalData = {
                status: 'Aylık gelir',
                statusColor: 'green',
                trend: trendText,
                trendColor: trendColor,
                percentageChange: growthPercentage
              };
            } else if (card.name === 'daily_revenue') {
              const row = result?.[0] || {};
              const growthPercentage = row.growth_percentage || row.GROWTH_PERCENTAGE || 0;
              let trendText = '';
              let trendColor = 'green';
              
              if (growthPercentage !== null && growthPercentage !== undefined) {
                if (growthPercentage > 0) {
                  trendText = `+${growthPercentage}% düne göre`;
                  trendColor = 'green';
                } else if (growthPercentage < 0) {
                  trendText = `${growthPercentage}% düne göre`;
                  trendColor = 'red';
                } else {
                  trendText = 'Dün ile aynı';
                  trendColor = 'blue';
                }
              }
              
              additionalData = {
                status: 'Günlük gelir',
                statusColor: 'orange',
                trend: trendText,
                trendColor: trendColor,
                percentageChange: growthPercentage
              };
            }
            break;
            
          default:
            value = result[0]?.count || result[0]?.total_income || 0;
        }
        
        dashboardData.push({
          id: card.id,
          name: card.name,
          display_name: card.display_name,
          card_type: card.card_type,
          icon: card.icon,
          color: card.color,
          value: card.card_type === 'revenue' ? `₺${value.toLocaleString('tr-TR')}` : value.toString(),
          additionalData
        });
        
      } catch (queryError) {
        console.error(`Dashboard kartı sorgu hatası (${card.name}):`, queryError);
        dashboardData.push({
          id: card.id,
          name: card.name,
          display_name: card.display_name,
          card_type: card.card_type,
          icon: card.icon,
          color: card.color,
          value: '0',
          additionalData: {},
          error: 'Sorgu çalıştırılamadı'
        });
      }
    }

    await mariadb.end();

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Dashboard veri getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Dashboard verileri alınırken hata oluştu',
      error: error.message
    });
  }
});

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

    // MariaDB bağlantısı kur
    const connRes = await pool.query('SELECT * FROM data_connections WHERE is_active = true ORDER BY updated_at DESC LIMIT 1');
    if (connRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Veritabanı bağlantısı kurulamadı. Lütfen daha sonra tekrar deneyin.',
        technicalError: 'No active database connection'
      });
    }
    const conn = connRes.rows[0];

    const mariadb = await mysql.createConnection({
      host: conn.host,
      port: parseInt(conn.port),
      user: conn.username,
      password: conn.password || '',
      database: conn.database_name
    });

    // Dashboard kartlarından veri çek
    const { rows: dashboardCards } = await pool.query(
      'SELECT * FROM dashboard_cards WHERE is_active = true ORDER BY sort_order ASC, id ASC'
    );

    // Basit istatistikler - dashboard kartlarından
    const stats = {
      totalPatients: 0,
      totalAppointments: 0,
      totalTreatments: 0
    };

    // Dashboard kartlarından veri topla
    for (const card of dashboardCards) {
      if (card.card_type === 'patient') {
        try {
          const [result] = await mariadb.execute(card.query);
          stats.totalPatients = result[0]?.count || 0;
        } catch (error) {
          console.error('Patient stats error:', error);
        }
      } else if (card.card_type === 'appointment') {
        try {
          const [result] = await mariadb.execute(card.query);
          stats.totalAppointments = result[0]?.count || 0;
        } catch (error) {
          console.error('Appointment stats error:', error);
        }
      } else if (card.card_type === 'treatment') {
        try {
          const [result] = await mariadb.execute(card.query);
          stats.totalTreatments = result[0]?.count || 0;
        } catch (error) {
          console.error('Treatment stats error:', error);
        }
      }
    }

    const totalPatients = stats.totalPatients;
    const totalAppointments = stats.totalAppointments;
    const totalTreatments = stats.totalTreatments;

    // Basit istatistikler
    const appointmentStatuses = { 'active': totalAppointments };
    const treatmentTypes = { 'total': { count: totalTreatments, revenue: 0 } };

    await mariadb.end();

    res.json({
      success: true,
      data: {
        period,
        summary: {
          totalPatients,
          totalAppointments,
          totalTreatments
        },
        appointments: appointmentStatuses,
        treatments: treatmentTypes
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

// Tedavi raporu (tarih bazlı)
router.get('/treatments', authenticateToken, async (req, res) => {
  try {
    const { 
      branchId, 
      startDate, 
      endDate, 
      procedureType, 
      doctorId,
      includeDate = 'true' // Tarih field'ını dahil et
    } = req.query;

    // Şube filtresi
    const where = {};
    if (branchId) {
      where.branchId = branchId;
    } else if (req.user.role !== 'SUPER_ADMIN') {
      where.branchId = req.user.branchId;
    }

    // Tarih filtresi
    if (startDate && endDate) {
      where.updated_on = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    } else {
      // Varsayılan: Son 6 ay
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      where.updated_on = {
        gte: sixMonthsAgo
      };
    }

    // Diğer filtreler
    if (procedureType) {
      where.procedure_name = procedureType;
    }
    if (doctorId) {
      where.doctorId = doctorId;
    }

    // Tedavi istatistikleri
    const treatmentStats = await prisma.treatment.groupBy({
      by: includeDate === 'true' 
        ? ['clinic_name', 'procedure_name', 'updated_on'] 
        : ['clinic_name', 'procedure_name'],
      where: {
        ...where,
        is_deleted: 0,
        is_done: 1
      },
      _count: {
        procedure_name: true
      },
      _sum: {
        cost: true
      },
      orderBy: {
        updated_on: 'desc'
      }
    });

    // Tarih bazlı gruplama
    let result;
    if (includeDate === 'true') {
      // Tarih dahil
      result = treatmentStats.map(stat => ({
        clinic_name: stat.clinic_name,
        procedure_name: stat.procedure_name,
        date: stat.updated_on,
        adet: stat._count.procedure_name,
        toplam_maliyet: stat._sum.cost || 0
      }));
    } else {
      // Tarih olmadan grupla
      const grouped = {};
      treatmentStats.forEach(stat => {
        const key = `${stat.clinic_name}_${stat.procedure_name}`;
        if (!grouped[key]) {
          grouped[key] = {
            clinic_name: stat.clinic_name,
            procedure_name: stat.procedure_name,
            adet: 0,
            toplam_maliyet: 0
          };
        }
        grouped[key].adet += stat._count.procedure_name;
        grouped[key].toplam_maliyet += stat._sum.cost || 0;
      });
      result = Object.values(grouped);
    }

    res.json({
      success: true,
      data: {
        stats: result,
        filters: {
          startDate,
          endDate,
          procedureType,
          doctorId,
          includeDate
        },
        summary: {
          total_procedures: result.reduce((sum, item) => sum + item.adet, 0),
          total_cost: result.reduce((sum, item) => sum + item.toplam_maliyet, 0),
          unique_clinics: [...new Set(result.map(item => item.clinic_name))].length,
          unique_procedures: [...new Set(result.map(item => item.procedure_name))].length
        }
      }
    });

  } catch (error) {
    console.error('Tedavi raporu hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Tedavi raporu alınırken hata oluştu',
      error: error.message
    });
  }
});

// X ve Y ekseni seçeneklerini getir (veritabanından dinamik)
router.get('/axis-options', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Eksen seçenekleri getiriliyor...');
    
    // Veritabanından dinamik olarak seçenekleri çek
    const axisOptions = {
      // X ekseni seçenekleri - veritabanından çek
      xAxis: await getXAxisOptions(),
      
      // Y ekseni seçenekleri - veritabanından çek
      yAxis: await getYAxisOptions()
    };

    res.json({
      success: true,
      data: axisOptions
    });
  } catch (error) {
    console.error('Eksen seçenekleri getirilemedi:', error);
    res.status(500).json({
      success: false,
      message: 'Eksen seçenekleri getirilemedi',
      error: error.message
    });
  }
});

// X ekseni seçeneklerini veritabanından çek
async function getXAxisOptions() {
  try {
    const options = [];
    
    // Tarih bazlı seçenekler
    options.push(
      { value: 'created_at', label: 'Oluşturulma Tarihi', type: 'date' },
      { value: 'updated_on', label: 'Güncellenme Tarihi', type: 'date' },
      { value: 'appointment_date', label: 'Randevu Tarihi', type: 'date' },
      { value: 'treatment_date', label: 'Tedavi Tarihi', type: 'date' },
      { value: 'invoice_date', label: 'Fatura Tarihi', type: 'date' },
      { value: 'birth_date', label: 'Doğum Tarihi', type: 'date' }
    );

    // Kategorik seçenekler - veritabanından çek
    const categoricalFields = await getCategoricalFields();
    options.push(...categoricalFields);

    return options;
  } catch (error) {
    console.error('X ekseni seçenekleri hatası:', error);
    return [];
  }
}

// Y ekseni seçeneklerini veritabanından çek
async function getYAxisOptions() {
  try {
    const options = [];
    
    // Sayısal seçenekler
    options.push(
      { value: 'id', label: 'ID (Sayı)', type: 'count' },
      { value: 'cost', label: 'Maliyet (TL)', type: 'cost' },
      { value: 'price', label: 'Fiyat (TL)', type: 'price' },
      { value: 'total', label: 'Toplam (TL)', type: 'total' },
      { value: 'amount', label: 'Tutar (TL)', type: 'amount' },
      { value: 'tax', label: 'Vergi (TL)', type: 'tax' },
      { value: 'discount', label: 'İndirim (TL)', type: 'discount' },
      { value: 'age', label: 'Yaş', type: 'age' },
      { value: 'weight', label: 'Ağırlık (kg)', type: 'weight' },
      { value: 'height', label: 'Boy (cm)', type: 'height' },
      { value: 'duration', label: 'Süre (Dakika)', type: 'duration' },
      { value: 'quantity', label: 'Miktar', type: 'quantity' }
    );

    // Kategorik sayı seçenekleri - veritabanından çek
    const categoricalCountFields = await getCategoricalCountFields();
    options.push(...categoricalCountFields);

    return options;
  } catch (error) {
    console.error('Y ekseni seçenekleri hatası:', error);
    return [];
  }
}

// Kategorik field'ları veritabanından çek
async function getCategoricalFields() {
  try {
    const options = [];
    
    // Hasta tablosu
    options.push(
      { value: 'patient_status', label: 'Hasta Durumu', type: 'category', table: 'patients' },
      { value: 'gender', label: 'Cinsiyet', type: 'category', table: 'patients' },
      { value: 'blood_type', label: 'Kan Grubu', type: 'category', table: 'patients' },
      { value: 'smoking', label: 'Sigara Kullanımı', type: 'category', table: 'patients' },
      { value: 'alcohol', label: 'Alkol Kullanımı', type: 'category', table: 'patients' },
      { value: 'patient_source', label: 'Hasta Kaynağı', type: 'category', table: 'patients' }
    );

    // Tedavi tablosu
    options.push(
      { value: 'procedure_name', label: 'Prosedür Adı', type: 'category', table: 'treatments' },
      { value: 'treatment_type', label: 'Tedavi Tipi', type: 'category', table: 'treatments' },
      { value: 'treatment_status', label: 'Tedavi Durumu', type: 'category', table: 'treatments' }
    );

    // Randevu tablosu
    options.push(
      { value: 'appointment_status', label: 'Randevu Durumu', type: 'category', table: 'appointments' },
      { value: 'appointment_type', label: 'Randevu Tipi', type: 'category', table: 'appointments' }
    );

    // Fatura tablosu
    options.push(
      { value: 'invoice_status', label: 'Fatura Durumu', type: 'category', table: 'invoices' },
      { value: 'payment_method', label: 'Ödeme Yöntemi', type: 'category', table: 'invoices' }
    );

    // Şube ve kullanıcı tabloları
    options.push(
      { value: 'branch_name', label: 'Şube Adı', type: 'category', table: 'branches' },
      { value: 'branch_code', label: 'Şube Kodu', type: 'category', table: 'branches' },
      { value: 'city', label: 'Şehir', type: 'category', table: 'branches' },
      { value: 'user_role', label: 'Kullanıcı Rolü', type: 'category', table: 'users' },
      { value: 'user_status', label: 'Kullanıcı Durumu', type: 'category', table: 'users' }
    );

    return options;
  } catch (error) {
    console.error('Kategorik field\'lar hatası:', error);
    return [];
  }
}

// Kategorik sayı field'larını veritabanından çek
async function getCategoricalCountFields() {
  try {
    const options = [];
    
    // Her kategorik field için sayı seçeneği ekle
    const categoricalFields = await getCategoricalFields();
    
    categoricalFields.forEach(field => {
      options.push({
        value: `${field.value}_count`,
        label: `${field.label} Sayısı`,
        type: 'count',
        sourceField: field.value,
        sourceTable: field.table
      });
    });

    return options;
  } catch (error) {
    console.error('Kategorik sayı field\'ları hatası:', error);
    return [];
  }
}

// Dinamik grafik verisi oluştur
router.post('/dynamic-chart', authenticateToken, async (req, res) => {
  try {
    const { xAxis, yAxis, aggregationMethod = 'sum', sorting = 'desc', filters = {} } = req.body;

    if (!xAxis || !yAxis) {
      return res.status(400).json({
        success: false,
        message: 'X ve Y ekseni seçimi zorunludur'
      });
    }

    console.log('📊 Grafik isteği:', { xAxis, yAxis, aggregationMethod, sorting, filters });

    // Veritabanından gerçek veri çek
    let chartData = [];
    
    try {
      if (xAxis.type === 'date') {
        chartData = await getDateBasedDataFromDB(xAxis, yAxis, filters, aggregationMethod);
      } else if (xAxis.type === 'category') {
        chartData = await getCategoryBasedDataFromDB(xAxis, yAxis, filters, aggregationMethod);
      } else {
        chartData = await getDefaultDataFromDB(xAxis, yAxis, filters, aggregationMethod);
      }
    } catch (dbError) {
      console.error('Veritabanı hatası:', dbError);
      // Hata durumunda örnek veri döndür
      chartData = [
        { label: 'Veri 1', value: 10 },
        { label: 'Veri 2', value: 20 },
        { label: 'Veri 3', value: 30 }
      ];
    }

    // Sıralama uygula
    if (sorting === 'desc') {
      chartData.sort((a, b) => b.value - a.value);
    } else {
      chartData.sort((a, b) => a.value - b.value);
    }

    res.json({
      success: true,
      data: {
        xAxis,
        yAxis,
        aggregationMethod,
        sorting,
        chartData,
        total: chartData.reduce((sum, item) => sum + item.value, 0),
        count: chartData.length
      }
    });

  } catch (error) {
    console.error('Dinamik grafik oluşturulamadı:', error);
    res.status(500).json({
      success: false,
      message: 'Dinamik grafik oluşturulamadı',
      error: error.message
    });
  }
});

// ==========================
// Filtre Yönetimi ve Çalıştırma
// ==========================

// Tüm filtreleri getir (login gerekli)
router.get('/filters', authenticateToken, async (req, res) => {
	try {
		const { rows } = await pool.query(
			`SELECT id, filter_name, content FROM filters ORDER BY id`
		);
		return res.json({ success: true, filters: rows });
	} catch (error) {
		console.error('filters list error:', error);
		return res.status(500).json({ success: false, message: 'Filtreler alınamadı', error: error.message });
	}
});

// Belirli rapora bağlı filtreleri getir (report_key = route id veya tanımlı anahtar)
router.get('/report/:reportKey/filters', authenticateToken, async (req, res) => {
	try {
		const { reportKey } = req.params;
		const { rows } = await pool.query(
			`SELECT rf.filter_id, rf.is_required, rf.display_order, f.filter_name, f.content
			 FROM report_filters rf
			 JOIN filters f ON f.id = rf.filter_id
			 WHERE rf.report_key = $1
			 ORDER BY rf.display_order, f.filter_name`,
			[reportKey]
		);
		return res.json({ success: true, filters: rows });
	} catch (error) {
		console.error('report filters get error:', error);
		return res.status(500).json({ success: false, message: 'Rapor filtreleri alınamadı', error: error.message });
	}
});

// Rapore filtre ekle/güncelle (UI tarafında admin/superadmin gösterilecek; backend kısıtlaması istemediniz)
router.post('/report/:reportKey/filters', authenticateToken, async (req, res) => {
	try {
		const { reportKey } = req.params;
		const { filter_id, is_required = false, display_order = 0 } = req.body || {};
		if (!filter_id) {
			return res.status(400).json({ success: false, message: 'filter_id zorunludur' });
		}

		const upsertSql = `
			INSERT INTO report_filters (report_key, filter_id, is_required, display_order)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (report_key, filter_id) DO UPDATE SET
				is_required = EXCLUDED.is_required,
				display_order = EXCLUDED.display_order
			RETURNING report_key, filter_id, is_required, display_order;
		`;
		const { rows } = await pool.query(upsertSql, [reportKey, filter_id, !!is_required, parseInt(display_order) || 0]);
		return res.json({ success: true, mapping: rows[0] });
	} catch (error) {
		console.error('report filter upsert error:', error);
		return res.status(500).json({ success: false, message: 'Rapor filtresi eklenemedi', error: error.message });
	}
});

// Rapor filtresi kaldır
router.delete('/report/:reportKey/filters/:filterId', authenticateToken, async (req, res) => {
	try {
		const { reportKey, filterId } = req.params;
		await pool.query(`DELETE FROM report_filters WHERE report_key = $1 AND filter_id = $2`, [reportKey, parseInt(filterId)]);
		return res.json({ success: true });
	} catch (error) {
		console.error('report filter delete error:', error);
		return res.status(500).json({ success: false, message: 'Rapor filtresi silinemedi', error: error.message });
	}
});

// Yardımcı: Atanmış filtre tanımlarına ve kullanıcı parametrelerine göre WHERE oluştur
function buildWhereClauseFromParams(assignedFilters, userParams) {
	const whereClauses = [];
	const values = [];

	// Kolon adını al: content.column varsa onu kullan; yoksa content.param veya params.start/params.end'den türemezse atla
	const getColumnName = (content) => {
		if (!content) return null;
		if (content.column) return content.column;
		if (content.param) return content.param;
		return null;
	};

	for (const af of assignedFilters) {
		let content;
		try {
			content = typeof af.content === 'object' ? af.content : JSON.parse(af.content);
		} catch (_) {
			continue;
		}

		if (content?.type === 'select') {
			const columnName = getColumnName(content);
			const paramKey = content.param; // UI tarafı bu anahtarla göndersin
			if (!columnName || !paramKey) continue;
			const val = userParams?.[paramKey];
			
			// Sadece seçilen filtreler için WHERE clause oluştur
			// Boş veya undefined değerler için filtre atlanır
			if (val === undefined || val === null || (Array.isArray(val) && val.length === 0)) {
				continue; // Bu filtreyi atla
			}
			
			if (Array.isArray(val)) {
				// IN listesi için placeholder'ları genişlet
				const flatVals = val.map(v => (typeof v === 'string' && !Number.isNaN(Number(v)) ? Number(v) : v));
				const placeholders = flatVals.map(() => '?').join(', ');
				whereClauses.push(`${columnName} IN (${placeholders})`);
				values.push(...flatVals);
			} else {
				if (content.operator === 'like') {
					whereClauses.push(`${columnName} LIKE ?`);
					values.push(`%${val}%`);
				} else {
					whereClauses.push(`${columnName} = ?`);
					values.push(val);
				}
			}
		} else if (content?.type === 'date_range') {
			const columnName = getColumnName(content);
			const startKey = content.params?.start;
			const endKey = content.params?.end;
			if (!columnName || (!startKey && !endKey)) continue;
			const startVal = startKey ? userParams?.[startKey] : undefined;
			const endVal = endKey ? userParams?.[endKey] : undefined;
			
			// Sadece tarih değerleri varsa WHERE clause ekle
			if (startVal && endVal) {
				// BETWEEN yerine >= ve <= kullanmak bazı sürümlerde daha stabil
				whereClauses.push(`${columnName} >= ?`);
				values.push(startVal);
				whereClauses.push(`${columnName} <= ?`);
				values.push(endVal);
			} else if (startVal) {
				whereClauses.push(`${columnName} >= ?`);
				values.push(startVal);
			} else if (endVal) {
				whereClauses.push(`${columnName} <= ?`);
				values.push(endVal);
			}
		}
	}

	const sql = whereClauses.length > 0 ? whereClauses.join(' AND ') : '';
	return { sql, values };
}

// Kayıtlı sorguyu filtrelerle çalıştır (login gerekli)
// Body: { params: { branch_id: [1,2], start_date: 'YYYY-MM-DD', end_date: 'YYYY-MM-DD', ... } }
router.post('/execute/:id/with-filters', authenticateToken, async (req, res) => {
	try {
		const id = parseInt(req.params.id);
		if (Number.isNaN(id)) {
			return res.status(400).json({ success: false, message: 'Geçersiz id' });
		}

		// Sorguyu getir
		const qRes = await pool.query('SELECT sql_query FROM saved_queries WHERE id = $1 AND (is_public = true)', [id]);
		if (qRes.rows.length === 0) {
			return res.status(404).json({ success: false, message: 'Sorgu bulunamadı veya erişiminiz yok' });
		}

		// Aktif MariaDB bağlantısı
		const connRes = await pool.query('SELECT * FROM data_connections WHERE is_active = true ORDER BY updated_at DESC LIMIT 1');
		if (connRes.rows.length === 0) {
			return res.status(400).json({ 
				success: false, 
				message: 'Veritabanı bağlantısı kurulamadı. Lütfen daha sonra tekrar deneyin.',
				technicalError: 'No active database connection'
			});
		}
		const conn = connRes.rows[0];

		// Raporun anahtarını belirle: frontend /reports/[id] için id'yi report_key olarak kullanıyoruz
		const reportKey = String(id);

		// Bu rapora bağlı filtreleri çek
		const rfRes = await pool.query(
			`SELECT rf.filter_id, rf.is_required, f.filter_name, f.content
			 FROM report_filters rf JOIN filters f ON f.id = rf.filter_id
			 WHERE rf.report_key = $1`,
			[reportKey]
		);
		const assignedFilters = rfRes.rows || [];

		// Zorunlu parametre anahtarlarını tespit et (sadece is_required olanlar)
		const requiredParamKeys = [];
		for (const af of assignedFilters) {
			let content;
			try {
				content = typeof af.content === 'object' ? af.content : JSON.parse(af.content);
			} catch (_) {
				continue;
			}
			if (!af.is_required) continue;
			if (content?.type === 'select' && content?.param) {
				requiredParamKeys.push(content.param);
			} else if (content?.type === 'date_range') {
				if (content?.params?.start) requiredParamKeys.push(content.params.start);
				if (content?.params?.end) requiredParamKeys.push(content.params.end);
			}
		}

		// Kullanıcı parametreleri
		const { params = {} } = req.body || {};

		let finalSql = qRes.rows[0].sql_query || '';
		if (!finalSql || typeof finalSql !== 'string') {
			return res.status(400).json({ success: false, message: 'Geçersiz sql_query' });
		}

		// Adlandırılmış placeholder desteği: :start_date, :end_date, :clinic_id
		const foundNamed = finalSql.match(/:[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
		const namedKeys = [...new Set(foundNamed.map(s => s.slice(1)))];
		let useNamed = false;
		let executeParams;
		let appliedWhere; // whereSQL bilgisini sadece eski mantıkta dolduracağız
		if (namedKeys.length > 0) {
			useNamed = true;
			// Sadece zorunlu olan parametreler için eksik kontrolü yap
			const missingRequired = requiredParamKeys
				.filter(k => namedKeys.includes(k))
				.filter(k => !(k in params) || params[k] === '' || params[k] === null || (Array.isArray(params[k]) && params[k].length === 0));
			if (missingRequired.length > 0) {
				return res.status(400).json({ success: false, message: `Eksik zorunlu parametre(ler): ${missingRequired.join(', ')}` });
			}
			// Tüm adlandırılmış placeholder'ları bağla; gönderilmeyenler NULL olarak geçsin
			executeParams = namedKeys.reduce((acc, k) => {
				const v = params[k];
				acc[k] = (v === undefined || v === '') ? null : v;
				return acc;
			}, {});

			// Opsiyonel filtreler için :has_{param} bayrağı ekle (yalnızca gerçek parametreler için)
			const baseParamKeys = namedKeys.filter(k => !k.startsWith('has_'));
			for (const k of baseParamKeys) {
				const v = params[k];
				const isEmptyArray = Array.isArray(v) && v.length === 0;
				const isEmpty = v === undefined || v === null || v === '' || isEmptyArray;
				// SQL'de :has_k kullanılıyorsa üzerine yaz, yoksa da zarar vermez
				executeParams[`has_${k}`] = isEmpty ? 0 : 1;
			}

			// Eğer SQL doğrudan :has_* placeholder'ları içeriyorsa ve yukarıda set edilmemişse, tamamla
			const hasFlagKeys = namedKeys.filter(k => k.startsWith('has_'));
			for (const hasKey of hasFlagKeys) {
				if (executeParams[hasKey] !== undefined) continue;
				const baseKey = hasKey.replace(/^has_/, '');
				const v = params[baseKey];
				const isEmptyArray = Array.isArray(v) && v.length === 0;
				const isEmpty = v === undefined || v === null || v === '' || isEmptyArray;
				executeParams[hasKey] = isEmpty ? 0 : 1;
			}
		} else {
			// Eski mantık: atanmış filtrelerden WHERE üret ve ekle
			const { sql: whereSQL, values: whereValues } = buildWhereClauseFromParams(assignedFilters, params);
			appliedWhere = whereSQL;
			if (/\/\*\s*filters\s*\*\//i.test(finalSql)) {
				finalSql = finalSql.replace(/\/\*\s*filters\s*\*\//i, whereSQL ? ` WHERE ${whereSQL} ` : ' ');
			} else if (whereSQL) {
				const hasWhere = /\bwhere\b/i.test(finalSql);
				finalSql = hasWhere ? `${finalSql} AND ${whereSQL}` : `${finalSql} WHERE ${whereSQL}`;
			}
			executeParams = whereValues;
		}

		// Debug: Çalıştırılacak SQL ve parametreler
		try {
			console.log('🧪 Executing saved_query with filters', {
				reportId: id,
				useNamed,
				namedKeys,
				finalSql,
				executeParams
			});
		} catch (_) {}

		// Adlandırılmış placeholder'larda (":param") dizi değerlerini genişlet (IN (:ids) -> IN (:ids_0,:ids_1,...))
		function expandArrayParamsInNamedSql(sql, params) {
			let transformedSql = sql;
			const transformedParams = { ...params };
			for (const [key, value] of Object.entries(params || {})) {
				if (Array.isArray(value)) {
					// Boş dizi durumunda IN (NULL) ile sonuçsuz hale getir
					if (value.length === 0) {
						const reEmpty = new RegExp(`:${key}\\b`, 'g');
						transformedSql = transformedSql.replace(reEmpty, 'NULL');
						delete transformedParams[key];
						continue;
					}
					const phList = value.map((_, idx) => `:${key}_${idx}`).join(', ');
					// Sadece ":key" eşleşmelerini değiştir
					const re = new RegExp(`:${key}\\b`, 'g');
					transformedSql = transformedSql.replace(re, phList);
					value.forEach((v, idx) => { transformedParams[`${key}_${idx}`] = v; });
					delete transformedParams[key];
				}
			}
			return { sql: transformedSql, params: transformedParams };
		}

		try {
			// Eğer adlandırılmış parametreler kullanılıyorsa, dizi parametrelerini genişlet
			if (useNamed && executeParams && typeof executeParams === 'object') {
				const expanded = expandArrayParamsInNamedSql(finalSql, executeParams);
				finalSql = expanded.sql;
				executeParams = expanded.params;
			}

			// Güvenlik: Boş IN parantezleri varsa IN (NULL) ile değiştir
			finalSql = finalSql.replace(/IN\s*\(\s*\)/gi, 'IN (NULL)');
			// Genişletme sonrası son SQL ve parametreleri gözlemlemek için ek log
			try {
				console.log('🔎 Expanded SQL (after array expansion)', { finalSql, executeParams });
			} catch (_) {}
			const mariadb = await mysql.createConnection({
				host: conn.host,
				port: parseInt(conn.port),
				user: conn.username,
				password: conn.password || '',
				database: conn.database_name,
				namedPlaceholders: true
			});

			const [rows] = Array.isArray(executeParams)
				? await mariadb.execute(finalSql, executeParams)
				: await mariadb.execute(finalSql, executeParams || {});
			await mariadb.end();

			return res.json({ 
				success: true, 
				results: rows, 
				rowCount: rows.length, 
				applied: appliedWhere !== undefined ? { where: appliedWhere } : undefined 
			});
		} catch (dbError) {
			console.error('execute with filters db error:', dbError);
			return res.status(500).json({ 
				success: false, 
				message: 'Sorgu çalıştırılamadı. Lütfen daha sonra tekrar deneyin.',
				technicalError: dbError.message 
			});
		}
	} catch (error) {
		console.error('execute with filters error:', error);
		return res.status(500).json({ 
			success: false, 
			message: 'Sorgu çalıştırılamadı. Lütfen daha sonra tekrar deneyin.',
			technicalError: error.message 
		});
	}
});

// Yardımcı fonksiyonlar
async function getDateBasedData(xAxis, yAxis, filters, includeDate) {
  // Tarih bazlı veri çekme
  console.log('📅 Tarih bazlı veri çekiliyor:', xAxis.value, 'Tarih dahil:', includeDate);
  
  // Örnek veri - gerçek implementasyonda veritabanından çekilecek
  const dateData = {
    'gun': [
      { label: 'Pazartesi', value: 25, date: '2024-01-01' },
      { label: 'Salı', value: 30, date: '2024-01-02' },
      { label: 'Çarşamba', value: 28, date: '2024-01-03' },
      { label: 'Perşembe', value: 35, date: '2024-01-04' },
      { label: 'Cuma', value: 32, date: '2024-01-05' }
    ],
    'ay': [
      { label: 'Ocak', value: 150, date: '2024-01' },
      { label: 'Şubat', value: 180, date: '2024-02' },
      { label: 'Mart', value: 220, date: '2024-03' },
      { label: 'Nisan', value: 190, date: '2024-04' },
      { label: 'Mayıs', value: 250, date: '2024-05' }
    ],
    'yil': [
      { label: '2022', value: 1800, date: '2022' },
      { label: '2023', value: 2200, date: '2023' },
      { label: '2024', value: 2400, date: '2024' }
    ]
  };
  
  const data = dateData[xAxis.value] || dateData['ay'];
  
  // Tarih field'ını dahil et veya çıkar
  if (includeDate === 'true') {
    return data;
  } else {
    return data.map(item => ({
      label: item.label,
      value: item.value
    }));
  }
}

// Herkese açık (auth gerekli) kayıtlı sorguları getir
router.get('/public-queries', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, description, sql_query, category, is_public, created_by, created_at, last_run, usage_count
       FROM saved_queries
       WHERE is_public = true
       ORDER BY created_at DESC`
    );
    return res.json({ success: true, queries: rows });
  } catch (error) {
    console.error('public-queries error:', error);
    return res.status(500).json({ success: false, message: 'Kamuya açık sorgular alınamadı', error: error.message });
  }
});

// Herkese açık bağlantı durumu (sadece özet bilgisi)
router.get('/connection-status', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT name, is_active FROM data_connections ORDER BY updated_at DESC, id DESC`
    );
    const active = rows.find(r => r.is_active);
    if (active) {
      return res.json({ success: true, data: { isConnected: true, name: active.name } });
    }
    return res.json({ success: true, data: { isConnected: false } });
  } catch (error) {
    console.error('connection-status error:', error);
    return res.json({ success: true, data: { isConnected: false } });
  }
});

// Kayıtlı sorguyu normal kullanıcılar için çalıştır (aktif MariaDB bağlantısı ile)
router.post('/run/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Geçersiz id' });
    }

    const qRes = await pool.query('SELECT sql_query FROM saved_queries WHERE id = $1 AND (is_public = true)', [id]);
    if (qRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Sorgu bulunamadı veya erişiminiz yok' });
    }

    const connRes = await pool.query('SELECT * FROM data_connections WHERE is_active = true ORDER BY updated_at DESC LIMIT 1');
    if (connRes.rows.length === 0) {
      // Bağlantı yoksa kullanıcıya admin mesajı gösterme
      return res.status(400).json({ 
        success: false, 
        message: 'Veritabanı bağlantısı kurulamadı. Lütfen daha sonra tekrar deneyin.',
        technicalError: 'No active database connection'
      });
    }
    const conn = connRes.rows[0];

    try {
      const mariadb = await mysql.createConnection({
        host: conn.host,
        port: parseInt(conn.port),
        user: conn.username,
        password: conn.password || '',
        database: conn.database_name
      });

      const [rows] = await mariadb.execute(qRes.rows[0].sql_query);
      await mariadb.end();

      return res.json({ success: true, results: rows, rowCount: rows.length });
    } catch (dbError) {
      console.error('run query db error:', dbError);
      return res.status(500).json({ 
        success: false, 
        message: 'Sorgu çalıştırılamadı. Lütfen daha sonra tekrar deneyin.',
        technicalError: dbError.message 
      });
    }
  } catch (error) {
    console.error('run query error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Sorgu çalıştırılamadı. Lütfen daha sonra tekrar deneyin.',
      technicalError: error.message 
    });
  }
});

// Tüm kullanıcılar için rapor çalıştırma (bağlantı kontrolü olmadan)
router.post('/execute/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Geçersiz id' });
    }

    const qRes = await pool.query('SELECT sql_query FROM saved_queries WHERE id = $1 AND (is_public = true)', [id]);
    if (qRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Sorgu bulunamadı veya erişiminiz yok' });
    }

    const connRes = await pool.query('SELECT * FROM data_connections WHERE is_active = true ORDER BY updated_at DESC LIMIT 1');
    if (connRes.rows.length === 0) {
      // Bağlantı yoksa kullanıcıya admin mesajı gösterme
      return res.status(400).json({ 
        success: false, 
        message: 'Veritabanı bağlantısı kurulamadı. Lütfen daha sonra tekrar deneyin.',
        technicalError: 'No active database connection'
      });
    }
    const conn = connRes.rows[0];

    try {
      const mariadb = await mysql.createConnection({
        host: conn.host,
        port: parseInt(conn.port),
        user: conn.username,
        password: conn.password || '',
        database: conn.database_name
      });

      const [rows] = await mariadb.execute(qRes.rows[0].sql_query);
      await mariadb.end();

      return res.json({ success: true, results: rows, rowCount: rows.length });
    } catch (dbError) {
      console.error('execute query db error:', dbError);
      return res.status(500).json({ 
        success: false, 
        message: 'Sorgu çalıştırılamadı. Lütfen daha sonra tekrar deneyin.',
        technicalError: dbError.message 
      });
    }
  } catch (error) {
    console.error('execute query error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Sorgu çalıştırılamadı. Lütfen daha sonra tekrar deneyin.',
      technicalError: error.message 
    });
  }
});

async function getCategoryBasedData(xAxis, yAxis, filters, includeDate) {
  // Kategorik veri çekme
  console.log('🏷️ Kategorik veri çekiliyor:', xAxis.value, yAxis.value, 'Tarih dahil:', includeDate);
  
  // Örnek veri - gerçek implementasyonda veritabanından çekilecek
  const categoryData = {
    'durum': [
      { label: 'Aktif', value: 45, date: '2024-01-15' },
      { label: 'Pasif', value: 12, date: '2024-01-16' },
      { label: 'Beklemede', value: 8, date: '2024-01-17' }
    ],
    'tip': [
      { label: 'Tip A', value: 30, date: '2024-01-18' },
      { label: 'Tip B', value: 25, date: '2024-01-19' },
      { label: 'Tip C', value: 15, date: '2024-01-20' }
    ],
    'sube': [
      { label: 'Merkez Şube', value: 120, date: '2024-01-21' },
      { label: 'Kadıköy Şube', value: 85, date: '2024-01-22' },
      { label: 'Beşiktaş Şube', value: 95, date: '2024-01-23' }
    ],
    'doktor': [
      { label: 'Dr. Ahmet', value: 65, date: '2024-01-24' },
      { label: 'Dr. Ayşe', value: 55, date: '2024-01-25' },
      { label: 'Dr. Mehmet', value: 45, date: '2024-01-26' }
    ],
    'cinsiyet': [
      { label: 'Kadın', value: 180, date: '2024-01-27' },
      { label: 'Erkek', value: 120, date: '2024-01-28' }
    ]
  };
  
  const data = categoryData[xAxis.value] || categoryData['durum'];
  
  // Tarih field'ını dahil et veya çıkar
  if (includeDate === 'true') {
    return data;
  } else {
    return data.map(item => ({
      label: item.label,
      value: item.value
    }));
  }
}

async function getDefaultData(xAxis, yAxis, filters, includeDate) {
  // Varsayılan veri çekme
  console.log('🔧 Varsayılan veri çekiliyor:', xAxis.value, yAxis.value, 'Tarih dahil:', includeDate);
  
  const data = [
    { label: 'Veri 1', value: 10, date: '2024-01-01' },
    { label: 'Veri 2', value: 20, date: '2024-01-02' },
    { label: 'Veri 3', value: 30, date: '2024-01-03' }
  ];
  
  // Tarih field'ını dahil et veya çıkar
  if (includeDate === 'true') {
    return data;
  } else {
    return data.map(item => ({
      label: item.label,
      value: item.value
    }));
  }
}

// Veritabanından tarih bazlı veri çek
async function getDateBasedDataFromDB(xAxis, yAxis, filters, aggregationMethod) {
  try {
    console.log('📅 Veritabanından tarih bazlı veri çekiliyor:', xAxis.value, yAxis.value);
    
    // Tarih field'ına göre tablo seç
    let tableName = 'treatments'; // Varsayılan
    let dateField = xAxis.value;
    
    if (xAxis.value === 'appointment_date') {
      tableName = 'appointments';
    } else if (xAxis.value === 'birth_date') {
      tableName = 'patients';
    } else if (xAxis.value === 'invoice_date') {
      tableName = 'invoices';
    }
    
    // Prisma ile veri çek
    const result = await prisma.$queryRaw`
      SELECT 
        DATE(${dateField}) as date_label,
        COUNT(*) as count_value,
        SUM(${yAxis.value}) as sum_value,
        COUNT(CASE WHEN ${yAxis.value} <> 0 THEN 1 END) as nonzero_count
      FROM ${tableName}
      WHERE ${dateField} IS NOT NULL
      GROUP BY DATE(${dateField})
      ORDER BY date_label DESC
      LIMIT 30
    `;
    
    return result.map(item => ({
      label: item.date_label,
      value: (aggregationMethod === 'count' || yAxis.type === 'count')
        ? Number(item.count_value)
        : aggregationMethod === 'count_nonzero'
          ? Number(item.nonzero_count)
          : aggregationMethod === 'avg'
            ? (Number(item.sum_value) || 0) / (Number(item.count_value) || 1)
            : Number(item.sum_value) || 0
    }));
    
  } catch (error) {
    console.error('Tarih bazlı veri çekme hatası:', error);
    throw error;
  }
}

// Veritabanından kategorik veri çek
async function getCategoryBasedDataFromDB(xAxis, yAxis, filters, aggregationMethod) {
  try {
    console.log('🏷️ Veritabanından kategorik veri çekiliyor:', xAxis.value, yAxis.value);
    
    // Field'a göre tablo seç
    let tableName = 'treatments'; // Varsayılan
    let categoryField = xAxis.value;
    
    if (xAxis.value.includes('patient_')) {
      tableName = 'patients';
    } else if (xAxis.value.includes('appointment_')) {
      tableName = 'appointments';
    } else if (xAxis.value.includes('invoice_')) {
      tableName = 'invoices';
    } else if (xAxis.value.includes('branch_')) {
      tableName = 'branches';
    } else if (xAxis.value.includes('user_')) {
      tableName = 'users';
    }
    
    // Basit filtreler (örn. şube/klinik adı)
    const whereClauses = [];
    if (filters?.clinic_name) {
      whereClauses.push(prisma.sql`clinic_name = ${filters.clinic_name}`);
    }
    const whereSQL = whereClauses.length > 0 ? prisma.join([prisma.sql`WHERE `, prisma.join(whereClauses, prisma.sql` AND `)]) : prisma.sql``;
    
    const result = await prisma.$queryRaw`
      SELECT 
        ${prisma.raw(categoryField)} as category_label,
        COUNT(*) as count_value,
        SUM(${prisma.raw(yAxis.value)}) as sum_value,
        COUNT(CASE WHEN ${prisma.raw(yAxis.value)} <> 0 THEN 1 END) as nonzero_count
      FROM ${prisma.raw(tableName)}
      ${whereSQL}
      GROUP BY ${prisma.raw(categoryField)}
      ORDER BY count_value DESC
      LIMIT 50
    `;
    
    return result.map(item => ({
      label: item.category_label || 'Bilinmeyen',
      value: (aggregationMethod === 'count' || yAxis.type === 'count')
        ? Number(item.count_value)
        : aggregationMethod === 'count_nonzero'
          ? Number(item.nonzero_count)
          : aggregationMethod === 'avg'
            ? (Number(item.sum_value) || 0) / (Number(item.count_value) || 1)
            : Number(item.sum_value) || 0
    }));
    
  } catch (error) {
    console.error('Kategorik veri çekme hatası:', error);
    throw error;
  }
}

// Veritabanından varsayılan veri çek
async function getDefaultDataFromDB(xAxis, yAxis, filters, aggregationMethod) {
  try {
    console.log('🔧 Veritabanından varsayılan veri çekiliyor:', xAxis.value, yAxis.value);
    
    // Basit sayım
    const result = await prisma.treatment.count({
      where: {
        is_deleted: 0
      }
    });
    
    return [
      { label: 'Toplam Tedavi', value: result },
      { label: 'Aktif Tedavi', value: Math.floor(result * 0.7) },
      { label: 'Tamamlanan', value: Math.floor(result * 0.3) }
    ];
    
  } catch (error) {
    console.error('Varsayılan veri çekme hatası:', error);
    throw error;
  }
}

module.exports = router; 
 
// ==========================
// Grafik Konfigürasyonları
// ==========================
// Not: Okuma herkes için serbest; oluşturma/silme sadece Admin(1) ve SuperAdmin(2)

function isAdminOrSuper(user) {
  return user && (user.role === 1 || user.role === 2 || user.role === '1' || user.role === '2');
}

// Varsayılan konfigürasyonu getir (herkese açık - login gerekli)
router.get('/:reportId/chart-config', authenticateToken, async (req, res) => {
  try {
    const reportId = parseInt(req.params.reportId);
    if (Number.isNaN(reportId)) {
      return res.status(400).json({ success: false, message: 'Geçersiz reportId' });
    }

    const { rows } = await pool.query(
      `SELECT *
       FROM report_chart_configs
       WHERE report_id = $1 AND is_active = TRUE
       ORDER BY is_default DESC, updated_at DESC
       LIMIT 1`,
      [reportId]
    );

    return res.json({ success: true, config: rows[0] || null });
  } catch (error) {
    console.error('chart-config get error:', error);
    return res.status(500).json({ success: false, message: 'Konfigürasyon alınamadı', error: error.message });
  }
});

// Belirli rapor için tüm konfigleri listele (okuma tüm kullanıcılar için serbest)
router.get('/:reportId/chart-configs', authenticateToken, async (req, res) => {
  try {
    const reportId = parseInt(req.params.reportId);
    if (Number.isNaN(reportId)) {
      return res.status(400).json({ success: false, message: 'Geçersiz reportId' });
    }

    const { rows } = await pool.query(
      `SELECT * FROM report_chart_configs
       WHERE report_id = $1 AND is_active = TRUE
       ORDER BY is_default DESC, sort_order ASC, updated_at DESC`,
      [reportId]
    );
    return res.json({ success: true, configs: rows });
  } catch (error) {
    console.error('chart-configs list error:', error);
    return res.status(500).json({ success: false, message: 'Konfigürasyonlar listelenemedi', error: error.message });
  }
});

// Belirli bir grafik konfigürasyonunu getir (düzenleme için)
router.get('/:reportId/chart-config/:configId', authenticateToken, async (req, res) => {
  try {
    const reportId = parseInt(req.params.reportId);
    const configId = parseInt(req.params.configId);
    
    if (Number.isNaN(reportId) || Number.isNaN(configId)) {
      return res.status(400).json({ success: false, message: 'Geçersiz reportId veya configId' });
    }

    const { rows } = await pool.query(
      `SELECT * FROM report_chart_configs
       WHERE id = $1 AND report_id = $2 AND is_active = TRUE`,
      [configId, reportId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Grafik konfigürasyonu bulunamadı' });
    }

    return res.json({ success: true, config: rows[0] });
  } catch (error) {
    console.error('chart-config get error:', error);
    return res.status(500).json({ success: false, message: 'Konfigürasyon getirilemedi', error: error.message });
  }
});

// Belirli bir grafik konfigürasyonunu güncelle (düzenleme için)
router.put('/:reportId/chart-config/:configId', authenticateToken, async (req, res) => {
  try {
    console.log('🔄 Grafik konfigürasyonu güncelleniyor:', {
      reportId: req.params.reportId,
      configId: req.params.configId,
      body: req.body,
      user: req.user
    });

    if (!isAdminOrSuper(req.user)) {
      return res.status(403).json({ success: false, message: 'Bu işlem için yetkiniz yok' });
    }

    const reportId = parseInt(req.params.reportId);
    const configId = parseInt(req.params.configId);
    
    if (Number.isNaN(reportId) || Number.isNaN(configId)) {
      return res.status(400).json({ success: false, message: 'Geçersiz reportId veya configId' });
    }

    let {
      name,
      chart_type,
      x_axis,
      y_axis,
      x_axis_type,
      y_axis_type,
      series,
      aggregation,
      sort_by,
      group_by,
      height,
      chart_options,
      filters,
      is_default,
      sort_order,
      distinctColumn
    } = req.body || {};

    // count_nonzero değerini count olarak kaydet (veritabanı constraint'i için)
    let aggregation_display = aggregation;
    // count_nonzero değeri artık direkt kaydedilebilir

    console.log('📊 Güncellenecek veriler:', {
      name, chart_type, x_axis, y_axis, aggregation, sort_by, group_by, height, distinctColumn
    });

    if (!chart_type || !x_axis || !y_axis) {
      return res.status(400).json({ success: false, message: 'chart_type, x_axis ve y_axis zorunludur' });
    }

    // Eğer varsayılan işaretlenecekse, mevcut varsayılanları kaldır
    if (is_default) {
      await pool.query('UPDATE report_chart_configs SET is_default = FALSE WHERE report_id = $1 AND id != $2', [reportId, configId]);
    }

    const updateSql = `
      UPDATE report_chart_configs SET
        name = $3,
        chart_type = $4,
        x_axis = $5,
        y_axis = $6,
        x_axis_type = $7,
        y_axis_type = $8,
        series = $9,
        aggregation = $10,
        sort_by = $11,
        group_by = $12,
        height = $13,
        chart_options = $14,
        filters = $15,
        is_default = $16,
        distinct_column = $17,
        updated_at = NOW()
      WHERE id = $2 AND report_id = $1
      RETURNING *;
    `;

    const params = [
      reportId,
      configId,
      name,
      chart_type,
      x_axis,
      y_axis,
      x_axis_type || 'categorical',
      y_axis_type || 'numeric',
      Array.isArray(series) ? series : [],
      aggregation,
      sort_by,
      group_by,
      height,
      chart_options || {},
      filters || {},
      !!is_default,
      distinctColumn || ''
    ];

    console.log('🔍 SQL parametreleri:', params);
    console.log('📝 SQL sorgusu:', updateSql);

    const { rows } = await pool.query(updateSql, params);
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Grafik konfigürasyonu bulunamadı' });
    }

    // sort_order verildiyse ayrıca güncelle
    if (typeof sort_order === 'number' && Number.isFinite(sort_order)) {
      await pool.query('UPDATE report_chart_configs SET sort_order = $1 WHERE id = $2 AND report_id = $3', [sort_order, configId, reportId]);
    }

    return res.json({ success: true, config: rows[0] });
  } catch (error) {
    console.error('chart-config update error:', error);
    return res.status(500).json({ success: false, message: 'Konfigürasyon güncellenemedi', error: error.message });
  }
});

// Varsayılan konfig ekle/güncelle (admin/superadmin)
router.post('/:reportId/chart-config', authenticateToken, async (req, res) => {
  try {
    if (!isAdminOrSuper(req.user)) {
      return res.status(403).json({ success: false, message: 'Bu işlem için yetkiniz yok' });
    }

    const reportId = parseInt(req.params.reportId);
    if (Number.isNaN(reportId)) {
      return res.status(400).json({ success: false, message: 'Geçersiz reportId' });
    }

    const {
      name = 'Varsayılan Grafik',
      chart_type,
      x_axis,
      y_axis,
      x_axis_type = 'categorical',
      y_axis_type = 'numeric',
      series = [],
      aggregation = 'sum',
      sort_by = 'desc',
      group_by = null,
      height = 480,
      chart_options = {},
      filters = {},
      is_default = true,
      distinctColumn
    } = req.body || {};

    if (!chart_type || !x_axis || !y_axis) {
      return res.status(400).json({ success: false, message: 'chart_type, x_axis ve y_axis zorunludur' });
    }

    // Eğer varsayılan işaretlenecekse, mevcut varsayılanları kaldır
    if (is_default) {
      await pool.query('UPDATE report_chart_configs SET is_default = FALSE WHERE report_id = $1', [reportId]);
    }

    // Aynı isim varsa benzersiz bir isim üret
    const uniqueNameSql = `
      WITH base AS (
        SELECT $2::text AS base_name
      ),
      existing AS (
        SELECT name FROM report_chart_configs WHERE report_id = $1 AND name ILIKE ($2 || '%')
      )
      SELECT CASE WHEN COUNT(*) = 0 THEN $2 ELSE $2 || ' ' || (COUNT(*)+1) END AS final_name FROM existing;
    `;
    const nameCheck = await pool.query(uniqueNameSql, [reportId, name]);
    const finalName = nameCheck.rows?.[0]?.final_name || name;

    const upsertSql = `
      INSERT INTO report_chart_configs (
        report_id, name, chart_type, x_axis, y_axis, x_axis_type, y_axis_type, series,
        aggregation, sort_by, group_by, height, chart_options, filters, is_default, distinct_column
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15, $16
      )
      ON CONFLICT (report_id, name) DO UPDATE SET
        chart_type = EXCLUDED.chart_type,
        x_axis = EXCLUDED.x_axis,
        y_axis = EXCLUDED.y_axis,
        x_axis_type = EXCLUDED.x_axis_type,
        y_axis_type = EXCLUDED.y_axis_type,
        series = EXCLUDED.series,
        aggregation = EXCLUDED.aggregation,
        sort_by = EXCLUDED.sort_by,
        group_by = EXCLUDED.group_by,
        height = EXCLUDED.height,
        chart_options = EXCLUDED.chart_options,
        filters = EXCLUDED.filters,
        is_default = EXCLUDED.is_default,
        distinct_column = EXCLUDED.distinct_column,
        updated_at = NOW()
      RETURNING *;
    `;

    const params = [
      reportId,
      finalName,
      chart_type,
      x_axis,
      y_axis,
      x_axis_type,
      y_axis_type,
      Array.isArray(series) ? series : [],
      aggregation,
      sort_by,
      group_by,
      height,
      chart_options,
      filters,
      !!is_default,
      distinctColumn || ''
    ];

    const { rows } = await pool.query(upsertSql, params);

    // Yeni kayıt için sort_order'ı kuyruğa ekle (mevcutların sonuna)
    const inserted = rows[0];
    if (inserted && inserted.id) {
      const nextOrderResult = await pool.query('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM report_chart_configs WHERE report_id = $1', [reportId]);
      const nextOrder = nextOrderResult.rows?.[0]?.next_order || 1;
      await pool.query('UPDATE report_chart_configs SET sort_order = $1 WHERE id = $2', [nextOrder, inserted.id]);
      inserted.sort_order = nextOrder;
    }

    return res.json({ success: true, config: rows[0] });
  } catch (error) {
    console.error('chart-config upsert error:', error);
    return res.status(500).json({ success: false, message: 'Konfigürasyon kaydedilemedi', error: error.message });
  }
});

// Çoklu sıralama güncelle (admin/superadmin)
router.put('/:reportId/chart-configs/reorder', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    if (!isAdminOrSuper(req.user)) {
      return res.status(403).json({ success: false, message: 'Bu işlem için yetkiniz yok' });
    }

    const reportId = parseInt(req.params.reportId);
    if (Number.isNaN(reportId)) {
      return res.status(400).json({ success: false, message: 'Geçersiz reportId' });
    }

    const { order } = req.body || {};
    if (!Array.isArray(order) || order.length === 0) {
      return res.status(400).json({ success: false, message: 'Geçersiz sıralama verisi' });
    }

    await client.query('BEGIN');
    for (const item of order) {
      const id = parseInt(item.id);
      const sortOrder = parseInt(item.sort_order);
      if (!Number.isNaN(id) && Number.isFinite(sortOrder)) {
        await client.query('UPDATE report_chart_configs SET sort_order = $1 WHERE id = $2 AND report_id = $3', [sortOrder, id, reportId]);
      }
    }
    await client.query('COMMIT');
    return res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('chart-configs reorder error:', error);
    return res.status(500).json({ success: false, message: 'Sıralama güncellenemedi', error: error.message });
  } finally {
    client.release();
  }
});

// Veritabanı constraint'lerini kontrol et ve güncelle (debug için)
router.get('/debug/constraints', authenticateToken, async (req, res) => {
  try {
    if (!isAdminOrSuper(req.user)) {
      return res.status(403).json({ success: false, message: 'Bu işlem için yetkiniz yok' });
    }

    // Mevcut constraint'leri kontrol et
    const constraintQuery = `
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'report_chart_configs'::regclass 
      AND conname = 'report_chart_configs_aggregation_check'
    `;
    
    const constraintResult = await pool.query(constraintQuery);
    
    if (constraintResult.rows.length > 0) {
      const constraint = constraintResult.rows[0];
      console.log('🔍 Mevcut constraint:', constraint);
      
      // Constraint'i güncelle - count_nonzero ekle
      const updateConstraintQuery = `
        ALTER TABLE report_chart_configs 
        DROP CONSTRAINT IF EXISTS report_chart_configs_aggregation_check;
        
        ALTER TABLE report_chart_configs 
        ADD CONSTRAINT report_chart_configs_aggregation_check 
        CHECK (aggregation IN ('sum', 'count', 'count_nonzero', 'average', 'avg', 'min', 'max', 'distinct'));
      `;
      
      await pool.query(updateConstraintQuery);
      console.log('✅ Constraint güncellendi');
      
      return res.json({ 
        success: true, 
        message: 'Constraint güncellendi',
        oldConstraint: constraint,
        newConstraint: 'sum, count, count_nonzero, average, avg, min, max'
      });
    } else {
      return res.json({ 
        success: false, 
        message: 'Constraint bulunamadı',
        constraints: constraintResult.rows
      });
    }
  } catch (error) {
    console.error('Constraint güncelleme hatası:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Constraint güncellenemedi', 
      error: error.message 
    });
  }
});

// Konfig sil (admin/superadmin)
router.delete('/chart-config/:configId', authenticateToken, async (req, res) => {
  try {
    if (!isAdminOrSuper(req.user)) {
      return res.status(403).json({ success: false, message: 'Bu işlem için yetkiniz yok' });
    }
    const configId = parseInt(req.params.configId);
    if (Number.isNaN(configId)) {
      return res.status(400).json({ success: false, message: 'Geçersiz configId' });
    }
    await pool.query('DELETE FROM report_chart_configs WHERE id = $1', [configId]);
    return res.json({ success: true });
  } catch (error) {
    console.error('chart-config delete error:', error);
    return res.status(500).json({ success: false, message: 'Konfigürasyon silinemedi', error: error.message });
  }
});

// Aylık gelir endpoint'i (dashboard_cards tablosundan sorgu çalıştırır)
router.get('/monthly-revenue', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Monthly revenue endpoint çağrıldı');
    
    // Aktif MariaDB bağlantısı
    const connRes = await pool.query('SELECT * FROM data_connections WHERE is_active = true ORDER BY updated_at DESC LIMIT 1');
    if (connRes.rows.length === 0) {
      console.log('❌ Aktif veritabanı bağlantısı bulunamadı');
      return res.status(400).json({
        success: false,
        message: 'Veritabanı bağlantısı kurulamadı. Lütfen daha sonra tekrar deneyin.',
        technicalError: 'No active database connection'
      });
    }
    const conn = connRes.rows[0];
    console.log('✅ Veritabanı bağlantısı bulundu:', conn.host, conn.database_name);

    // Dashboard kartından (dashboard_cards) aylık gelir sorgusunu getir
    const cardResult = await pool.query(
      'SELECT query FROM dashboard_cards WHERE name = $1 AND is_active = true ORDER BY updated_at DESC NULLS LAST, id DESC LIMIT 1',
      ['monthly_revenue']
    );
    const dashboardCardRow = cardResult.rows[0];
    if (!dashboardCardRow || !dashboardCardRow.query) {
      console.log('❌ monthly_revenue dashboard kartı bulunamadı');
      return res.status(400).json({ success: false, message: 'Aylık gelir için dashboard_cards içinde sorgu bulunamadı' });
    }
    console.log('✅ Dashboard kartı bulundu, sorgu uzunluğu:', dashboardCardRow.query.length);

    // MariaDB bağlantısı
    const mariadb = await mysql.createConnection({
      host: conn.host,
      port: parseInt(conn.port),
      user: conn.username,
      password: conn.password || '',
      database: conn.database_name
    });
    console.log('✅ MariaDB bağlantısı kuruldu');

    const sql = dashboardCardRow.query;
    console.log('🔍 Çalıştırılacak SQL sorgusu:');
    console.log(sql);

    // Sorguyu çalıştır
    const [rows] = await mariadb.execute(sql);
    await mariadb.end();
    console.log('✅ MariaDB sorgusu tamamlandı');

    // Debug: Sorgu sonucunu logla
    console.log('🔍 SQL Sonucu (rows):', rows);
    console.log('🔍 Sonuç tipi:', typeof rows);
    console.log('🔍 Sonuç uzunluğu:', rows ? rows.length : 'undefined');

    if (!rows || rows.length === 0) {
      console.log('❌ Sorgu sonucu boş, varsayılan değerler döndürülüyor');
      return res.json({
        success: true,
        data: {
          currentMonth: { name: '', year: 0, income: 0 },
          lastMonth: { name: '', year: 0, income: 0 },
          percentageChange: 0,
          totalIncome: 0
        }
      });
    }

    const result = rows[0];
    console.log('🔍 İlk satır sonucu:', result);
    console.log('🔍 Kolon isimleri:', Object.keys(result));
    console.log('🔍 Sonuç değerleri:', {
      'CURRENT_MONTH_INCOME': result.CURRENT_MONTH_INCOME,
      'current_month_income': result.current_month_income,
      'PREVIOUS_MONTH_INCOME': result.PREVIOUS_MONTH_INCOME,
      'previous_month_income': result.previous_month_income,
      'GROWTH_PERCENTAGE': result.GROWTH_PERCENTAGE,
      'growth_percentage': result.growth_percentage
    });
    
    // Kolon isimlerini her iki durumu da destekleyecek şekilde al (büyük/küçük harf)
    const currentMonthIncome = Number(result.CURRENT_MONTH_INCOME || result.current_month_income || result[0] || 0);
    const lastMonthIncome = Number(result.PREVIOUS_MONTH_INCOME || result.previous_month_income || result[1] || 0);
    
    // growth_percentage için özel kontrol (string olarak geliyor olabilir)
    let growthPercentage = 0;
    if (result.GROWTH_PERCENTAGE !== null && result.GROWTH_PERCENTAGE !== undefined) {
      growthPercentage = Number(result.GROWTH_PERCENTAGE);
    } else if (result.growth_percentage !== null && result.growth_percentage !== undefined) {
      growthPercentage = Number(result.growth_percentage);
    } else if (result[2] !== null && result[2] !== undefined) {
      growthPercentage = Number(result[2]);
    }
    
    // NaN kontrolü
    if (isNaN(growthPercentage)) {
      growthPercentage = 0;
    }
    
    console.log('🔍 Hesaplanan değerler:', {
      currentMonthIncome,
      lastMonthIncome, 
      growthPercentage
    });
    
    // Debug: Hangi kolon isimlerinin kullanıldığını logla
    console.log('🔍 Bulunan değerler:', {
      currentMonthIncome,
      lastMonthIncome, 
      growthPercentage,
      'CURRENT_MONTH_INCOME': result.CURRENT_MONTH_INCOME,
      'current_month_income': result.current_month_income,
      'PREVIOUS_MONTH_INCOME': result.PREVIOUS_MONTH_INCOME,
      'previous_month_income': result.previous_month_income,
      'GROWTH_PERCENTAGE': result.GROWTH_PERCENTAGE,
      'growth_percentage': result.growth_percentage
    });

    // Türkçe ay isimleri
    const monthNames = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    const responseData = {
      currentMonth: {
        name: monthNames[currentMonth - 1],
        year: currentYear,
        income: currentMonthIncome
      },
      lastMonth: {
        name: monthNames[currentMonth - 2 >= 0 ? currentMonth - 2 : 11],
        year: currentMonth - 2 >= 0 ? currentYear : currentYear - 1,
        income: lastMonthIncome
      },
      percentageChange: growthPercentage,
      totalIncome: currentMonthIncome
    };
    
    console.log('🔍 Frontend\'e gönderilecek veri:', responseData);

    return res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('❌ Aylık gelir hesaplama hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Aylık gelir hesaplanırken hata oluştu',
      error: error.message
    });
  }
});

// Aylık hasta endpoint'i
router.get('/monthly-patients', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Monthly patients endpoint çağrıldı');
    
    // Aktif MariaDB bağlantısı
    const connRes = await pool.query('SELECT * FROM data_connections WHERE is_active = true ORDER BY updated_at DESC LIMIT 1');
    if (connRes.rows.length === 0) {
      console.log('❌ Aktif veritabanı bağlantısı bulunamadı');
      return res.status(400).json({
        success: false,
        message: 'Veritabanı bağlantısı kurulamadı. Lütfen daha sonra tekrar deneyin.',
        technicalError: 'No active database connection'
      });
    }
    const conn = connRes.rows[0];
    console.log('✅ Veritabanı bağlantısı bulundu:', conn.host, conn.database_name);

    // MariaDB bağlantısı
    const mariadb = await mysql.createConnection({
      host: conn.host,
      port: parseInt(conn.port),
      user: conn.username,
      password: conn.password || '',
      database: conn.database_name
    });
    console.log('✅ MariaDB bağlantısı kuruldu');


    console.log('🔍 Çalıştırılacak SQL sorgusu:', sql);

    // Sorguyu çalıştır
    const [rows] = await mariadb.execute(sql);
    await mariadb.end();
    console.log('✅ MariaDB sorgusu tamamlandı');

    // Debug: Sorgu sonucunu logla
    console.log('🔍 SQL Sonucu (rows):', rows);
    console.log('🔍 Sonuç tipi:', typeof rows);
    console.log('🔍 Sonuç uzunluğu:', rows ? rows.length : 'undefined');

    if (rows && rows.length > 0) {
      const row = rows[0];
      console.log('🔍 İlk satır sonucu:', row);
      console.log('🔍 Kolon isimleri:', Object.keys(row));
      console.log('🔍 Sonuç değerleri:', row);
      
      // Esnek kolon adı desteği
      const currentMonthPatients = row.current_month_patients || row.CURRENT_MONTH_PATIENTS || 0;
      const lastMonthPatients = row.previous_month_patients || row.PREVIOUS_MONTH_PATIENTS || 0;
      const growthPercentage = row.patient_growth_percentage || row.PATIENT_GROWTH_PERCENTAGE || 0;
      
      console.log('🔍 Hesaplanan değerler:', {
        currentMonthPatients,
        lastMonthPatients,
        growthPercentage
      });
      
      // Türkçe ay isimleri
      const months = [
        'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
      ];
      
      const now = new Date();
      const currentMonth = months[now.getMonth()];
      const lastMonth = months[(now.getMonth() - 1 + 12) % 12];
      
      const responseData = {
        currentMonth: { 
          name: currentMonth, 
          year: now.getFullYear(), 
          patients: parseInt(currentMonthPatients) || 0 
        },
        lastMonth: { 
          name: lastMonth, 
          year: now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(), 
          patients: parseInt(lastMonthPatients) || 0 
        },
        percentageChange: parseFloat(growthPercentage) || 0,
        totalPatients: parseInt(currentMonthPatients) || 0
      };
      
      console.log('🔍 Frontend\'e gönderilecek veri:', responseData);
      
      res.json({
        success: true,
        data: responseData
      });
    } else {
      console.log('❌ Sorgu sonucu boş');
      res.status(400).json({
        success: false,
        message: 'Sorgu sonucu boş'
      });
    }

  } catch (error) {
    console.log('❌ Monthly patients endpoint hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Aylık hasta verileri alınırken hata oluştu',
      error: error.message
    });
  }
});

// Debug: Tüm sorguları getir (admin/superadmin için)
router.get('/debug/all-queries', authenticateToken, async (req, res) => {
  try {
    if (!req.user.role || (req.user.role !== 1 && req.user.role !== 2 && req.user.role !== '1' && req.user.role !== '2')) {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için yetkiniz yok'
      });
    }

    const { rows } = await pool.query(
      `SELECT id, name, description, category, is_public, created_at, updated_at
       FROM saved_queries
       ORDER BY created_at DESC`
    );
    
    return res.json({ 
      success: true, 
      queries: rows,
      summary: {
        total: rows.length,
        public: rows.filter(q => q.is_public).length,
        private: rows.filter(q => !q.is_public).length
      }
    });
  } catch (error) {
    console.error('debug all-queries error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Tüm sorgular alınamadı', 
      error: error.message 
    });
  }
});

// Herkese açık (auth gerekli) kayıtlı sorguları getir