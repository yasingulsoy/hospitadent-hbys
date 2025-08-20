'use client';

import Link from 'next/link';
import Header from './components/Header';
import { 
  Users, 
  Calendar, 
  DollarSign, 
  Building2,
  TrendingUp,
  CheckCircle,
  Clock,
  Activity,
  LogOut,
  Shield,
  BarChart3,
  PieChart,
  Target,
  FileText,
  TrendingDown,
  UserCheck,
  CalendarCheck,
  DollarSign as DollarSignIcon,
  Database,
  RefreshCw,
  XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../lib/api';

// Tip tanımlamaları
interface BranchCard {
  id: number;
  branch_name: string;
  location: string;
  branch_count: number;
  cards: CardData[];
}

interface CardData {
  card_title: string;
  formatted_value: string;
  data_type: string;
  card_icon?: string;
}

interface Branch {
  id: number;
  name: string;
  location?: string;
  branch_count?: number;
  patients?: number;
  appointments?: number;
  revenue?: number;
  code?: string;
  manager?: string;
  manager_name?: string; // Yeni eklenen
}

// Kayıtlı sorgu tipi
interface SavedQuery {
  id: number;
  name: string;
  description: string;
  sql_query: string;
  category: string;
  is_public: boolean;
  created_by: string;
  created_at: string;
  last_run?: string;
  usage_count?: number;
}

export default function Home() {
  const [role, setRole] = useState<number | null>(null);
  const [branchCards, setBranchCards] = useState<BranchCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [queriesLoading, setQueriesLoading] = useState(true);
  const [dbConnectionStatus, setDbConnectionStatus] = useState<{
    isConnected: boolean;
    lastCheck: string;
    message: string;
  }>({
    isConnected: false,
    lastCheck: 'Hiç kontrol edilmedi',
    message: 'Bağlantı durumu bilinmiyor'
  });
  const [checkingDbStatus, setCheckingDbStatus] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userStr = localStorage.getItem('user') || '';
        
        if (userStr) {
          const user = JSON.parse(userStr);
          setRole(typeof user?.role === 'number' ? user.role : null);
          
          // Token geçerliliğini backend'den kontrol et (cookie otomatik gönderilir)
          try {
            const response = await fetch('http://localhost:5000/api/auth/profile', {
              credentials: 'include' // Cookie'leri otomatik gönder
            });
            
            if (!response.ok) {
              // Token geçersiz, login'e yönlendir
              localStorage.removeItem('user');
              window.location.href = '/login';
              return;
            }
          } catch (error) {
            console.error('Token kontrol hatası:', error);
            // Hata durumunda da login'e yönlendir
            localStorage.removeItem('user');
            window.location.href = '/login';
            return;
          }
        } else {
          // Kullanıcı giriş yapmamışsa login'e yönlendir
          window.location.href = '/login';
          return;
        }
      } catch (error) {
        console.error('Kullanıcı bilgisi yüklenirken hata:', error);
        // Hata durumunda da login'e yönlendir
        localStorage.removeItem('user');
        window.location.href = '/login';
        return;
      }
      
      // Şube kartlarını yükle
      loadBranchCards().catch(error => {
        console.error('Şube kartları yüklenirken hata:', error);
      });

      // Kayıtlı sorguları yükle
      loadSavedQueries().catch(error => {
        console.error('Kayıtlı sorgular yüklenirken hata:', error);
      });

      // Veritabanı bağlantı durumunu kontrol et
      checkDatabaseConnection().catch(error => {
        console.error('Veritabanı bağlantı durumu kontrol edilirken hata:', error);
      });
    };
    
    checkAuth();
  }, []);

  const canSeeAdmin = role === 1 || role === 2;

  // Veritabanı bağlantı durumunu kontrol et
  const checkDatabaseConnection = async () => {
    setCheckingDbStatus(true);
    try {
      const response = await apiGet('http://localhost:5000/api/reports/connection-status');
      const data = await response.json();
      const ok = data?.success && data?.data;
      setDbConnectionStatus({
        isConnected: ok ? !!data.data.isConnected : false,
        lastCheck: new Date().toLocaleString('tr-TR'),
        message: ok && data.data.isConnected ? `${data.data.name || 'MariaDB'} bağlantısı aktif` : 'Bağlantı yok'
      });
    } catch (error) {
      setDbConnectionStatus({
        isConnected: false,
        lastCheck: new Date().toLocaleString('tr-TR'),
        message: 'Bağlantı kontrol edilemedi'
      });
    } finally {
      setCheckingDbStatus(false);
    }
  };

  // Kayıtlı sorguları yükle
  const loadSavedQueries = async () => {
    try {
      setQueriesLoading(true);
      // Normal kullanıcılar için herkese açık raporlar
      const response = await apiGet('http://localhost:5000/api/reports/public-queries');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSavedQueries(data.queries || []);
        }
      }
    } catch (error) {
      console.error('Kayıtlı sorgular yüklenirken hata:', error);
    } finally {
      setQueriesLoading(false);
    }
  };

  // Seçili şube için şube kartlarını yükle
  const loadBranchCards = async (branchId?: number) => {
    try {
      setLoading(true);
      const effectiveBranchId = typeof branchId === 'number' ? branchId : selectedBranchId;
      if (!effectiveBranchId) {
        setBranchCards([]);
        return;
      }

      const branch = realBranches.find((b) => b.id === effectiveBranchId);
      const execRes = await apiPost('http://localhost:5000/api/branch-cards/execute-cards', { branch_id: effectiveBranchId });
      if (!execRes.ok) {
        setBranchCards([]);
        return;
      }

      const execJson = await execRes.json();
      const cards = (execJson?.data || []).map((card: any) => ({
        card_title: card.card_title,
        formatted_value: card.formatted_value,
        data_type: card.data_type,
        card_icon: card.card_icon
      })) as CardData[];

      setBranchCards([
        {
          id: effectiveBranchId,
          branch_name: branch?.name || 'Şube',
          location: (branch as any)?.location || branch?.code || '',
          branch_count: 0,
          cards
        }
      ]);
      
    } catch (error: any) {
      console.error('Şube kartları yüklenirken hata:', error);
      // Hata durumunda boş liste göster
      setBranchCards([]);
    } finally {
      setLoading(false);
    }
  };

  const [realBranches, setRealBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);

  // Gerçek şube verilerini yükle
  useEffect(() => {
    loadRealBranches();
  }, []);

  // Şubeler yüklendiğinde varsayılan şubeyi seç ve kartları getir
  useEffect(() => {
    if (!selectedBranchId && realBranches.length > 0) {
      const firstId = realBranches[0].id;
      setSelectedBranchId(firstId);
      loadBranchCards(firstId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realBranches]);

  const loadRealBranches = async () => {
    try {
      setBranchesLoading(true);
      const response = await apiGet('http://localhost:5000/api/branches');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRealBranches(data.data || []);
        }
      }
    } catch (error) {
      console.error('Şubeler yüklenirken hata:', error);
    } finally {
      setBranchesLoading(false);
    }
  };

  const totalStats = {
    totalPatients: realBranches.reduce((sum, branch) => sum + (branch.patients || 0), 0),
    totalAppointments: realBranches.reduce((sum, branch) => sum + (branch.appointments || 0), 0),
    totalRevenue: realBranches.reduce((sum, branch) => sum + (branch.revenue || 0), 0),
    activeBranches: realBranches.length
  };

  // Kategori ikonları
  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'financial':
      case 'finansal':
        return <TrendingUp className="h-6 w-6 text-white" />;
      case 'patient':
      case 'hasta':
        return <Users className="h-6 w-6 text-white" />;
      case 'appointment':
      case 'randevu':
        return <Calendar className="h-6 w-6 text-white" />;
      case 'branch':
      case 'şube':
        return <Building2 className="h-6 w-6 text-white" />;
      case 'treatment':
      case 'tedavi':
        return <Activity className="h-6 w-6 text-white" />;
      case 'personnel':
      case 'personel':
        return <UserCheck className="h-6 w-6 text-white" />;
      case 'time':
      case 'zaman':
        return <Clock className="h-6 w-6 text-white" />;
      default:
        return <BarChart3 className="h-6 w-6 text-white" />;
    }
  };

  // Kategori renkleri
  const getCategoryColors = (category: string) => {
    switch (category.toLowerCase()) {
      case 'financial':
      case 'finansal':
        return 'from-green-50 to-emerald-100 border-green-200 bg-green-500 text-green-600 bg-green-100';
      case 'patient':
      case 'hasta':
        return 'from-blue-50 to-indigo-100 border-blue-200 bg-blue-500 text-blue-600 bg-blue-100';
      case 'appointment':
      case 'randevu':
        return 'from-purple-50 to-violet-100 border-purple-200 bg-purple-500 text-purple-600 bg-purple-100';
      case 'branch':
      case 'şube':
        return 'from-orange-50 to-amber-100 border-orange-200 bg-orange-500 text-orange-600 bg-orange-100';
      case 'treatment':
      case 'tedavi':
        return 'from-red-50 to-pink-100 border-red-200 bg-red-500 text-red-600 bg-red-100';
      case 'personnel':
      case 'personel':
        return 'from-indigo-50 to-blue-100 border-indigo-200 bg-indigo-500 text-indigo-600 bg-indigo-100';
      case 'time':
      case 'zaman':
        return 'from-cyan-50 to-blue-100 border-cyan-200 bg-cyan-500 text-cyan-600 bg-cyan-100';
      default:
        return 'from-gray-50 to-slate-100 border-gray-200 bg-gray-500 text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Header />
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Aktif Şube</p>
                <p className="text-4xl font-bold text-gray-900 mt-3">{totalStats.activeBranches}</p>
                <div className="flex items-center mt-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                  <p className="text-sm text-green-600 font-semibold">Tümü Aktif</p>
                </div>
              </div>
              <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl shadow-lg">
                <Building2 className="h-10 w-10 text-white" />
              </div>
            </div>
            {/* Sağ üst köşe dekoratif çizgi */}
            <div className="absolute top-0 right-0 w-16 h-1 bg-gradient-to-l from-blue-500 to-blue-600 rounded-bl-full"></div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Toplam Hasta</p>
                <p className="text-4xl font-bold text-gray-900 mt-3">{totalStats.totalPatients.toLocaleString()}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-blue-500 mr-1" />
                  <p className="text-sm text-blue-600 font-semibold">+12% bu ay</p>
                </div>
              </div>
              <div className="p-4 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl shadow-lg">
                <Users className="h-10 w-10 text-white" />
              </div>
            </div>
            {/* Sağ üst köşe dekoratif çizgi */}
            <div className="absolute top-0 right-0 w-16 h-1 bg-gradient-to-l from-green-500 to-green-600 rounded-bl-full"></div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Bugünkü Randevu</p>
                <p className="text-4xl font-bold text-gray-900 mt-3">{totalStats.totalAppointments}</p>
                <div className="flex items-center mt-2">
                  <Clock className="h-4 w-4 text-purple-500 mr-1" />
                  <p className="text-sm text-purple-600 font-semibold">8 randevu kaldı</p>
                </div>
              </div>
              <div className="p-4 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl shadow-lg">
                <Calendar className="h-10 w-10 text-white" />
              </div>
            </div>
            {/* Sağ üst köşe dekoratif çizgi */}
            <div className="absolute top-0 right-0 w-16 h-1 bg-gradient-to-l from-purple-500 to-purple-600 rounded-bl-full"></div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Aylık Gelir</p>
                <p className="text-4xl font-bold text-gray-900 mt-3">₺{totalStats.totalRevenue.toLocaleString()}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-orange-500 mr-1" />
                  <p className="text-sm text-orange-600 font-semibold">+8.5% geçen aya göre</p>
                </div>
              </div>
              <div className="p-4 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl shadow-lg">
                <DollarSign className="h-10 w-10 text-white" />
              </div>
            </div>
            {/* Sağ üst köşe dekoratif çizgi */}
            <div className="absolute top-0 right-0 w-16 h-1 bg-gradient-to-l from-orange-500 to-orange-600 rounded-bl-full"></div>
          </div>
        </div>

        {/* Database Connection Status Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-8 hover:shadow-2xl transition-all duration-300 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`p-3 rounded-xl ${dbConnectionStatus.isConnected ? 'bg-green-100' : 'bg-red-100'}`}>
                <Database className={`h-6 w-6 ${dbConnectionStatus.isConnected ? 'text-green-600' : 'text-red-600'}`} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Veritabanı Bağlantısı</h3>
                <p className="text-sm text-gray-600">MariaDB bağlantı durumu</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={checkDatabaseConnection}
                disabled={checkingDbStatus}
                className={`px-4 py-2 rounded-xl font-semibold transition-all duration-300 flex items-center space-x-2 ${
                  checkingDbStatus
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {checkingDbStatus ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                    <span>Kontrol Ediliyor</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    <span>Kontrol Et</span>
                  </>
                )}
              </button>
              {canSeeAdmin && (
                <Link href="/admin/database" className="bg-purple-600 text-white px-4 py-2 rounded-xl hover:bg-purple-700 transition-all duration-300 font-semibold">
                  Veritabanı Yönet →
                </Link>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-xl bg-gray-50">
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-2 ${
                dbConnectionStatus.isConnected ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {dbConnectionStatus.isConnected ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-600" />
                )}
              </div>
              <p className="text-sm font-semibold text-gray-600">Durum</p>
              <p className={`text-lg font-bold ${
                dbConnectionStatus.isConnected ? 'text-green-600' : 'text-red-600'
              }`}>
                {dbConnectionStatus.isConnected ? 'Bağlı' : 'Bağlantı Yok'}
              </p>
            </div>
            
            <div className="text-center p-4 rounded-xl bg-gray-50">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-2 bg-blue-100">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-sm font-semibold text-gray-600">Son Kontrol</p>
              <p className="text-lg font-bold text-gray-900">{dbConnectionStatus.lastCheck}</p>
            </div>
            
            <div className="text-center p-4 rounded-xl bg-gray-50">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-2 bg-purple-100">
                <Activity className="h-6 w-6 text-purple-600" />
              </div>
              <p className="text-sm font-semibold text-gray-600">Mesaj</p>
              <p className="text-sm font-medium text-gray-900 leading-tight">{dbConnectionStatus.message}</p>
            </div>
          </div>
          
          {/* Sağ üst köşe dekoratif çizgi */}
          <div className="absolute top-0 right-0 w-20 h-1 bg-gradient-to-l from-blue-500 to-purple-600 rounded-bl-full"></div>
        </div>

        {/* Enhanced Branch Management */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 mb-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Şube Yönetimi</h2>
              <p className="text-gray-600 mt-1">Tüm şubelerin performans ve durum takibi</p>
            </div>
            <div className="flex items-center space-x-4">
              {canSeeAdmin && (
                <Link href="/admin/branches" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all duration-300 font-semibold">
                  Şube Yönet →
                </Link>
              )}
              <Link href="/all-branches" className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition-all duration-300 font-semibold">
                Tüm Şubeler →
              </Link>
            </div>
          </div>
          
          {branchesLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Şubeler yükleniyor...</p>
            </div>
          ) : realBranches.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Building2 className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-lg">Henüz şube eklenmemiş</p>
              <p className="text-sm">Admin panelinden şube ekleyebilirsiniz</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {realBranches.map((branch) => (
                <div key={branch.id} className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 relative overflow-hidden">
                  {/* Üst kısım - Başlık ve durum */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{branch.name}</h3>
                      <p className="text-sm text-gray-500 font-mono">{branch.code}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Aktif
                      </span>
                    </div>
                  </div>
                  
                  {/* Şube verileri */}
                  <div className="space-y-4 mb-6">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                      <span className="text-gray-700 flex items-center font-medium">
                        <Users className="h-4 w-4 mr-3 text-blue-500" />
                        Hasta Sayısı
                      </span>
                      <span className="font-bold text-blue-600 text-lg">{(branch.patients || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl">
                      <span className="text-gray-700 flex items-center font-medium">
                        <Calendar className="h-4 w-4 mr-3 text-purple-500" />
                        Bugünkü Randevu
                      </span>
                      <span className="font-bold text-purple-600 text-lg">{branch.appointments || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                      <span className="text-gray-700 flex items-center font-medium">
                        <DollarSign className="h-4 w-4 mr-3 text-green-500" />
                        Aylık Gelir
                      </span>
                      <span className="font-bold text-green-600 text-lg">₺{(branch.revenue || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-700 flex items-center font-medium">
                        <Users className="h-4 w-4 mr-3 text-gray-500" />
                        Şube Müdürü
                      </span>
                      <span className="font-medium text-gray-900">{branch.manager_name || branch.manager || 'Belirtilmemiş'}</span>
                    </div>
                  </div>

                  {/* Butonlar */}
                  {canSeeAdmin ? (
                    <div className="flex space-x-3">
                      <Link
                        href={`/admin/branches/${branch.id}`}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 rounded-xl text-sm text-center hover:shadow-lg transition-all duration-300 font-semibold"
                      >
                        Detaylar
                      </Link>
                      <Link
                        href={`/admin/branches/${branch.id}/edit`}
                        className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 px-4 py-3 rounded-xl text-sm text-center hover:shadow-lg transition-all duration-300 font-semibold border border-gray-200"
                      >
                        Düzenle
                      </Link>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 font-medium text-center py-2">Admin yetkisi gerekli</div>
                  )}
                  
                  {/* Sağ üst köşe dekoratif çizgi */}
                  <div className="absolute top-0 right-0 w-20 h-1 bg-gradient-to-l from-blue-500 to-green-600 rounded-bl-full"></div>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Dinamik Rapor Kartları - PostgreSQL'den gelen sorgular */}
        <div className="mt-8 bg-white rounded-2xl shadow-xl p-8 border border-gray-100 mb-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Hızlı Raporlar</h2>
              <p className="text-gray-600 mt-1">PostgreSQL'den dinamik olarak yüklenen kayıtlı sorgular</p>
            </div>
            <Link href="/reports" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all duration-300 font-semibold">
              Tüm Raporlar →
            </Link>
          </div>
          
          {queriesLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Raporlar yükleniyor...</p>
            </div>
          ) : savedQueries.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-lg">Henüz kayıtlı sorgu yok</p>
              <p className="text-sm">Admin panelinden veritabanı sorguları ekleyebilirsiniz</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* İlk 9 sorguyu göster */}
              {savedQueries.slice(0, 9).map((query) => (
                <div key={query.id} className="group">
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 relative overflow-hidden">
                    {/* Üst kısım - İkon ve kategori */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg">
                        {getCategoryIcon(query.category)}
                      </div>
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        query.category === 'patient' || query.category === 'hasta' ? 'bg-blue-100 text-blue-700' :
                        query.category === 'branch' || query.category === 'şube' ? 'bg-orange-100 text-orange-700' :
                        query.category === 'financial' || query.category === 'finansal' ? 'bg-green-100 text-green-700' :
                        query.category === 'appointment' || query.category === 'randevu' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {query.category || 'Genel'}
                      </span>
                    </div>
                    
                    {/* Başlık ve açıklama */}
                    <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-1">{query.name}</h3>
                    <p className="text-sm text-gray-600 mb-6 line-clamp-2 min-h-[2.5rem]">{query.description || 'Açıklama yok'}</p>
                    
                    {/* Alt kısım - Butonlar */}
                    <div className="flex space-x-3">
                      <button 
                        onClick={() => window.open(`/reports/${query.id}`, '_blank')}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                      >
                        <Activity className="h-4 w-4" />
                        <span>Çalıştır</span>
                      </button>
                      <Link 
                        href={`/reports/${query.id}`}
                        className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-center space-x-2 border border-gray-200"
                      >
                        <FileText className="h-4 w-4" />
                        <span>Detaylar</span>
                      </Link>
                    </div>
                    
                    {/* Hover efekti için arka plan */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-purple-50/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                    
                    {/* Sağ üst köşe dekoratif çizgi */}
                    <div className="absolute top-0 right-0 w-20 h-1 bg-gradient-to-l from-blue-500 to-purple-600 rounded-bl-full"></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Enhanced Today's Appointments */}
        <div className="mt-8 bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Bugünkü Randevular</h2>
              <p className="text-gray-600 mt-1">Tüm şubelerdeki günlük randevu takibi</p>
            </div>
            {canSeeAdmin && (
              <Link href="/admin/appointments" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all duration-300 font-semibold">
                Admin Panelinde Gör →
              </Link>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Şube
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Saat
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Hasta
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Doktor
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    İşlem
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Durum
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">İstanbul Kadıköy</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">09:00</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">Mehmet Demir</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">Dr. Ayşe Kaya</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">Kontrol</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Onaylandı
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">Ankara Kızılay</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">10:30</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">Fatma Özkan</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">Dr. Ali Yıldız</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">Dolgu</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">
                      <Clock className="h-3 w-3 mr-1" />
                      Bekliyor
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">İzmir Alsancak</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">14:00</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">Can Yılmaz</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">Dr. Ayşe Kaya</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">Temizlik</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">
                      <Clock className="h-3 w-3 mr-1" />
                      İptal
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Hızlı Erişim Kartları */}
        <div className="mt-8 bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Hızlı Erişim</h2>
              <p className="text-gray-600 mt-1">Sık kullanılan sayfalara hızlı erişim</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link href="/appointments" className="group">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-500 rounded-xl shadow-lg">
                    <Calendar className="h-8 w-8 text-white" />
                  </div>
                  <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                    Randevu
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Randevu Yönetimi</h3>
                <p className="text-sm text-gray-600">Randevu oluştur, düzenle ve takip et</p>
                <div className="absolute top-0 right-0 w-16 h-1 bg-gradient-to-l from-blue-500 to-blue-600 rounded-bl-full"></div>
              </div>
            </Link>

            <Link href="/patients" className="group">
              <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-500 rounded-xl shadow-lg">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <span className="text-xs font-semibold bg-green-100 text-green-700 px-3 py-1 rounded-full">
                    Hasta
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Hasta Yönetimi</h3>
                <p className="text-sm text-gray-600">Hasta kayıtları ve bilgileri</p>
                <div className="absolute top-0 right-0 w-16 h-1 bg-gradient-to-l from-green-500 to-green-600 rounded-bl-full"></div>
              </div>
            </Link>

            <Link href="/treatments" className="group">
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-500 rounded-xl shadow-lg">
                    <Activity className="h-8 w-8 text-white" />
                  </div>
                  <span className="text-xs font-semibold bg-purple-100 text-purple-700 px-3 py-1 rounded-full">
                    Tedavi
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Tedavi Yönetimi</h3>
                <p className="text-sm text-gray-600">Tedavi planları ve takibi</p>
                <div className="absolute top-0 right-0 w-16 h-1 bg-gradient-to-l from-purple-500 to-purple-600 rounded-bl-full"></div>
              </div>
            </Link>

            <Link href="/invoices" className="group">
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-orange-500 rounded-xl shadow-lg">
                    <DollarSign className="h-8 w-8 text-white" />
                  </div>
                  <span className="text-xs font-semibold bg-orange-100 text-orange-700 px-3 py-1 rounded-full">
                    Fatura
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Fatura Yönetimi</h3>
                <p className="text-sm text-gray-600">Fatura oluştur ve takip et</p>
                <div className="absolute top-0 right-0 w-16 h-1 bg-gradient-to-l from-orange-500 to-orange-600 rounded-bl-full"></div>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
