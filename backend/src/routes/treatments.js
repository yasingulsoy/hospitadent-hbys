const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Mock treatments data
const mockTreatments = [
  {
    id: '1',
    patientId: '1',
    patient: {
      id: '1',
      firstName: 'Ahmet',
      lastName: 'Yılmaz'
    },
    doctorId: '1',
    doctor: {
      id: '1',
      firstName: 'Dr. Mehmet',
      lastName: 'Kaya'
    },
    branchId: '1',
    branch: {
      id: '1',
      name: 'Ana Şube',
      code: 'AS'
    },
    type: 'FILLING',
    description: 'Diş dolgusu yapıldı',
    cost: 150.00,
    status: 'COMPLETED',
    startDate: new Date('2024-01-10'),
    endDate: new Date('2024-01-10'),
    notes: 'Hasta memnun kaldı',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Tüm tedavileri getir
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      status, 
      type, 
      doctorId,
      patientId,
      branchId
    } = req.query;
    const skip = (page - 1) * limit;

    // Filtreleme koşulları
    const where = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        {
          patient: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } }
            ]
          }
        }
      ];
    }

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    if (doctorId) {
      where.doctorId = doctorId;
    }

    if (patientId) {
      where.patientId = patientId;
    }

    if (branchId) {
      where.branchId = branchId;
    } else if (req.user.role !== 'SUPER_ADMIN') {
      where.branchId = req.user.branchId;
    }

    const [treatments, total] = await Promise.all([
      prisma.treatment.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true
            }
          },
          doctor: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          branch: {
            select: {
              id: true,
              name: true,
              code: true
            }
          }
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.treatment.count({ where })
    ]);

    res.json({
      success: true,
      data: treatments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get treatments error:', error);
    res.status(500).json({
      success: false,
      message: 'Tedaviler alınırken hata oluştu'
    });
  }
});

// Tek tedavi getir
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const treatment = await prisma.treatment.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            medicalHistory: true,
            allergies: true
          }
        },
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            total: true,
            status: true,
            createdAt: true
          }
        }
      }
    });

    if (!treatment) {
      return res.status(404).json({
        success: false,
        message: 'Tedavi bulunamadı'
      });
    }

    // Yetki kontrolü
    if (req.user.role !== 'SUPER_ADMIN' && req.user.branchId !== treatment.branchId) {
      return res.status(403).json({
        success: false,
        message: 'Bu tedavi için yetkiniz bulunmuyor'
      });
    }

    res.json({
      success: true,
      data: treatment
    });

  } catch (error) {
    console.error('Get treatment error:', error);
    res.status(500).json({
      success: false,
      message: 'Tedavi alınırken hata oluştu'
    });
  }
});

// Yeni tedavi oluştur
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      patientId,
      doctorId,
      branchId,
      name,
      type,
      startDate,
      endDate,
      cost,
      notes
    } = req.body;

    // Hasta kontrolü
    const patient = await prisma.patient.findUnique({
      where: { id: patientId }
    });

    if (!patient) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz hasta'
      });
    }

    // Doktor kontrolü
    const doctor = await prisma.user.findUnique({
      where: { id: doctorId }
    });

    if (!doctor || doctor.role !== 'DOCTOR') {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz doktor'
      });
    }

    // Şube kontrolü
    const branch = await prisma.branch.findUnique({
      where: { id: branchId || req.user.branchId }
    });

    if (!branch) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz şube'
      });
    }

    // Yetki kontrolü
    if (req.user.role !== 'SUPER_ADMIN' && req.user.branchId !== (branchId || req.user.branchId)) {
      return res.status(403).json({
        success: false,
        message: 'Bu şube için yetkiniz bulunmuyor'
      });
    }

    const treatment = await prisma.treatment.create({
      data: {
        patientId,
        doctorId,
        branchId: branchId || req.user.branchId,
        name,
        type,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        cost: parseFloat(cost),
        notes
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true
          }
        },
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });

    // Activity log
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        branchId: treatment.branchId,
        action: 'CREATE_TREATMENT',
        details: `Yeni tedavi oluşturuldu: ${treatment.name} - ${treatment.patient.firstName} ${treatment.patient.lastName}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.status(201).json({
      success: true,
      message: 'Tedavi başarıyla oluşturuldu',
      data: treatment
    });

  } catch (error) {
    console.error('Create treatment error:', error);
    res.status(500).json({
      success: false,
      message: 'Tedavi oluşturulurken hata oluştu'
    });
  }
});

// Tedavi güncelle
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      type,
      startDate,
      endDate,
      cost,
      status,
      notes
    } = req.body;

    // Tedavi kontrolü
    const existingTreatment = await prisma.treatment.findUnique({
      where: { id }
    });

    if (!existingTreatment) {
      return res.status(404).json({
        success: false,
        message: 'Tedavi bulunamadı'
      });
    }

    // Yetki kontrolü
    if (req.user.role !== 'SUPER_ADMIN' && req.user.branchId !== existingTreatment.branchId) {
      return res.status(403).json({
        success: false,
        message: 'Bu tedavi için yetkiniz bulunmuyor'
      });
    }

    const treatment = await prisma.treatment.update({
      where: { id },
      data: {
        name,
        type,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        cost: cost ? parseFloat(cost) : undefined,
        status,
        notes
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true
          }
        },
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });

    // Activity log
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        branchId: treatment.branchId,
        action: 'UPDATE_TREATMENT',
        details: `Tedavi güncellendi: ${treatment.name} - ${treatment.patient.firstName} ${treatment.patient.lastName}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json({
      success: true,
      message: 'Tedavi başarıyla güncellendi',
      data: treatment
    });

  } catch (error) {
    console.error('Update treatment error:', error);
    res.status(500).json({
      success: false,
      message: 'Tedavi güncellenirken hata oluştu'
    });
  }
});

// Tedavi sil
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Tedavi kontrolü
    const treatment = await prisma.treatment.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        _count: {
          select: {
            invoices: true
          }
        }
      }
    });

    if (!treatment) {
      return res.status(404).json({
        success: false,
        message: 'Tedavi bulunamadı'
      });
    }

    // Yetki kontrolü
    if (req.user.role !== 'SUPER_ADMIN' && req.user.branchId !== treatment.branchId) {
      return res.status(403).json({
        success: false,
        message: 'Bu tedavi için yetkiniz bulunmuyor'
      });
    }

    // Fatura varsa silmeyi engelle
    if (treatment._count.invoices > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu tedavinin faturası bulunduğu için silinemez'
      });
    }

    await prisma.treatment.delete({
      where: { id }
    });

    // Activity log
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        branchId: treatment.branchId,
        action: 'DELETE_TREATMENT',
        details: `Tedavi silindi: ${treatment.name} - ${treatment.patient.firstName} ${treatment.patient.lastName}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json({
      success: true,
      message: 'Tedavi başarıyla silindi'
    });

  } catch (error) {
    console.error('Delete treatment error:', error);
    res.status(500).json({
      success: false,
      message: 'Tedavi silinirken hata oluştu'
    });
  }
});

module.exports = router; 