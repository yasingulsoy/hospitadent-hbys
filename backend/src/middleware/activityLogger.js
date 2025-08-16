const pool = require('../config/database');
const jwt = require('jsonwebtoken');

const logActivity = async (req, res, next) => {
  // Test log - middleware çalışıyor mu kontrol et
  console.log(`🔍 ActivityLogger: ${req.method} ${req.path}`);
  
  // JWT token'dan kullanıcı bilgisini al
  let currentUser = null;
  
  // Frontend'den gelen Authorization header'ı kontrol et
  const authHeader = req.headers['authorization'];
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const cookieToken = req.cookies?.token;
  const token = bearerToken || cookieToken;
  if (token) {
    try {
      // JWT token'dan kullanıcı bilgisini çıkar
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      currentUser = {
        id: decoded.id,
        username: decoded.username,
        email: decoded.email,
        role: decoded.role
      };
      console.log('✅ User from JWT token:', currentUser.username);
    } catch (e) {
      console.log('❌ JWT token parse hatası:', e.message);
    }
  }
  
  // Kullanıcı bulunamadı
  if (!currentUser) {
    console.log('❌ No user found in JWT token');
    return next();
  }
  
  // Role kontrolü
  const userRole = currentUser.role;
  const isAdmin = userRole === 1 || userRole === '1' || userRole === 'ADMIN';
  const isSuperAdmin = userRole === 2 || userRole === '2' || userRole === 'SUPER_ADMIN';
  
  if (!isAdmin && !isSuperAdmin) {
    console.log('❌ User role not authorized:', userRole);
    return next();
  }
  
  console.log('✅ User authorized, proceeding with logging');
  
  // req.user'ı set et (sonraki middleware'ler için)
  req.user = currentUser;

  const originalSend = res.send;
  
  res.send = function(data) {
    // Kullanıcı aktivitesini detaylı logla
    if (req.user) {
      // Request body'den önemli bilgileri çıkar
      let actionDetails = '';
      let additionalInfo = {};
      
      // HTTP Method ve Path
      const httpMethod = req.method;
      const requestPath = req.path;
      const fullUrl = req.originalUrl;
      
      // Action tipini belirle
      let actionType = 'PAGE_VISIT';
      let actionDescription = '';
      
      // API endpoint'lere göre detaylı action belirle
      if (requestPath.startsWith('/api/users')) {
        if (httpMethod === 'POST') {
          actionType = 'USER_CREATED';
          actionDescription = 'Yeni kullanıcı oluşturuldu';
          if (req.body.username) {
            additionalInfo.newUser = req.body.username;
            additionalInfo.userRole = req.body.role;
            additionalInfo.userBranch = req.body.branch_id;
          }
        } else if (httpMethod === 'PUT') {
          actionType = 'USER_UPDATED';
          actionDescription = 'Kullanıcı bilgileri güncellendi';
          additionalInfo.updatedUser = req.body.username || 'Bilinmeyen';
        } else if (httpMethod === 'DELETE') {
          actionType = 'USER_DELETED';
          actionDescription = 'Kullanıcı silindi';
          additionalInfo.deletedUserId = req.params.id;
        }
      } else if (requestPath.startsWith('/api/patients')) {
        if (httpMethod === 'POST') {
          actionType = 'PATIENT_CREATED';
          actionDescription = 'Yeni hasta kaydı oluşturuldu';
          if (req.body.name) {
            additionalInfo.patientName = req.body.name;
            additionalInfo.patientPhone = req.body.phone;
          }
        } else if (httpMethod === 'PUT') {
          actionType = 'PATIENT_UPDATED';
          actionDescription = 'Hasta bilgileri güncellendi';
        }
      } else if (requestPath.startsWith('/api/appointments')) {
        if (httpMethod === 'POST') {
          actionType = 'APPOINTMENT_CREATED';
          actionDescription = 'Yeni randevu oluşturuldu';
          if (req.body.patient_id) {
            additionalInfo.patientId = req.body.patient_id;
            additionalInfo.appointmentDate = req.body.appointment_date;
          }
        }
      } else if (requestPath.startsWith('/api/reports')) {
        actionType = 'REPORT_GENERATED';
        actionDescription = 'Rapor oluşturuldu/çekildi';
        additionalInfo.reportType = req.query.type || 'Genel Rapor';
        additionalInfo.reportParams = req.query;
      } else if (requestPath.startsWith('/api/branches')) {
        if (httpMethod === 'POST') {
          actionType = 'BRANCH_CREATED';
          actionDescription = 'Yeni şube oluşturuldu';
        } else if (httpMethod === 'PUT') {
          actionType = 'BRANCH_UPDATED';
          actionDescription = 'Şube bilgileri güncellendi';
        }
      } else if (requestPath.startsWith('/api/treatments')) {
        if (httpMethod === 'POST') {
          actionType = 'TREATMENT_CREATED';
          actionDescription = 'Yeni tedavi kaydı oluşturuldu';
        }
      } else if (requestPath.startsWith('/api/invoices')) {
        if (httpMethod === 'POST') {
          actionType = 'INVOICE_CREATED';
          actionDescription = 'Yeni fatura oluşturuldu';
        }
      } else if (requestPath.startsWith('/api/notes')) {
        if (httpMethod === 'POST') {
          actionType = 'NOTE_CREATED';
          actionDescription = 'Yeni not oluşturuldu';
        }
      } else if (requestPath.startsWith('/api/admin')) {
        actionType = 'ADMIN_ACTION';
        actionDescription = 'Admin paneli işlemi';
        additionalInfo.adminAction = requestPath;
      }
      
      // Sayfa ziyaretleri için özel kontrol
      if (httpMethod === 'GET' && !requestPath.startsWith('/api/')) {
        actionType = 'PAGE_VISIT';
        actionDescription = `Sayfa ziyaret edildi: ${requestPath}`;
        additionalInfo.pagePath = requestPath;
        additionalInfo.queryParams = req.query;
      }
      
      // Form verilerini logla (hassas bilgiler hariç)
      if (req.body && Object.keys(req.body).length > 0) {
        const sanitizedBody = { ...req.body };
        // Hassas bilgileri gizle
        if (sanitizedBody.password) delete sanitizedBody.password;
        if (sanitizedBody.password_hash) delete sanitizedBody.password_hash;
        additionalInfo.formData = sanitizedBody;
      }
      
      // Query parametrelerini logla
      if (req.query && Object.keys(req.query).length > 0) {
        additionalInfo.queryParams = req.query;
      }
      
      // Response bilgilerini logla
      let responseInfo = {};
      try {
        if (typeof data === 'string') {
          const parsedData = JSON.parse(data);
          responseInfo.success = parsedData.success;
          responseInfo.message = parsedData.message;
          if (parsedData.data) {
            responseInfo.dataType = Array.isArray(parsedData.data) ? 'array' : 'object';
            responseInfo.dataCount = Array.isArray(parsedData.data) ? parsedData.data.length : 1;
          }
        }
      } catch (e) {
        responseInfo.rawResponse = typeof data;
      }
      
      const logData = {
        user_id: req.user.id,
        username: req.user.username,
        action: actionType,
        details: actionDescription,
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('User-Agent'),
        page_url: fullUrl,
        http_method: httpMethod,
        request_path: requestPath,
        additional_info: JSON.stringify(additionalInfo),
        response_info: JSON.stringify(responseInfo)
        // session_duration kaldırıldı - artık session kullanmıyoruz
      };
      
      console.log('📝 Logging activity:', {
        user: logData.username,
        action: logData.action,
        path: logData.request_path
      });
      
      // Veritabanına kaydet (async olarak, response'u bekletme)
      pool.query(
        `INSERT INTO activity_logs (
          user_id, username, action, details, ip_address, user_agent, 
          page_url, http_method, request_path, additional_info, 
          response_info, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
        [
          logData.user_id, logData.username, logData.action, logData.details, 
          logData.ip_address, logData.user_agent, logData.page_url, 
          logData.http_method, logData.request_path, logData.additional_info,
          logData.response_info
        ]
      ).then(() => {
        console.log('✅ Activity log saved to database');
      }).catch(err => {
        console.error('❌ Activity log hatası:', err);
      });
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

module.exports = logActivity;
