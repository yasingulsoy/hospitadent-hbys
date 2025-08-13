'use client';

import { useState, useEffect } from 'react';
import { 
  Database, 
  Server, 
  Settings, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Eye,
  EyeOff,
  Save,
  Play,
  Stop,
  Activity,
  Plus,
  Code
} from 'lucide-react';

interface DatabaseConfig {
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  type: 'postgresql' | 'mariadb' | 'mysql';
}

interface DatabaseStatus {
  isConnected: boolean;
  lastCheck: string;
  message: string;
  databases?: string[];
  tables?: any[];
}

export default function DatabasePage() {
  const [config, setConfig] = useState<DatabaseConfig>({
    host: 'localhost',
    port: '3306',
    database: 'hospitadent_reports',
    username: '',
    password: '',
    type: 'mariadb'
  });
  
  const [status, setStatus] = useState<DatabaseStatus>({
    isConnected: false,
    lastCheck: 'Hiç kontrol edilmedi',
    message: 'Bağlantı test edilmedi'
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'status' | 'databases' | 'tables' | 'connections' | 'query'>('config');

  // Sayfa yüklendiğinde kayıtlı ayarları yükle
  useEffect(() => {
    const savedConfig = localStorage.getItem('databaseConfig');
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }
  }, []);

  // Ayarları kaydet
  const saveConfig = () => {
    localStorage.setItem('databaseConfig', JSON.stringify(config));
    // Backend'e de kaydet
    fetch('/api/admin/database/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
  };

  // Bağlantı testi
  const testConnection = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/database/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatus({
          isConnected: true,
          lastCheck: new Date().toLocaleString('tr-TR'),
          message: 'Bağlantı başarılı!',
          databases: data.databases || []
        });
      } else {
        setStatus({
          isConnected: false,
          lastCheck: new Date().toLocaleString('tr-TR'),
          message: data.message || 'Bağlantı başarısız'
        });
      }
    } catch (error) {
      setStatus({
        isConnected: false,
        lastCheck: new Date().toLocaleString('tr-TR'),
        message: 'Bağlantı hatası oluştu'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Veritabanlarını listele
  const listDatabases = async () => {
    try {
      const response = await fetch('/api/admin/database/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      const data = await response.json();
      if (data.success) {
        setStatus(prev => ({
          ...prev,
          databases: data.databases || []
        }));
      }
    } catch (error) {
      console.error('Veritabanları listelenirken hata:', error);
    }
  };

  // Tabloları listele
  const listTables = async () => {
    try {
      const response = await fetch('/api/admin/database/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      const data = await response.json();
      if (data.success) {
        setStatus(prev => ({
          ...prev,
          tables: data.tables || []
        }));
      }
    } catch (error) {
      console.error('Tablolar listelenirken hata:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl">
                <Database className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Veritabanı Yönetimi</h1>
                <p className="text-gray-600 mt-1">Veritabanı bağlantıları ve ayarları</p>
              </div>
            </div>
            
            {/* Bağlantı Durumu */}
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-4 py-2 rounded-xl ${
                status.isConnected 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {status.isConnected ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <XCircle className="h-5 w-5" />
                )}
                <span className="font-semibold">
                  {status.isConnected ? 'Bağlantı Aktif' : 'Bağlantı Yok'}
                </span>
              </div>
              
              <button
                onClick={testConnection}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-xl font-semibold flex items-center space-x-2 transition-colors"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <TestTube className="h-4 w-4" />
                )}
                <span>Bağlantı Test Et</span>
              </button>
            </div>
          </div>
          
          {/* Son Kontrol */}
          <div className="mt-4 text-sm text-gray-500">
            Son kontrol: {status.lastCheck} - {status.message}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-8">
                             {[
                 { id: 'config', label: 'Bağlantı Ayarları', icon: Settings },
                 { id: 'status', label: 'Bağlantı Durumu', icon: Activity },
                 { id: 'databases', label: 'Veritabanları', icon: Database },
                 { id: 'tables', label: 'Tablolar', icon: Server },
                 { id: 'connections', label: 'Kayıtlı Bağlantılar', icon: Database },
                 { id: 'query', label: 'SQL Sorgu', icon: Code }
               ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {/* Bağlantı Ayarları */}
            {activeTab === 'config' && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-900">Veritabanı Bağlantı Ayarları</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Veritabanı Türü
                    </label>
                    <select
                      value={config.type}
                      onChange={(e) => setConfig({...config, type: e.target.value as any})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="mariadb">MariaDB</option>
                      <option value="mysql">MySQL</option>
                      <option value="postgresql">PostgreSQL</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Host
                    </label>
                    <input
                      type="text"
                      value={config.host}
                      onChange={(e) => setConfig({...config, host: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="localhost"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Port
                    </label>
                    <input
                      type="text"
                      value={config.port}
                      onChange={(e) => setConfig({...config, port: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="3306"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Veritabanı Adı
                    </label>
                    <input
                      type="text"
                      value={config.database}
                      onChange={(e) => setConfig({...config, database: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="hospitadent_reports"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kullanıcı Adı
                    </label>
                    <input
                      type="text"
                      value={config.username}
                      onChange={(e) => setConfig({...config, username: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="root"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Şifre
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={config.password}
                        onChange={(e) => setConfig({...config, password: e.target.value})}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-4">
                  <button
                    onClick={saveConfig}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-xl font-semibold flex items-center space-x-2 transition-colors"
                  >
                    <Save className="h-4 w-4" />
                    <span>Ayarları Kaydet</span>
                  </button>
                  
                  <button
                    onClick={testConnection}
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-xl font-semibold flex items-center space-x-2 transition-colors"
                  >
                    {isLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <TestTube className="h-4 w-4" />
                    )}
                    <span>Bağlantı Test Et</span>
                  </button>
                </div>
              </div>
            )}

            {/* Bağlantı Durumu */}
            {activeTab === 'status' && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-900">Bağlantı Durumu ve Bilgiler</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-50 rounded-xl p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className={`p-2 rounded-lg ${
                        status.isConnected ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {status.isConnected ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Bağlantı Durumu</h4>
                        <p className="text-sm text-gray-600">
                          {status.isConnected ? 'Aktif' : 'Pasif'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-xl p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                        <Activity className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Son Kontrol</h4>
                        <p className="text-sm text-gray-600">{status.lastCheck}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-xl p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                        <Database className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Veritabanı Sayısı</h4>
                        <p className="text-sm text-gray-600">
                          {status.databases ? status.databases.length : 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Son Mesaj</h4>
                  <p className="text-gray-700">{status.message}</p>
                </div>
              </div>
            )}

            {/* Veritabanları */}
            {activeTab === 'databases' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900">Mevcut Veritabanları</h3>
                  <button
                    onClick={listDatabases}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold flex items-center space-x-2 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Yenile</span>
                  </button>
                </div>
                
                {status.databases && status.databases.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {status.databases.map((db, index) => (
                      <div key={index} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <div className="flex items-center space-x-3">
                          <Database className="h-5 w-5 text-blue-600" />
                          <span className="font-medium text-gray-900">{db}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Veritabanları listelenmedi. Bağlantı test edin ve yenileyin.
                  </div>
                )}
              </div>
            )}

            {/* Tablolar */}
            {activeTab === 'tables' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900">Veritabanı Tabloları</h3>
                  <button
                    onClick={listTables}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold flex items-center space-x-2 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Yenile</span>
                  </button>
                </div>
                
                {status.tables && status.tables.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tablo Adı
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Satır Sayısı
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Boyut
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Son Güncelleme
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {status.tables.map((table, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {table.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {table.rows || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {table.size || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {table.updated || 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Tablolar listelenmedi. Bağlantı test edin ve yenileyin.
                  </div>
                                 )}
               </div>
             )}

             {/* Kayıtlı Bağlantılar */}
             {activeTab === 'connections' && (
               <div className="space-y-6">
                 <div className="flex items-center justify-between">
                   <h3 className="text-xl font-semibold text-gray-900">Kayıtlı Veritabanı Bağlantıları</h3>
                   <button
                     onClick={() => {/* TODO: Yeni bağlantı ekleme modal'ı */}}
                     className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-semibold flex items-center space-x-2 transition-colors"
                   >
                     <Plus className="h-4 w-4" />
                     <span>Yeni Bağlantı</span>
                   </button>
                 </div>
                 
                 <div className="text-center py-8 text-gray-500">
                   Kayıtlı bağlantılar burada listelenecek. Şimdilik geliştirme aşamasında.
                 </div>
               </div>
             )}

             {/* SQL Sorgu Çalıştırma */}
             {activeTab === 'query' && (
               <div className="space-y-6">
                 <h3 className="text-xl font-semibold text-gray-900">SQL Sorgu Çalıştırma</h3>
                 
                 <div className="space-y-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       SQL Sorgusu
                     </label>
                     <textarea
                       rows={6}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                       placeholder="SELECT * FROM branches WHERE active = 1;"
                     />
                   </div>
                   
                   <div className="flex space-x-4">
                     <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-semibold transition-colors">
                       Sorguyu Çalıştır
                     </button>
                     <button className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-xl font-semibold transition-colors">
                       Temizle
                     </button>
                   </div>
                   
                   <div className="bg-gray-50 rounded-xl p-4">
                     <h4 className="font-semibold text-gray-900 mb-2">Sonuçlar</h4>
                     <p className="text-gray-500">Sorgu sonuçları burada görünecek...</p>
                   </div>
                 </div>
               </div>
             )}
           </div>
         </div>
       </div>
     </div>
   );
 }
