const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Mock invoices data
const mockInvoices = [
  {
    id: '1',
    invoiceNumber: 'INV001',
    patientId: '1',
    patient: {
      id: '1',
      firstName: 'Ahmet',
      lastName: 'Yılmaz'
    },
    treatmentId: '1',
    treatment: {
      id: '1',
      type: 'FILLING',
      description: 'Diş dolgusu'
    },
    branchId: '1',
    branch: {
      id: '1',
      name: 'Ana Şube',
      code: 'AS'
    },
    amount: 150.00,
    tax: 15.00,
    total: 165.00,
    status: 'PAID',
    paymentMethod: 'CASH',
    dueDate: new Date('2024-01-20'),
    paidDate: new Date('2024-01-10'),
    notes: 'Ödeme alındı',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Tüm faturaları getir
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      status, 
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
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
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
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
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
          },
          treatment: {
            select: {
              id: true,
              name: true,
              type: true
            }
          }
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.invoice.count({ where })
    ]);

    res.json({
      success: true,
      data: invoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Faturalar alınırken hata oluştu'
    });
  }
});

// Tek fatura getir
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            address: true
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
        },
        treatment: {
          select: {
            id: true,
            name: true,
            type: true,
            cost: true,
            notes: true
          }
        }
      }
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Fatura bulunamadı'
      });
    }

    // Yetki kontrolü
    if (req.user.role !== 'SUPER_ADMIN' && req.user.branchId !== invoice.branchId) {
      return res.status(403).json({
        success: false,
        message: 'Bu fatura için yetkiniz bulunmuyor'
      });
    }

    res.json({
      success: true,
      data: invoice
    });

  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Fatura alınırken hata oluştu'
    });
  }
});

// Yeni fatura oluştur
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      patientId,
      doctorId,
      branchId,
      treatmentId,
      amount,
      tax = 0,
      dueDate,
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

    // Tedavi kontrolü
    if (treatmentId) {
      const treatment = await prisma.treatment.findUnique({
        where: { id: treatmentId }
      });

      if (!treatment) {
        return res.status(400).json({
          success: false,
          message: 'Geçersiz tedavi'
        });
      }
    }

    // Fatura numarası oluştur
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    const lastInvoice = await prisma.invoice.findFirst({
      where: {
        invoiceNumber: {
          startsWith: `INV-${year}${month}${day}`
        }
      },
      orderBy: { invoiceNumber: 'desc' }
    });

    let sequence = 1;
    if (lastInvoice) {
      const lastSequence = parseInt(lastInvoice.invoiceNumber.slice(-4));
      sequence = lastSequence + 1;
    }

    const invoiceNumber = `INV-${year}${month}${day}-${String(sequence).padStart(4, '0')}`;

    // Toplam tutarı hesapla
    const total = parseFloat(amount) + parseFloat(tax);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        patientId,
        doctorId,
        branchId: branchId || req.user.branchId,
        treatmentId,
        amount: parseFloat(amount),
        tax: parseFloat(tax),
        total,
        dueDate: new Date(dueDate),
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
        },
        treatment: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      }
    });

    // Activity log
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        branchId: invoice.branchId,
        action: 'CREATE_INVOICE',
        details: `Yeni fatura oluşturuldu: ${invoice.invoiceNumber} - ${invoice.patient.firstName} ${invoice.patient.lastName}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.status(201).json({
      success: true,
      message: 'Fatura başarıyla oluşturuldu',
      data: invoice
    });

  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Fatura oluşturulurken hata oluştu'
    });
  }
});

// Fatura güncelle
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      amount,
      tax,
      status,
      paidDate,
      notes
    } = req.body;

    // Fatura kontrolü
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id }
    });

    if (!existingInvoice) {
      return res.status(404).json({
        success: false,
        message: 'Fatura bulunamadı'
      });
    }

    // Yetki kontrolü
    if (req.user.role !== 'SUPER_ADMIN' && req.user.branchId !== existingInvoice.branchId) {
      return res.status(403).json({
        success: false,
        message: 'Bu fatura için yetkiniz bulunmuyor'
      });
    }

    // Toplam tutarı hesapla
    const newAmount = amount ? parseFloat(amount) : existingInvoice.amount;
    const newTax = tax ? parseFloat(tax) : existingInvoice.tax;
    const total = newAmount + newTax;

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        amount: newAmount,
        tax: newTax,
        total,
        status,
        paidDate: paidDate ? new Date(paidDate) : undefined,
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
        },
        treatment: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      }
    });

    // Activity log
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        branchId: invoice.branchId,
        action: 'UPDATE_INVOICE',
        details: `Fatura güncellendi: ${invoice.invoiceNumber} - ${invoice.patient.firstName} ${invoice.patient.lastName}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json({
      success: true,
      message: 'Fatura başarıyla güncellendi',
      data: invoice
    });

  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Fatura güncellenirken hata oluştu'
    });
  }
});

// Fatura sil
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Fatura kontrolü
    const invoice = await prisma.invoice.findUnique({
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

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Fatura bulunamadı'
      });
    }

    // Yetki kontrolü
    if (req.user.role !== 'SUPER_ADMIN' && req.user.branchId !== invoice.branchId) {
      return res.status(403).json({
        success: false,
        message: 'Bu fatura için yetkiniz bulunmuyor'
      });
    }

    // Ödenmiş fatura silinemez
    if (invoice.status === 'PAID') {
      return res.status(400).json({
        success: false,
        message: 'Ödenmiş fatura silinemez'
      });
    }

    await prisma.invoice.delete({
      where: { id }
    });

    // Activity log
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        branchId: invoice.branchId,
        action: 'DELETE_INVOICE',
        details: `Fatura silindi: ${invoice.invoiceNumber} - ${invoice.patient.firstName} ${invoice.patient.lastName}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json({
      success: true,
      message: 'Fatura başarıyla silindi'
    });

  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Fatura silinirken hata oluştu'
    });
  }
});

module.exports = router; 