'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { apiGet } from '../../../lib/api';
import { 
  ArrowLeft, 
  Users, 
  Calendar, 
  FileText, 
  Activity,
  LogIn,
  LogOut,
  Eye,
  Edit,
  Plus,
  Trash2,
  Search,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';

interface ActivityLog {
  id: number;
  user_id: number;
  username: string;
  action: string;
  details: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  page_url?: string;
  session_duration?: number;
  http_method?: string;
  request_path?: string;
  additional_info?: any;
  response_info?: any;
}

export default function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterUser, setFilterUser] = useState('all');

  useEffect(() => {
    loadActivityLogs();
  }, []);

  const loadActivityLogs = async () => {
    try {
      setLoading(true);
      
      // API'den aktivite loglarını yükle
      const response = await apiGet('http://localhost:5000/api/admin/activity-logs');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLogs(data.logs || []);
        }
      }
    } catch (error) {
      console.error('Aktivite logları yüklenirken hata:', error);
      
      // Hata durumunda örnek veriler
      setLogs([
        {
          id: 1,
          user_id: 1,
          username: 'yasingulsoy02@gmail.com',
          action: 'LOGIN',
          details: 'Başarılı giriş yapıldı',
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          created_at: new Date().toISOString(),
          page_url: '/login',
          session_duration: 1800
        },
        {
          id: 2,
          user_id: 1,
          username: 'yasingulsoy02@gmail.com',
          action: 'PAGE_VIEW',
          details: 'Admin paneli ziyaret edildi',
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          page_url: '/admin',
          session_duration: 1800
        },
        {
          id: 3,
          user_id: 1,
          username: 'yasingulsoy02@gmail.com',
          action: 'BRANCH_VIEW',
          details: 'Şube detayları görüntülendi: İstanbul Kadıköy',
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          page_url: '/admin/branches/1',
          session_duration: 1800
        },
        {
          id: 4,
          user_id: 1,
          username: 'yasingulsoy02@gmail.com',
          action: 'QUERY_EXECUTE',
          details: 'SQL sorgusu çalıştırıldı: Gelir Analizi',
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          page_url: '/admin/queries/1',
          session_duration: 1800
        },
        {
          id: 5,
          user_id: 1,
          username: 'yasingulsoy02@gmail.com',
          action: 'PATIENT_UPDATE',
          details: 'Hasta kaydı güncellendi: Mehmet Demir',
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
          page_url: '/admin/patients/123',
          session_duration: 1800
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return <LogIn className="h-4 w-4 text-green-600" />;
      case 'LOGOUT':
        return <LogOut className="h-4 w-4 text-red-600" />;
      case 'PAGE_VIEW':
        return <Eye className="h-4 w-4 text-blue-600" />;
      case 'CREATE':
        return <Plus className="h-4 w-4 text-green-600" />;
      case 'UPDATE':
        return <Edit className="h-4 w-4 text-yellow-600" />;
      case 'DELETE':
        return <Trash2 className="h-4 w-4 text-red-600" />;
      case 'QUERY_EXECUTE':
        return <FileText className="h-4 w-4 text-purple-600" />;
      case 'BRANCH_VIEW':
        return <Activity className="h-4 w-4 text-blue-600" />;
      case 'PATIENT_UPDATE':
        return <Users className="h-4 w-4 text-green-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return 'bg-green-100 text-green-800';
      case 'LOGOUT':
        return 'bg-red-100 text-red-800';
      case 'PAGE_VIEW':
        return 'bg-blue-100 text-blue-800';
      case 'CREATE':
        return 'bg-green-100 text-green-800';
      case 'UPDATE':
        return 'bg-yellow-100 text-yellow-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      case 'QUERY_EXECUTE':
        return 'bg-purple-100 text-purple-800';
      case 'BRANCH_VIEW':
        return 'bg-blue-100 text-blue-800';
      case 'PATIENT_UPDATE':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return 'Giriş Yapıldı';
      case 'LOGOUT':
        return 'Çıkış Yapıldı';
      case 'PAGE_VIEW':
        return 'Sayfa Ziyaret Edildi';
      case 'CREATE':
        return 'Kayıt Oluşturuldu';
      case 'UPDATE':
        return 'Kayıt Güncellendi';
      case 'DELETE':
        return 'Kayıt Silindi';
      case 'QUERY_EXECUTE':
        return 'Sorgu Çalıştırıldı';
      case 'BRANCH_VIEW':
        return 'Şube Görüntülendi';
      case 'PATIENT_UPDATE':
        return 'Hasta Güncellendi';
      default:
        return action;
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.action.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    const matchesUser = filterUser === 'all' || log.username === filterUser;
    
    return matchesSearch && matchesAction && matchesUser;
  });

  const uniqueUsers = [...new Set(logs.map(log => log.username))];
  const uniqueActions = [...new Set(logs.map(log => log.action))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-xl border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link href="/admin" className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                  <ArrowLeft className="h-6 w-6" />
                </Link>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Aktivite Logları</h1>
                  <p className="text-gray-600 mt-1">Kullanıcı aktiviteleri ve sistem işlemleri</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={loadActivityLogs}
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-all duration-300 font-semibold flex items-center space-x-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>Yenile</span>
                </button>
                <button className="bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition-all duration-300 font-semibold flex items-center space-x-2">
                  <Download className="h-4 w-4" />
                  <span>Dışa Aktar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Arama</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Kullanıcı, işlem veya detay ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">İşlem Türü</label>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tüm İşlemler</option>
                {uniqueActions.map(action => (
                  <option key={action} value={action}>{getActionText(action)}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Kullanıcı</label>
              <select
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tüm Kullanıcılar</option>
                {uniqueUsers.map(user => (
                  <option key={user} value={user}>{user}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterAction('all');
                  setFilterUser('all');
                }}
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-200 transition-all duration-300 font-semibold"
              >
                Filtreleri Temizle
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Toplam Log</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{logs.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Aktif Kullanıcı</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{uniqueUsers.length}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Bugün</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {logs.filter(log => {
                    const today = new Date();
                    const logDate = new Date(log.created_at);
                    return logDate.toDateString() === today.toDateString();
                  }).length}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Son 24 Saat</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {logs.filter(log => {
                    const now = new Date();
                    const logDate = new Date(log.created_at);
                    const diffHours = (now.getTime() - logDate.getTime()) / (1000 * 60 * 60);
                    return diffHours <= 24;
                  }).length}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-xl">
                <Activity className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Activity Logs Table */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Aktivite Detayları</h2>
            <p className="text-sm text-gray-600">Filtrelenmiş {filteredLogs.length} sonuç</p>
          </div>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Aktivite logları yükleniyor...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Activity className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-lg">Aktivite logu bulunamadı</p>
              <p className="text-sm">Filtreleri değiştirmeyi deneyin</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlem
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kullanıcı
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Detay
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      HTTP
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP Adresi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Zaman
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Detaylar
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getActionIcon(log.action)}
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                            {getActionText(log.action)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{log.username}</div>
                        <div className="text-sm text-gray-500">ID: {log.user_id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">{log.details}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${
                            log.http_method === 'GET' ? 'bg-blue-100 text-blue-800' :
                            log.http_method === 'POST' ? 'bg-green-100 text-green-800' :
                            log.http_method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                            log.http_method === 'DELETE' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {log.http_method || 'N/A'}
                          </span>
                        </div>
                        {log.request_path && (
                          <div className="text-xs text-gray-500 font-mono mt-1">
                            {log.request_path}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-mono">{log.ip_address}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(log.created_at).toLocaleString('tr-TR')}
                        </div>
                        {log.session_duration && (
                          <div className="text-xs text-gray-500">
                            Oturum: {Math.floor(log.session_duration / 60)} dk
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          {log.page_url && (
                            <div className="text-sm">
                              <span className="text-gray-600 font-medium">Sayfa:</span>
                              <Link 
                                href={log.page_url}
                                className="ml-2 text-blue-600 hover:text-blue-800 font-medium"
                              >
                                {log.page_url}
                              </Link>
                            </div>
                          )}
                          {log.additional_info && Object.keys(log.additional_info).length > 0 && (
                            <div className="text-sm">
                              <span className="text-gray-600 font-medium">Ek Bilgi:</span>
                              <div className="mt-1 text-xs bg-gray-50 p-2 rounded border">
                                <pre className="whitespace-pre-wrap text-gray-700">
                                  {JSON.stringify(log.additional_info, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                          {log.response_info && Object.keys(log.response_info).length > 0 && (
                            <div className="text-sm">
                              <span className="text-gray-600 font-medium">Yanıt:</span>
                              <div className="mt-1 text-xs bg-gray-50 p-2 rounded border">
                                <pre className="whitespace-pre-wrap text-gray-700">
                                  {JSON.stringify(log.response_info, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
