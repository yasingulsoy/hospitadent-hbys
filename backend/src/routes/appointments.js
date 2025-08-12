const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Tüm randevuları getir
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
      branchId,
      startDate,
      endDate
    } = req.query;
    const skip = (page - 1) * limit;

    // Filtreleme koşulları
    const where = {};
    
    if (search) {
      where.OR = [
        {
          patient: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } }
            ]
          }
        },
        {
          doctor: {
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

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true
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
        orderBy: { date: 'asc' }
      }),
      prisma.appointment.count({ where })
    ]);

    res.json({
      success: true,
      data: appointments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Randevular alınırken hata oluştu'
    });
  }
});

// Tek randevu getir
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            dateOfBirth: true,
            gender: true,
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
            code: true,
            address: true,
            phone: true
          }
        }
      }
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Randevu bulunamadı'
      });
    }

    // Yetki kontrolü
    if (req.user.role !== 'SUPER_ADMIN' && req.user.branchId !== appointment.branchId) {
      return res.status(403).json({
        success: false,
        message: 'Bu randevu için yetkiniz bulunmuyor'
      });
    }

    res.json({
      success: true,
      data: appointment
    });

  } catch (error) {
    console.error('Get appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Randevu alınırken hata oluştu'
    });
  }
});

// Yeni randevu oluştur
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      patientId,
      doctorId,
      branchId,
      date,
      duration = 30,
      type,
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

    // Çakışma kontrolü
    const appointmentDate = new Date(date);
    const endTime = new Date(appointmentDate.getTime() + duration * 60000);

    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        doctorId,
        date: {
          gte: appointmentDate,
          lt: endTime
        },
        status: {
          notIn: ['CANCELLED', 'NO_SHOW']
        }
      }
    });

    if (conflictingAppointment) {
      return res.status(400).json({
        success: false,
        message: 'Bu saatte doktorun başka bir randevusu bulunuyor'
      });
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        doctorId,
        branchId: branchId || req.user.branchId,
        date: appointmentDate,
        duration,
        type,
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
        branchId: appointment.branchId,
        action: 'CREATE_APPOINTMENT',
        details: `Yeni randevu oluşturuldu: ${appointment.patient.firstName} ${appointment.patient.lastName}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.status(201).json({
      success: true,
      message: 'Randevu başarıyla oluşturuldu',
      data: appointment
    });

  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Randevu oluşturulurken hata oluştu'
    });
  }
});

// Randevu güncelle
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      patientId,
      doctorId,
      date,
      duration,
      type,
      status,
      notes
    } = req.body;

    // Randevu kontrolü
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id }
    });

    if (!existingAppointment) {
      return res.status(404).json({
        success: false,
        message: 'Randevu bulunamadı'
      });
    }

    // Yetki kontrolü
    if (req.user.role !== 'SUPER_ADMIN' && req.user.branchId !== existingAppointment.branchId) {
      return res.status(403).json({
        success: false,
        message: 'Bu randevu için yetkiniz bulunmuyor'
      });
    }

    // Hasta kontrolü
    if (patientId) {
      const patient = await prisma.patient.findUnique({
        where: { id: patientId }
      });

      if (!patient) {
        return res.status(400).json({
          success: false,
          message: 'Geçersiz hasta'
        });
      }
    }

    // Doktor kontrolü
    if (doctorId) {
      const doctor = await prisma.user.findUnique({
        where: { id: doctorId }
      });

      if (!doctor || doctor.role !== 'DOCTOR') {
        return res.status(400).json({
          success: false,
          message: 'Geçersiz doktor'
        });
      }
    }

    // Çakışma kontrolü (kendi randevusu hariç)
    if (date && (doctorId || existingAppointment.doctorId)) {
      const appointmentDate = new Date(date);
      const endTime = new Date(appointmentDate.getTime() + (duration || existingAppointment.duration) * 60000);

      const conflictingAppointment = await prisma.appointment.findFirst({
        where: {
          id: { not: id },
          doctorId: doctorId || existingAppointment.doctorId,
          date: {
            gte: appointmentDate,
            lt: endTime
          },
          status: {
            notIn: ['CANCELLED', 'NO_SHOW']
          }
        }
      });

      if (conflictingAppointment) {
        return res.status(400).json({
          success: false,
          message: 'Bu saatte doktorun başka bir randevusu bulunuyor'
        });
      }
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        patientId,
        doctorId,
        date: date ? new Date(date) : undefined,
        duration,
        type,
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
        branchId: appointment.branchId,
        action: 'UPDATE_APPOINTMENT',
        details: `Randevu güncellendi: ${appointment.patient.firstName} ${appointment.patient.lastName}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json({
      success: true,
      message: 'Randevu başarıyla güncellendi',
      data: appointment
    });

  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Randevu güncellenirken hata oluştu'
    });
  }
});

// Randevu sil
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Randevu kontrolü
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Randevu bulunamadı'
      });
    }

    // Yetki kontrolü
    if (req.user.role !== 'SUPER_ADMIN' && req.user.branchId !== appointment.branchId) {
      return res.status(403).json({
        success: false,
        message: 'Bu randevu için yetkiniz bulunmuyor'
      });
    }

    await prisma.appointment.delete({
      where: { id }
    });

    // Activity log
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        branchId: appointment.branchId,
        action: 'DELETE_APPOINTMENT',
        details: `Randevu silindi: ${appointment.patient.firstName} ${appointment.patient.lastName}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json({
      success: true,
      message: 'Randevu başarıyla silindi'
    });

  } catch (error) {
    console.error('Delete appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Randevu silinirken hata oluştu'
    });
  }
});

module.exports = router; 