const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Tüm hastaları getir
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      status, 
      gender, 
      branchId 
    } = req.query;
    const skip = (page - 1) * limit;

    // Filtreleme koşulları
    const where = {};
    
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (status) {
      where.status = status;
    }

    if (gender) {
      where.gender = gender;
    }

    // Şube filtresi
    if (branchId) {
      where.branchId = branchId;
    } else if (req.user.role !== 'SUPER_ADMIN') {
      // Super admin değilse sadece kendi şubesini görebilir
      where.branchId = req.user.branchId;
    }

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        include: {
          branch: {
            select: {
              id: true,
              name: true,
              code: true
            }
          },
          assignedDoctor: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          _count: {
            select: {
              appointments: true,
              treatments: true,
              invoices: true
            }
          }
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.patient.count({ where })
    ]);

    res.json({
      success: true,
      data: patients,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({
      success: false,
      message: 'Hastalar alınırken hata oluştu'
    });
  }
});

// Tek hasta getir
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        assignedDoctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        appointments: {
          include: {
            doctor: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { date: 'desc' },
          take: 10
        },
        treatments: {
          include: {
            doctor: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        notes: {
          include: {
            doctor: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Hasta bulunamadı'
      });
    }

    // Yetki kontrolü
    if (req.user.role !== 'SUPER_ADMIN' && req.user.branchId !== patient.branchId) {
      return res.status(403).json({
        success: false,
        message: 'Bu hasta için yetkiniz bulunmuyor'
      });
    }

    res.json({
      success: true,
      data: patient
    });

  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({
      success: false,
      message: 'Hasta alınırken hata oluştu'
    });
  }
});

// Yeni hasta oluştur
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      address,
      emergencyContact,
      emergencyPhone,
      medicalHistory,
      allergies,
      notes,
      assignedDoctorId,
      branchId
    } = req.body;

    // Telefon kontrolü
    const existingPatient = await prisma.patient.findFirst({
      where: { phone }
    });

    if (existingPatient) {
      return res.status(400).json({
        success: false,
        message: 'Bu telefon numarası zaten kayıtlı'
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

    // Doktor kontrolü
    if (assignedDoctorId) {
      const doctor = await prisma.user.findUnique({
        where: { id: assignedDoctorId }
      });

      if (!doctor || doctor.role !== 'DOCTOR') {
        return res.status(400).json({
          success: false,
          message: 'Geçersiz doktor'
        });
      }
    }

    const patient = await prisma.patient.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender,
        address,
        emergencyContact,
        emergencyPhone,
        medicalHistory,
        allergies,
        notes,
        assignedDoctorId,
        branchId: branchId || req.user.branchId
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        assignedDoctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Activity log
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        branchId: patient.branchId,
        action: 'CREATE_PATIENT',
        details: `Yeni hasta oluşturuldu: ${patient.firstName} ${patient.lastName}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.status(201).json({
      success: true,
      message: 'Hasta başarıyla oluşturuldu',
      data: patient
    });

  } catch (error) {
    console.error('Create patient error:', error);
    res.status(500).json({
      success: false,
      message: 'Hasta oluşturulurken hata oluştu'
    });
  }
});

// Hasta güncelle
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      address,
      emergencyContact,
      emergencyPhone,
      medicalHistory,
      allergies,
      notes,
      assignedDoctorId,
      status
    } = req.body;

    // Hasta kontrolü
    const existingPatient = await prisma.patient.findUnique({
      where: { id }
    });

    if (!existingPatient) {
      return res.status(404).json({
        success: false,
        message: 'Hasta bulunamadı'
      });
    }

    // Yetki kontrolü
    if (req.user.role !== 'SUPER_ADMIN' && req.user.branchId !== existingPatient.branchId) {
      return res.status(403).json({
        success: false,
        message: 'Bu hasta için yetkiniz bulunmuyor'
      });
    }

    // Telefon kontrolü (kendi telefonu hariç)
    if (phone && phone !== existingPatient.phone) {
      const phoneExists = await prisma.patient.findFirst({
        where: { 
          phone,
          id: { not: id }
        }
      });

      if (phoneExists) {
        return res.status(400).json({
          success: false,
          message: 'Bu telefon numarası başka bir hasta tarafından kullanılıyor'
        });
      }
    }

    // Doktor kontrolü
    if (assignedDoctorId) {
      const doctor = await prisma.user.findUnique({
        where: { id: assignedDoctorId }
      });

      if (!doctor || doctor.role !== 'DOCTOR') {
        return res.status(400).json({
          success: false,
          message: 'Geçersiz doktor'
        });
      }
    }

    const patient = await prisma.patient.update({
      where: { id },
      data: {
        firstName,
        lastName,
        email,
        phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender,
        address,
        emergencyContact,
        emergencyPhone,
        medicalHistory,
        allergies,
        notes,
        assignedDoctorId,
        status
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        assignedDoctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Activity log
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        branchId: patient.branchId,
        action: 'UPDATE_PATIENT',
        details: `Hasta güncellendi: ${patient.firstName} ${patient.lastName}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json({
      success: true,
      message: 'Hasta başarıyla güncellendi',
      data: patient
    });

  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({
      success: false,
      message: 'Hasta güncellenirken hata oluştu'
    });
  }
});

// Hasta sil
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Hasta kontrolü
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            appointments: true,
            treatments: true,
            invoices: true
          }
        }
      }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Hasta bulunamadı'
      });
    }

    // Yetki kontrolü
    if (req.user.role !== 'SUPER_ADMIN' && req.user.branchId !== patient.branchId) {
      return res.status(403).json({
        success: false,
        message: 'Bu hasta için yetkiniz bulunmuyor'
      });
    }

    // Hasta verisi varsa silmeyi engelle
    if (patient._count.appointments > 0 || patient._count.treatments > 0 || patient._count.invoices > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu hastanın verisi bulunduğu için silinemez. Önce verileri arşivleyin.'
      });
    }

    await prisma.patient.delete({
      where: { id }
    });

    // Activity log
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        branchId: patient.branchId,
        action: 'DELETE_PATIENT',
        details: `Hasta silindi: ${patient.firstName} ${patient.lastName}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json({
      success: true,
      message: 'Hasta başarıyla silindi'
    });

  } catch (error) {
    console.error('Delete patient error:', error);
    res.status(500).json({
      success: false,
      message: 'Hasta silinirken hata oluştu'
    });
  }
});

module.exports = router; 