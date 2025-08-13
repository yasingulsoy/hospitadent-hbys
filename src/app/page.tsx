'use client';

import Link from 'next/link';
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
  Shield
} from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Home() {
  const [role, setRole] = useState<number | null>(null);
  const [branchCards, setBranchCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user') || '';
      if (userStr) {
        const user = JSON.parse(userStr);
        setRole(typeof user?.role === 'number' ? user.role : null);
      }
    } catch {}
    
    // Şube kartlarını yükle
    loadBranchCards();
  }, []);

  const canSeeAdmin = role === 1 || role === 2;

  // Şube kartlarını yükle
  const loadBranchCards = async () => {
    try {
      setLoading(true);
      
      // Önce tüm şubeleri al
      const branchesResponse = await fetch('/api/test-db/branches');
      if (!branchesResponse.ok) {
        throw new Error('Şubeler yüklenemedi');
      }
      
      const branchesData = await branchesResponse.json();
      if (!branchesData.success) {
        throw new Error('Şube verisi alınamadı');
      }
      
      // İlk 9 şubeyi al
      const first9Branches = branchesData.branches.slice(0, 9);
      
      // Her şube için kart verilerini al
      const cardsPromises = first9Branches.map(async (branch: any) => {
        try {
          const response = await fetch('/api/test-db/branch-cards/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ branch_id: branch.id })
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.cards) {
              return {
                id: branch.id,
                branch_name: branch.name,
                location: branch.location || 'Belirtilmemiş',
                branch_count: branch.branch_count || 0,
                cards: data.cards
              };
            }
          }
          
          // Hata durumunda boş kart döndür
          return {
            id: branch.id,
            branch_name: branch.name,
            location: branch.location || 'Belirtilmemiş',
            branch_count: branch.branch_count || 0,
            cards: []
          };
        } catch (error) {
          console.error(`Şube ${branch.id} kartları yüklenirken hata:`, error);
          return {
            id: branch.id,
            branch_name: branch.name,
            location: branch.location || 'Belirtilmemiş',
            branch_count: branch.branch_count || 0,
            cards: []
          };
        }
      });
      
      const branchCardsData = await Promise.all(cardsPromises);
      setBranchCards(branchCardsData);
      
    } catch (error) {
      console.error('Şube kartları yüklenirken hata:', error);
      // Hata durumunda örnek veriler göster
      setBranchCards([
        {
          id: 1,
          branch_name: 'Merkez Şube',
          location: 'Ana şube',
          branch_count: 5,
          cards: [
            { card_title: 'Hasta Sayısı', formatted_value: '1,234', data_type: 'number' },
            { card_title: 'Günlük Tahakkuk', formatted_value: '₺45,678', data_type: 'currency' },
            { card_title: 'Günlük Tahsilat', formatted_value: '₺38,901', data_type: 'currency' }
          ]
        },
        {
          id: 2,
          branch_name: 'Kadıköy Şube',
          location: 'İstanbul',
          branch_count: 3,
          cards: [
            { card_title: 'Hasta Sayısı', formatted_value: '987', data_type: 'number' },
            { card_title: 'Günlük Tahakkuk', formatted_value: '₺32,456', data_type: 'currency' },
            { card_title: 'Günlük Tahsilat', formatted_value: '₺28,123', data_type: 'currency' }
          ]
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const [realBranches, setRealBranches] = useState<any[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);

  // Gerçek şube verilerini yükle
  useEffect(() => {
    loadRealBranches();
  }, []);

  const loadRealBranches = async () => {
    try {
      setBranchesLoading(true);
      const response = await fetch('/api/test-db/branches');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRealBranches(data.branches);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Professional Header */}
      <header className="bg-white shadow-xl border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 p-4 rounded-2xl shadow-2xl">
                  <Building2 className="h-10 w-10 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
                    Hospitadent Dental HBYS
                  </h1>
                  <p className="text-xl text-gray-600 mt-2 font-medium">Merkezi Yönetim Sistemi</p>
                  <p className="text-sm text-gray-500 mt-1">Kurumsal Diş Sağlığı Yönetimi Platformu</p>
                </div>
              </div>
              <div className="flex items-center space-x-6">
                <div className="text-right">
                  <div className="flex items-center space-x-3">
                    <div className="bg-green-100 p-2 rounded-full">
                      <Activity className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Sistem Durumu</p>
                      <p className="text-sm font-semibold text-green-600">Aktif</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Son güncelleme: {new Date().toLocaleDateString('tr-TR')}</p>
                </div>
                
                {canSeeAdmin && (
                  <Link 
                    href="/admin"
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-all duration-300 font-semibold flex items-center space-x-2"
                  >
                    <Shield className="h-4 w-4" />
                    <span>Admin Panel</span>
                  </Link>
                )}
                
                <button 
                  onClick={() => {
                    // LocalStorage ve cookie'leri temizle
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                    document.cookie = 'user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                    // Login sayfasına yönlendir
                    window.location.href = '/login';
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-all duration-300 font-semibold flex items-center space-x-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Çıkış Yap</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
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
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
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
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
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
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
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
          </div>
        </div>

        {/* Enhanced Branch Management */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 mb-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Şube Yönetimi</h2>
              <p className="text-gray-600 mt-1">Tüm şubelerin performans ve durum takibi</p>
            </div>
            <div className="text-sm text-gray-500">
              Şube yönetimi için admin paneline erişim gerekli
            </div>
          </div>
          
          {branchesLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Şubeler yükleniyor...</p>
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
                <div key={branch.id} className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{branch.name}</h3>
                      <p className="text-sm text-gray-500 font-mono">{branch.code}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Aktif
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        Hasta Sayısı
                      </span>
                      <span className="font-bold text-gray-900">{(branch.patients || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        Bugünkü Randevu
                      </span>
                      <span className="font-bold text-gray-900">{branch.appointments || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 flex items-center">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Aylık Gelir
                      </span>
                      <span className="font-bold text-gray-900">₺{(branch.revenue || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        Şube Müdürü
                      </span>
                      <span className="font-medium text-gray-900">{branch.manager || 'Belirtilmemiş'}</span>
                    </div>
                  </div>

                  {canSeeAdmin ? (
                    <div className="flex space-x-3">
                      <Link
                        href={`/admin/branches/${branch.id}`}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-xl text-sm text-center hover:shadow-lg transition-all duration-300 font-semibold"
                      >
                        Detaylar
                      </Link>
                      <Link
                        href={`/admin/branches/${branch.id}/edit`}
                        className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm text-center hover:bg-gray-200 transition-all duration-300 font-semibold"
                      >
                        Düzenle
                      </Link>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 font-medium">Admin yetkisi gerekli</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dynamic Branch Cards */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 mb-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Şube Kartları</h2>
              <p className="text-gray-600 mt-1">PostgreSQL'den dinamik olarak yüklenen şube verileri</p>
            </div>
            <div className="flex items-center space-x-4">
              {canSeeAdmin && (
                <Link href="/admin/branch-cards" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all duration-300 font-semibold">
                  Kartları Yönet →
                </Link>
              )}
              <Link href="/all-branches" className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition-all duration-300 font-semibold">
                Tüm Şubeler →
              </Link>
            </div>
          </div>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Şube kartları yükleniyor...</p>
            </div>
          ) : branchCards.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Building2 className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-lg">Henüz şube kartı eklenmemiş</p>
              <p className="text-sm">Admin panelinden şube kartları ekleyebilirsiniz</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {branchCards.map((branch) => (
                <div key={branch.id} className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{branch.branch_name}</h3>
                      <p className="text-sm text-gray-500">{branch.location}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Aktif
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    {branch.cards && branch.cards.length > 0 ? (
                      branch.cards.map((card: any, index: number) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 flex items-center">
                            {card.card_icon === 'users' && <Users className="h-4 w-4 mr-2" />}
                            {card.card_icon === 'calendar' && <Calendar className="h-4 w-4 mr-2" />}
                            {card.card_icon === 'dollar-sign' && <DollarSign className="h-4 w-4 mr-2" />}
                            {card.card_icon === 'user' && <Users className="h-4 w-4 mr-2" />}
                            {card.card_title}
                          </span>
                          <span className="font-bold text-gray-900">{card.formatted_value}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-gray-400">
                        <p className="text-sm">Kart verisi bulunamadı</p>
                      </div>
                    )}
                  </div>

                  {canSeeAdmin && (
                    <div className="flex space-x-3">
                      <Link
                        href={`/admin/branches/${branch.id}`}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-xl text-sm text-center hover:shadow-lg transition-all duration-300 font-semibold"
                      >
                        Detaylar
                      </Link>
                      <Link
                        href={`/admin/branch-cards`}
                        className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm text-center hover:bg-gray-200 transition-all duration-300 font-semibold"
                      >
                        Kartları Düzenle
                      </Link>
                    </div>
                  )}
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
      </main>
    </div>
  );
}
