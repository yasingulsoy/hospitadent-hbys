const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.set('trust proxy', true);
app.use(helmet());
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

// Preflight request'leri handle et
app.options('*', cors());

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser('', {
  sameSite: 'lax',
  secure: false
}));

// Activity Logger Middleware
const logActivity = require('./src/middleware/activityLogger');
app.use(logActivity);

// Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/branches', require('./src/routes/branches'));
app.use('/api/patients', require('./src/routes/patients'));
app.use('/api/appointments', require('./src/routes/appointments'));
app.use('/api/treatments', require('./src/routes/treatments'));
app.use('/api/invoices', require('./src/routes/invoices'));
app.use('/api/notes', require('./src/routes/notes'));
app.use('/api/reports', require('./src/routes/reports'));
app.use('/api/users', require('./src/routes/users'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/admin/activity-logs', require('./src/routes/activity-logs'));

// Test database connection
app.use('/api/test-db', require('./src/routes/test-db'));

// Branch cards
app.use('/api/branch-cards', require('./src/routes/branch-cards'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Hospitadent Dental HBYS API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Sunucu hatası',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Bir hata oluştu'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint bulunamadı'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Hospitadent Dental HBYS API Server`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Started at: ${new Date().toLocaleString('tr-TR')}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
});

module.exports = app; 