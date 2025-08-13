const jwt = require('jsonwebtoken');

// Mock user data - gerçek uygulamada veritabanından gelecek
const mockUsers = {
  'mock-user-id': {
    id: 'mock-user-id',
    email: 'admin@example.com',
    role: 'SUPER_ADMIN',
    branchId: 'mock-branch-id',
    isActive: true,
    branch: {
      id: 'mock-branch-id',
      name: 'Ana Şube'
    },
    managedBranch: null
  }
};

// JWT token doğrulama middleware'i
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Erişim token\'ı gerekli'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    // Mock kullanıcı kontrolü
    const user = mockUsers[decoded.userId] || mockUsers['mock-user-id'];

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Geçersiz veya pasif kullanıcı'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(403).json({
      success: false,
      message: 'Geçersiz token'
    });
  }
};

// Rol bazlı yetkilendirme middleware'i
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimlik doğrulaması gerekli'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için yetkiniz bulunmuyor'
      });
    }

    next();
  };
};

// Şube bazlı yetkilendirme middleware'i
const authorizeBranch = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Kullanıcı kimlik doğrulaması gerekli'
    });
  }

  // Super admin tüm şubelere erişebilir
  if (req.user.role === 'SUPER_ADMIN') {
    return next();
  }

  // Branch manager sadece kendi şubesine erişebilir
  if (req.user.role === 'BRANCH_MANAGER') {
    const requestedBranchId = req.params.branchId || req.body.branchId;
    if (req.user.managedBranch?.id !== requestedBranchId) {
      return res.status(403).json({
        success: false,
        message: 'Bu şube için yetkiniz bulunmuyor'
      });
    }
  }

  // Diğer kullanıcılar sadece kendi şubelerine erişebilir
  const requestedBranchId = req.params.branchId || req.body.branchId;
  if (req.user.branchId !== requestedBranchId) {
    return res.status(403).json({
      success: false,
      message: 'Bu şube için yetkiniz bulunmuyor'
    });
  }

  next();
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  authorizeBranch
}; 