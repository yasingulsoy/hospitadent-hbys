const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Mock patients data
const mockPatients = [
  {
    id: '1',
    fileNumber: 'P001',
    firstName: 'Ahmet',
    lastName: 'Yılmaz',
    gender: 'MALE',
    birthDate: new Date('1990-05-15'),
    phone: '5551234567',
    email: 'ahmet@example.com',
    address: 'İstanbul, Türkiye',
    emergencyContact: 'Fatma Yılmaz',
    emergencyPhone: '5559876543',
    medicalHistory: 'Alerji yok',
    allergies: 'Yok',
    insurance: 'SGK',
    branchId: '1',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    branch: {
      id: '1',
      name: 'Ana Şube',
      code: 'AS'
    },
    assignedDoctor: {
      id: '1',
      firstName: 'Dr. Mehmet',
      lastName: 'Kaya'
    },
    _count: {
      appointments: 5,
      treatments: 3,
      invoices: 2
    }
  }
];

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

    // Filtreleme
    let filteredPatients = mockPatients.filter(patient => {
      if (branchId && patient.branchId !== branchId) return false;
      if (req.user.role !== 'SUPER_ADMIN' && patient.branchId !== req.user.branchId) return false;
      if (status && patient.isActive !== (status === 'ACTIVE')) return false;
      if (gender && patient.gender !== gender) return false;
      if (search) {
        const searchLower = search.toLowerCase();
        return patient.firstName.toLowerCase().includes(searchLower) ||
               patient.lastName.toLowerCase().includes(searchLower) ||
               patient.email?.toLowerCase().includes(searchLower) ||
               patient.phone.includes(search);
      }
      return true;
    });

    const total = filteredPatients.length;
    const patients = filteredPatients.slice(skip, skip + parseInt(limit));

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

    const patient = mockPatients.find(p => p.id === id);

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
    const existingPatient = mockPatients.find(p => p.phone === phone);

    if (existingPatient) {
      return res.status(400).json({
        success: false,
        message: 'Bu telefon numarası zaten kayıtlı'
      });
    }

    // Şube kontrolü
    const branch = mockPatients.find(p => p.branchId === branchId || p.branchId === req.user.branchId);

    if (!branch) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz şube'
      });
    }

    // Doktor kontrolü
    if (assignedDoctorId) {
      const doctor = mockPatients.find(p => p.id === assignedDoctorId);

      if (!doctor || doctor.role !== 'DOCTOR') {
        return res.status(400).json({
          success: false,
          message: 'Geçersiz doktor'
        });
      }
    }

    const newPatient = {
      id: (mockPatients.length + 1).toString(),
      fileNumber: `P${(mockPatients.length + 1).toString().padStart(3, '0')}`,
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
      branchId: branchId || req.user.branchId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      branch: {
        id: branchId || req.user.branchId,
        name: 'Ana Şube', // Mock data, should be fetched from DB
        code: 'AS' // Mock data, should be fetched from DB
      },
      assignedDoctor: {
        id: assignedDoctorId,
        firstName: 'Dr. Mehmet', // Mock data, should be fetched from DB
        lastName: 'Kaya' // Mock data, should be fetched from DB
      },
      _count: {
        appointments: 0,
        treatments: 0,
        invoices: 0
      }
    };

    mockPatients.push(newPatient);

    // Activity log
    // This part would require a PrismaClient instance and a mockActivityLogs array
    // For now, we'll just log to console
    console.log(`Activity Log: User ${req.user.id} created patient ${newPatient.firstName} ${newPatient.lastName}`);

    res.status(201).json({
      success: true,
      message: 'Hasta başarıyla oluşturuldu',
      data: newPatient
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
    const existingPatient = mockPatients.find(p => p.id === id);

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
      const phoneExists = mockPatients.find(p => p.phone === phone && p.id !== id);

      if (phoneExists) {
        return res.status(400).json({
          success: false,
          message: 'Bu telefon numarası başka bir hasta tarafından kullanılıyor'
        });
      }
    }

    // Doktor kontrolü
    if (assignedDoctorId) {
      const doctor = mockPatients.find(p => p.id === assignedDoctorId);

      if (!doctor || doctor.role !== 'DOCTOR') {
        return res.status(400).json({
          success: false,
          message: 'Geçersiz doktor'
        });
      }
    }

    const updatedPatient = {
      ...existingPatient,
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
      status,
      updatedAt: new Date()
    };

    // Activity log
    // This part would require a PrismaClient instance and a mockActivityLogs array
    // For now, we'll just log to console
    console.log(`Activity Log: User ${req.user.id} updated patient ${updatedPatient.firstName} ${updatedPatient.lastName}`);

    res.json({
      success: true,
      message: 'Hasta başarıyla güncellendi',
      data: updatedPatient
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
    const patient = mockPatients.find(p => p.id === id);

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

    mockPatients = mockPatients.filter(p => p.id !== id);

    // Activity log
    // This part would require a PrismaClient instance and a mockActivityLogs array
    // For now, we'll just log to console
    console.log(`Activity Log: User ${req.user.id} deleted patient ${patient.firstName} ${patient.lastName}`);

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