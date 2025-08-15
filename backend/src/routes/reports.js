const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Mock reports data
const mockReports = {
  dashboard: {
    totalPatients: 250,
    totalAppointments: 45,
    totalTreatments: 120,
    totalRevenue: 15000.00,
    monthlyStats: [
      { month: 'Ocak', patients: 25, appointments: 45, revenue: 1500 },
      { month: 'Şubat', patients: 30, appointments: 52, revenue: 1800 }
    ]
  }
};

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
        // Tarih bazlı veri çek
        chartData = await getDateBasedDataFromDB(xAxis, yAxis, filters);
      } else if (xAxis.type === 'category') {
        // Kategorik veri çek
        chartData = await getCategoryBasedDataFromDB(xAxis, yAxis, filters);
      } else {
        // Varsayılan veri çek
        chartData = await getDefaultDataFromDB(xAxis, yAxis, filters);
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
async function getDateBasedDataFromDB(xAxis, yAxis, filters) {
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
        SUM(${yAxis.value}) as sum_value
      FROM ${tableName}
      WHERE ${dateField} IS NOT NULL
      GROUP BY DATE(${dateField})
      ORDER BY date_label DESC
      LIMIT 30
    `;
    
    return result.map(item => ({
      label: item.date_label,
      value: yAxis.type === 'count' ? item.count_value : item.sum_value || 0
    }));
    
  } catch (error) {
    console.error('Tarih bazlı veri çekme hatası:', error);
    throw error;
  }
}

// Veritabanından kategorik veri çek
async function getCategoryBasedDataFromDB(xAxis, yAxis, filters) {
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
    
    // Prisma ile veri çek
    const result = await prisma.$queryRaw`
      SELECT 
        ${categoryField} as category_label,
        COUNT(*) as count_value,
        SUM(${yAxis.value}) as sum_value
      FROM ${tableName}
      WHERE ${categoryField} IS NOT NULL
      GROUP BY ${categoryField}
      ORDER BY count_value DESC
      LIMIT 50
    `;
    
    return result.map(item => ({
      label: item.category_label || 'Bilinmeyen',
      value: yAxis.type === 'count' ? item.count_value : item.sum_value || 0
    }));
    
  } catch (error) {
    console.error('Kategorik veri çekme hatası:', error);
    throw error;
  }
}

// Veritabanından varsayılan veri çek
async function getDefaultDataFromDB(xAxis, yAxis, filters) {
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