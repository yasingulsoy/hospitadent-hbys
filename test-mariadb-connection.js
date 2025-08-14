const mysql = require('mysql2/promise');

async function testMariaDBConnection() {
  console.log('🔍 MariaDB bağlantısı test ediliyor...');
  
  try {
    // MariaDB bağlantısı
    const connection = await mysql.createConnection({
      host: '152.89.36.234',
      port: 3306,
      user: 'ota19dds_reportuser',
      password: 'KRqnSM{$~tj-OY#7',
      database: 'ota19dds_hsptdnt181921'
    });

    console.log('✅ MariaDB bağlantısı başarılı!');
    
    // Bağlantıyı test et
    await connection.ping();
    console.log('✅ Ping başarılı');
    
    // Basit bir sorgu çalıştır
    const [rows] = await connection.execute('SELECT * FROM clinics c');
    console.log('✅ Test sorgusu başarılı:', rows);
    console.log('📊 Bulunan kayıt sayısı:', rows.length);
    
    // Veritabanı bilgilerini al
    const [databases] = await connection.execute('SHOW DATABASES');
    console.log('📚 Mevcut veritabanları:', databases.map(db => db.Database));
    
    // Tabloları listele
    const [tables] = await connection.execute(`
      SELECT 
        TABLE_NAME as name,
        TABLE_ROWS as row_count,
        ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) as size_mb
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'ota19dds_hsptdnt181921'
      ORDER BY TABLE_NAME
      LIMIT 10
    `);
    
    console.log('📋 İlk 10 tablo:', tables);
    
    await connection.end();
    console.log('✅ Bağlantı kapatıldı');
    
  } catch (error) {
    console.error('❌ MariaDB bağlantı hatası:', error);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('🔴 Sunucu kapalı veya erişilemiyor');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('🔴 Erişim reddedildi - kullanıcı adı/şifre hatalı');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('🔴 Veritabanı bulunamadı');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('🔴 Bağlantı zaman aşımı');
    }
    
    console.error('Hata detayları:', error.message);
  }
}

// Test'i çalıştır
testMariaDBConnection();
