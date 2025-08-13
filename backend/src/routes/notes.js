const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Mock notes data
const mockNotes = [
  {
    id: '1',
    title: 'Hasta Notu',
    content: 'Hasta tedavi sürecinde iyi ilerliyor',
    type: 'PATIENT_NOTE',
    priority: 'MEDIUM',
    status: 'ACTIVE',
    tags: '["tedavi", "ilerleme"]',
    authorId: '1',
    author: {
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
    patientId: '1',
    patient: {
      id: '1',
      firstName: 'Ahmet',
      lastName: 'Yılmaz'
    },
    treatmentId: null,
    appointmentId: null,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Tüm notları getir
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      type, 
      priority,
      status,
      doctorId,
      patientId,
      branchId
    } = req.query;
    const skip = (page - 1) * limit;

    // Filtreleme koşulları
    const where = {};
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (type) {
      where.type = type;
    }

    if (priority) {
      where.priority = priority;
    }

    if (status) {
      where.status = status;
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

    const [notes, total] = await Promise.all([
      prisma.note.findMany({
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
      prisma.note.count({ where })
    ]);

    res.json({
      success: true,
      data: notes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({
      success: false,
      message: 'Notlar alınırken hata oluştu'
    });
  }
});

// Tek not getir
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const note = await prisma.note.findUnique({
      where: { id },
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
        }
      }
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Not bulunamadı'
      });
    }

    // Yetki kontrolü
    if (req.user.role !== 'SUPER_ADMIN' && req.user.branchId !== note.branchId) {
      return res.status(403).json({
        success: false,
        message: 'Bu not için yetkiniz bulunmuyor'
      });
    }

    res.json({
      success: true,
      data: note
    });

  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({
      success: false,
      message: 'Not alınırken hata oluştu'
    });
  }
});

// Yeni not oluştur
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      patientId,
      branchId,
      type,
      category,
      title,
      content,
      tags,
      priority = 'MEDIUM',
      status = 'ACTIVE'
    } = req.body;

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

    const note = await prisma.note.create({
      data: {
        patientId,
        doctorId: req.user.id,
        branchId: branchId || req.user.branchId,
        type,
        category,
        title,
        content,
        tags: tags || [],
        priority,
        status
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
        branchId: note.branchId,
        action: 'CREATE_NOTE',
        details: `Yeni not oluşturuldu: ${note.title}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.status(201).json({
      success: true,
      message: 'Not başarıyla oluşturuldu',
      data: note
    });

  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({
      success: false,
      message: 'Not oluşturulurken hata oluştu'
    });
  }
});

// Not güncelle
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      type,
      category,
      title,
      content,
      tags,
      priority,
      status
    } = req.body;

    // Not kontrolü
    const existingNote = await prisma.note.findUnique({
      where: { id }
    });

    if (!existingNote) {
      return res.status(404).json({
        success: false,
        message: 'Not bulunamadı'
      });
    }

    // Yetki kontrolü
    if (req.user.role !== 'SUPER_ADMIN' && req.user.branchId !== existingNote.branchId) {
      return res.status(403).json({
        success: false,
        message: 'Bu not için yetkiniz bulunmuyor'
      });
    }

    // Sadece not sahibi veya super admin düzenleyebilir
    if (req.user.role !== 'SUPER_ADMIN' && req.user.id !== existingNote.doctorId) {
      return res.status(403).json({
        success: false,
        message: 'Bu notu düzenleme yetkiniz bulunmuyor'
      });
    }

    const note = await prisma.note.update({
      where: { id },
      data: {
        type,
        category,
        title,
        content,
        tags,
        priority,
        status
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
        branchId: note.branchId,
        action: 'UPDATE_NOTE',
        details: `Not güncellendi: ${note.title}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json({
      success: true,
      message: 'Not başarıyla güncellendi',
      data: note
    });

  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({
      success: false,
      message: 'Not güncellenirken hata oluştu'
    });
  }
});

// Not sil
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Not kontrolü
    const note = await prisma.note.findUnique({
      where: { id }
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Not bulunamadı'
      });
    }

    // Yetki kontrolü
    if (req.user.role !== 'SUPER_ADMIN' && req.user.branchId !== note.branchId) {
      return res.status(403).json({
        success: false,
        message: 'Bu not için yetkiniz bulunmuyor'
      });
    }

    // Sadece not sahibi veya super admin silebilir
    if (req.user.role !== 'SUPER_ADMIN' && req.user.id !== note.doctorId) {
      return res.status(403).json({
        success: false,
        message: 'Bu notu silme yetkiniz bulunmuyor'
      });
    }

    await prisma.note.delete({
      where: { id }
    });

    // Activity log
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        branchId: note.branchId,
        action: 'DELETE_NOTE',
        details: `Not silindi: ${note.title}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json({
      success: true,
      message: 'Not başarıyla silindi'
    });

  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({
      success: false,
      message: 'Not silinirken hata oluştu'
    });
  }
});

module.exports = router; 