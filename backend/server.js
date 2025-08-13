const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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

// Test database connection
app.use('/api/test-db', require('./src/routes/test-db'));

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