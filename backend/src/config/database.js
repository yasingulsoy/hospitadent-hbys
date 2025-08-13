const { Pool } = require('pg');

const pool = new Pool({
  user: 'hospitadent_user',
  host: 'localhost',
  database: 'hospitadent_business_intelligence',
  password: 'password',
  port: 5432,
});

// Bağlantı testi
pool.on('connect', () => {
  console.log('✅ PostgreSQL veritabanına bağlandı');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL bağlantı hatası:', err);
});

module.exports = pool;
