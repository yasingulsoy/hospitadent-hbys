'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
  Activity,
  Plus,
  Code,
  Edit,
  Trash2,
  FileText,
  MoreVertical
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
  tables?: Array<{
    name: string;
    rows?: number;
    size?: string;
    updated?: string;
  }>;
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
  const [activeTab, setActiveTab] = useState<'config' | 'status' | 'databases' | 'tables' | 'connections' | 'query' | 'saved'>('config');
  
  // SQL sorgu için state değişkenleri
  const [sqlQuery, setSqlQuery] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryResults, setQueryResults] = useState<any>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  
  // Sorgu kaydetme dialog state'i
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveForm, setSaveForm] = useState({
    name: '',
    description: '',
    category: 'general',
    is_public: false
  });

  // Kayıtlı bağlantıları listele
  const [savedConnections, setSavedConnections] = useState<any[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  
  const loadSavedConnections = async () => {
    setLoadingConnections(true);
    try {
      const response = await fetch('http://localhost:5000/api/admin/database-connections');
      const data = await response.json();
      
      if (data.success && data.connections) {
        setSavedConnections(data.connections);
      }
    } catch (error) {
      console.error('Kayıtlı bağlantılar yüklenirken hata:', error);
    } finally {
      setLoadingConnections(false);
    }
  };

  // Kayıtlı sorguları listele
  const [savedQueries, setSavedQueries] = useState<any[]>([]);
  const [loadingQueries, setLoadingQueries] = useState(false);
  
  const loadSavedQueries = async () => {
    setLoadingQueries(true);
    try {
      // Artık doğrudan doğrudan PostgreSQL'den veri çek, parametre gönderme
      const response = await fetch('http://localhost:5000/api/admin/database/save-query');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSavedQueries(data.queries || []);
        }
      }
    } catch (error) {
      console.error('Kayıtlı sorgular yüklenirken hata:', error);
    } finally {
      setLoadingQueries(false);
    }
  };

  // Sayfa yüklendiğinde kayıtlı bağlantıları ve sorguları da yükle
  useEffect(() => {
    loadSavedConnections();
    loadSavedQueries(); // Sayfa yüklendiğinde kayıtlı sorguları yükle
  }, []);

  // Sayfa yüklendiğinde kayıtlı ayarları yükle
  useEffect(() => {
    // Veritabanından yükle
    const loadConfigFromDB = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/admin/database/config');
        const data = await response.json();
        
        if (data.success && data.config) {
          setConfig(data.config);
        }
      } catch (error) {
        console.log('Veritabanından konfigürasyon yüklenemedi');
      }
    };
    
    loadConfigFromDB();
  }, []);

  // Otomatik bağlantı yönetimi
  useEffect(() => {
    // Eğer kayıtlı bağlantı varsa otomatik bağlan
    if (config.host && config.username && config.password) {
      testConnection();
    }

    // Her 30 saniyede bir bağlantıyı kontrol et
    const interval = setInterval(() => {
      if (config.host && config.username && config.password) {
        testConnection();
      }
    }, 30000); // 30 saniye

    return () => clearInterval(interval);
  }, [config.host, config.username, config.password]);

  // Ayarları kaydet
  const saveConfig = async () => {
    try {
      // Backend'e kaydet
      const response = await fetch('http://localhost:5000/api/admin/database/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Başarılı mesajı göster
        alert('Bağlantı başarıyla kaydedildi!');
        
        // Kayıtlı bağlantıları yeniden yükle
        await loadSavedConnections();
        
        // Kayıtlı Bağlantılar tab'ına geç
        setActiveTab('connections');
      } else {
        alert('Hata: ' + (data.message || 'Bağlantı kaydedilemedi'));
      }
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      alert('Hata: Bağlantı kaydedilemedi');
    }
  };

  // Bağlantıyı sil
  const deleteConnection = async (id: number) => {
    if (confirm('Bu bağlantıyı silmek istediğinizden emin misiniz?')) {
      try {
        const response = await fetch(`http://localhost:5000/api/admin/database-connections/${id}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          // Kayıtlı bağlantıları yeniden yükle
          loadSavedConnections();
        }
      } catch (error) {
        console.error('Bağlantı silinirken hata:', error);
      }
    }
  };

  // Bağlantı testi
  const testConnection = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/admin/database/test', {
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
      const response = await fetch('http://localhost:5000/api/admin/database/list', {
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
      const response = await fetch('http://localhost:5000/api/admin/database/tables', {
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

  // SQL sorgu çalıştırma
  const executeQuery = async () => {
    if (!sqlQuery.trim()) {
      setQueryError('Lütfen bir SQL sorgusu girin');
      return;
    }

    setIsExecuting(true);
    setQueryError(null);
    setQueryResults(null);

    try {
      // Kayıtlı bağlantıları getir
      const connectionResponse = await fetch('http://localhost:5000/api/admin/database-connections');
      const connectionData = await connectionResponse.json();
      
      if (!connectionData.success || connectionData.connections.length === 0) {
        setQueryError('Aktif veritabanı bağlantısı bulunamadı. Lütfen önce bağlantı ekleyin.');
        setIsExecuting(false);
        return;
      }
      
      // İlk aktif bağlantıyı kullan
      const connection = connectionData.connections[0];
      
      // Şifre olmadığı için config'den al
      if (!config.password) {
        setQueryError('Veritabanı şifresi gerekli. Lütfen bağlantı ayarlarında şifreyi girin.');
        setIsExecuting(false);
        return;
      }
      
      const response = await fetch('http://localhost:5000/api/admin/database/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: sqlQuery,
          host: connection.host,
          port: parseInt(connection.port),
          database: connection.database_name,
          username: connection.username,
          password: config.password,
          type: connection.type
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setQueryResults(data);
      } else {
        setQueryError(data.message || 'Sorgu çalıştırılamadı');
      }
    } catch (error: any) {
      setQueryError('Sorgu çalıştırılırken hata oluştu: ' + (error?.message || 'Bilinmeyen hata'));
    } finally {
      setIsExecuting(false);
    }
  };

  // Sorgu kaydetme
  const saveQuery = async () => {
    if (!saveForm.name.trim() || !sqlQuery.trim()) return;
    
    try {
      const response = await fetch('http://localhost:5000/api/admin/database/save-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...saveForm,
          query: sqlQuery,
          created_by: 'admin'
          // Artık config parametreleri gönderilmiyor, doğrudan PostgreSQL kullanılıyor
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Sorgu başarıyla kaydedildi!');
        setShowSaveDialog(false);
        setSaveForm({ name: '', description: '', category: 'general', is_public: false });
        loadSavedQueries(); // Kayıtlı sorguları yenile
      } else {
        alert('Hata: ' + (data.message || 'Sorgu kaydedilemedi'));
      }
    } catch (error: any) {
      alert('Hata: ' + (error?.message || 'Bilinmeyen hata'));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link 
              href="/admin"
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              ← Geri
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Veritabanı Yönetimi</h1>
              <p className="text-gray-600 mt-2">Veritabanı bağlantıları ve sorguları yönetin</p>
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
                 { id: 'query', label: 'SQL Sorgu', icon: Code },
                 { id: 'saved', label: 'Kayıtlı Sorgular', icon: FileText }
               ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as 'config' | 'status' | 'databases' | 'tables' | 'connections' | 'query' | 'saved')}
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
                      onChange={(e) => setConfig({...config, type: e.target.value as 'postgresql' | 'mariadb' | 'mysql'})}
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
                      onClick={() => setActiveTab('config')}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-semibold flex items-center space-x-2 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Yeni Bağlantı</span>
                    </button>
                  </div>
                  
                  {loadingConnections ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Bağlantılar yükleniyor...</p>
                    </div>
                  ) : savedConnections.length > 0 ? (
                    <div className="space-y-4">
                      {savedConnections.map((connection, index) => (
                        <div key={index} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className={`p-2 rounded-lg ${
                                connection.type === 'mariadb' ? 'bg-blue-100 text-blue-600' :
                                connection.type === 'mysql' ? 'bg-orange-100 text-orange-600' :
                                'bg-purple-100 text-purple-600'
                              }`}>
                                <Database className="h-5 w-5" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">{connection.name}</h4>
                                <p className="text-sm text-gray-500">{connection.type.toUpperCase()}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                                             <button
                                 onClick={() => {
                                   setConfig({
                                     host: connection.host,
                                     port: connection.port,
                                     database: connection.database_name,
                                     username: connection.username,
                                     password: connection.password, // Şifreyi normal döndür
                                     type: connection.type
                                   });
                                   setActiveTab('config');
                                 }}
                                 className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                 title="Düzenle"
                               >
                                 <Edit className="h-4 w-4" />
                               </button>
                                                             <button
                                 onClick={() => {
                                   setConfig({
                                     host: connection.host,
                                     port: connection.port,
                                     database: connection.database_name,
                                     username: connection.username,
                                     password: connection.password, // Şifreyi normal döndür
                                     type: connection.type
                                   });
                                   testConnection();
                                 }}
                                 className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                 title="Test Et"
                               >
                                 <TestTube className="h-4 w-4" />
                               </button>
                               
                               <button
                                 onClick={() => {
                                   setConfig({
                                     host: connection.host,
                                     port: connection.port,
                                     database: connection.database_name,
                                     username: connection.username,
                                     password: connection.password, // Şifreyi normal döndür
                                     type: connection.type
                                   });
                                   setActiveTab('config');
                                 }}
                                 className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                 title="Yeniden Bağlan"
                               >
                                 <RefreshCw className="h-4 w-4" />
                               </button>
                               
                               <button
                                 onClick={() => {
                                   setConfig({
                                     host: connection.host,
                                     port: connection.port,
                                     database: connection.database_name,
                                     username: connection.username,
                                     password: connection.password, // Şifreyi normal döndür
                                     type: connection.type
                                   });
                                   testConnection();
                                 }}
                                 className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
                                 title="Bağlan"
                               >
                                 <Database className="h-4 w-4" />
                               </button>
                              <button
                                onClick={() => deleteConnection(connection.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                title="Sil"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">Host:</span>
                              <p className="text-gray-600">{connection.host}:{connection.port}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Database:</span>
                              <p className="text-gray-600">{connection.database_name}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Username:</span>
                              <p className="text-gray-600">{connection.username}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Durum:</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                connection.is_active 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {connection.is_active ? 'Aktif' : 'Pasif'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Henüz kayıtlı bağlantı yok. "Bağlantı Ayarları" tab'ından yeni bağlantı ekleyin.
                    </div>
                  )}
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
                       value={sqlQuery}
                       onChange={(e) => setSqlQuery(e.target.value)}
                       rows={6}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                       placeholder="SELECT * FROM branches WHERE active = 1;"
                     />
                   </div>
                   
                   <div className="flex space-x-4">
                     <button 
                       onClick={executeQuery}
                       disabled={!sqlQuery.trim() || isExecuting}
                       className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-xl font-semibold transition-colors flex items-center space-x-2"
                     >
                       {isExecuting ? (
                         <RefreshCw className="h-4 w-4 animate-spin" />
                       ) : (
                         <Code className="h-4 w-4" />
                       )}
                       <span>{isExecuting ? 'Çalıştırılıyor...' : 'Sorguyu Çalıştır'}</span>
                     </button>
                     <button 
                       onClick={() => setSqlQuery('')}
                       className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-xl font-semibold transition-colors"
                     >
                       Temizle
                     </button>
                     <button 
                       onClick={() => setShowSaveDialog(true)}
                       disabled={!sqlQuery.trim()}
                       className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-6 py-2 rounded-xl font-semibold transition-colors flex items-center space-x-2"
                     >
                       <Save className="h-4 w-4" />
                       <span>Sorguyu Kaydet</span>
                     </button>
                   </div>
                   
                   <div className="bg-gray-50 rounded-xl p-4">
                     <h4 className="font-semibold text-gray-900 mb-2">Sonuçlar</h4>
                     {isExecuting ? (
                       <div className="text-center py-8">
                         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                         <p className="text-gray-600">Sorgu çalıştırılıyor...</p>
                       </div>
                     ) : queryResults ? (
                       <div className="space-y-4">
                         <div className="text-sm text-green-600 font-medium">
                           {queryResults.message}
                         </div>
                         {queryResults.results && Array.isArray(queryResults.results) && queryResults.results.length > 0 ? (
                           <div className="overflow-x-auto">
                             <table className="min-w-full divide-y divide-gray-200">
                               <thead className="bg-gray-100">
                                 <tr>
                                   {Object.keys(queryResults.results[0]).map((key) => (
                                     <th key={key} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                       {key}
                                     </th>
                                   ))}
                                 </tr>
                               </thead>
                               <tbody className="bg-white divide-y divide-gray-200">
                                 {queryResults.results.map((row: any, index: number) => (
                                   <tr key={index} className="hover:bg-gray-50">
                                     {Object.values(row).map((value: any, cellIndex: number) => (
                                       <td key={cellIndex} className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                         {String(value)}
                                       </td>
                                     ))}
                                   </tr>
                                 ))}
                               </tbody>
                             </table>
                           </div>
                         ) : (
                           <div className="text-sm text-gray-600">
                             Sorgu başarıyla çalıştırıldı. Sonuç: {queryResults.results}
                           </div>
                         )}
                       </div>
                     ) : queryError ? (
                       <div className="text-sm text-red-600">
                         Hata: {queryError}
                       </div>
                     ) : (
                       <p className="text-gray-500">Sorgu sonuçları burada görünecek...</p>
                     )}
                   </div>
                 </div>
               </div>
             )}

             {/* Sorgu Kaydetme Dialog */}
             {showSaveDialog && (
               <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                 <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
                   <h3 className="text-xl font-semibold text-gray-900 mb-6">Sorguyu Kaydet</h3>
                   
                   <div className="space-y-4">
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">
                         Sorgu Adı *
                       </label>
                       <input
                         type="text"
                         value={saveForm.name}
                         onChange={(e) => setSaveForm({...saveForm, name: e.target.value})}
                         className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                         placeholder="Günlük Hasta Sayısı"
                       />
                     </div>
                     
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">
                         Açıklama
                       </label>
                       <textarea
                         value={saveForm.description}
                         onChange={(e) => setSaveForm({...saveForm, description: e.target.value})}
                         rows={3}
                         className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                         placeholder="Bu sorgu ne yapar?"
                       />
                     </div>
                     
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">
                         Kategori
                       </label>
                       <select
                         value={saveForm.category}
                         onChange={(e) => setSaveForm({...saveForm, category: e.target.value})}
                         className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                       >
                         <option value="general">Genel</option>
                         <option value="financial">Finansal</option>
                         <option value="patient">Hasta</option>
                         <option value="appointment">Randevu</option>
                         <option value="branch">Şube</option>
                         <option value="treatment">Tedavi</option>
                       </select>
                     </div>
                     
                     <div className="flex items-center">
                       <input
                         type="checkbox"
                         id="is_public"
                         checked={saveForm.is_public}
                         onChange={(e) => setSaveForm({...saveForm, is_public: e.target.checked})}
                         className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                       />
                       <label htmlFor="is_public" className="ml-2 block text-sm text-gray-900">
                         Genel erişime açık
                       </label>
                     </div>
                   </div>
                   
                   <div className="flex space-x-3 mt-6">
                     <button
                       onClick={() => setShowSaveDialog(false)}
                       className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold transition-colors"
                     >
                       İptal
                     </button>
                     <button
                       onClick={saveQuery}
                       disabled={!saveForm.name.trim()}
                       className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                     >
                       Kaydet
                     </button>
                   </div>
                 </div>
               </div>
             )}

             {/* Kayıtlı Sorgular */}
             {activeTab === 'saved' && (
               <div className="space-y-6">
                 <div className="flex items-center justify-between">
                   <h3 className="text-xl font-semibold text-gray-900">Kayıtlı Sorgular</h3>
                   <button
                     onClick={() => setActiveTab('query')}
                     className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold flex items-center space-x-2 transition-colors"
                   >
                     <Plus className="h-4 w-4" />
                     <span>Yeni Sorgu</span>
                   </button>
                 </div>
                 
                 {loadingQueries ? (
                   <div className="text-center py-12">
                     <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                     <p className="text-gray-600">Sorgular yükleniyor...</p>
                   </div>
                 ) : savedQueries.length === 0 ? (
                   <div className="text-center py-12 text-gray-500">
                     <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                     <p className="text-lg">Henüz kayıtlı sorgu yok</p>
                     <p className="text-sm">İlk sorgunuzu kaydetmek için "Yeni Sorgu" butonuna tıklayın</p>
                   </div>
                 ) : (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {savedQueries.map((query) => (
                       <div key={query.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
                         <div className="flex items-start justify-between mb-4">
                           <div className="flex-1">
                             <h4 className="text-lg font-semibold text-gray-900 mb-2">{query.name}</h4>
                             <p className="text-sm text-gray-600 mb-3">{query.description || 'Açıklama yok'}</p>
                             <div className="flex items-center space-x-2 text-xs text-gray-500">
                               <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{query.category || 'Genel'}</span>
                               {query.is_public && (
                                 <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full">Genel</span>
                               )}
                             </div>
                           </div>
                           <button className="text-gray-400 hover:text-gray-600 transition-colors">
                             <MoreVertical className="h-5 w-5" />
                           </button>
                         </div>
                         
                         <div className="space-y-3">
                           <div className="bg-gray-50 rounded-lg p-3">
                             <code className="text-xs text-gray-800 font-mono overflow-hidden text-ellipsis whitespace-nowrap">
                               {query.query}
                             </code>
                           </div>
                           
                           <div className="flex items-center justify-between text-sm">
                             <span className="text-gray-600">Oluşturan:</span>
                             <span className="text-gray-900 font-medium">{query.created_by || 'Admin'}</span>
                           </div>
                           
                           <div className="flex items-center justify-between text-sm">
                             <span className="text-gray-600">Oluşturulma:</span>
                             <span className="text-gray-900 font-medium">
                               {new Date(query.created_at).toLocaleDateString('tr-TR')}
                             </span>
                           </div>
                         </div>
                         
                         <div className="flex space-x-2 mt-4">
                           <Link
                             href={`/reports/${query.id}`}
                             className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors text-center"
                           >
                             Görüntüle
                           </Link>
                           <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-semibold transition-colors">
                             Düzenle
                           </button>
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
             )}
           </div>
         </div>
       </div>
   );
}
