// Node.js 18+ built-in fetch kullan
async function testDatabaseConnection() {
  try {
    const config = {
      host: '152.89.36.234',
      port: '3306',
      database: 'ota19dds_hsptdnt181921',
      username: 'ota19dds_reportuser',
      password: 'Hospitadent2024!',
      type: 'mariadb'
    };

    console.log('Veritabanı bağlantı ayarları database_connections tablosuna kaydediliyor...');
    console.log('Config:', config);
    
    const response = await fetch('http://localhost:3000/api/admin/database/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    
    const data = await response.json();
    console.log('Yanıt:', data);
    
    if (data.success) {
      console.log('✅ Bağlantı ayarları database_connections tablosuna başarıyla kaydedildi!');
      
      // Kayıtlı bağlantıları kontrol et
      const getResponse = await fetch('http://localhost:3000/api/admin/database/config');
      const getData = await getResponse.json();
      console.log('Kayıtlı bağlantılar:', getData);
      
    } else {
      console.log('❌ Hata:', data.message);
    }
    
  } catch (error) {
    console.error('❌ Hata oluştu:', error.message);
  }
}

testDatabaseConnection();
