'use client';

import Link from 'next/link';
import { 
  Building2, 
  Users, 
  Calendar, 
  Stethoscope, 
  FileText, 
  BarChart3,
  Settings,
  UserPlus,
  Database,
  Code,
  Save,
  Play,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  Shield,
  LogOut
} from 'lucide-react';

export default function AdminPanel() {
  // Mock şube verileri
  const branches = [
    { 
      id: '1', 
      name: 'İstanbul Kadıköy Şubesi', 
      code: 'IST-001', 
      patients: 1247, 
      appointments: 23, 
      revenue: 45230,
      manager: 'Dr. Ayşe Kaya',
      status: 'active'
    },
    { 
      id: '2', 
      name: 'Ankara Kızılay Şubesi', 
      code: 'ANK-001', 
      patients: 892, 
      appointments: 18, 
      revenue: 32150,
      manager: 'Dr. Ali Yıldız',
      status: 'active'
    },
    { 
      id: '3', 
      name: 'İzmir Alsancak Şubesi', 
      code: 'IZM-001', 
      patients: 756, 
      appointments: 15, 
      revenue: 28420,
      manager: 'Dr. Mehmet Demir',
      status: 'active'
    }
  ];

  // Mock kaydedilmiş sorgular
  const savedQueries = [
    {
      id: '1',
      name: 'Gelir Analizi',
      description: 'Aylık gelir trendi ve şube bazında karşılaştırma',
      sql: 'SELECT branch_name, SUM(revenue) as total_revenue FROM invoices GROUP BY branch_name',
      category: 'Finansal',
      lastRun: '2024-01-15',
      usage: 45
    },
    {
      id: '2',
      name: 'Hasta Demografisi',
      description: 'Yaş ve cinsiyet bazında hasta dağılımı',
      sql: 'SELECT age_group, gender, COUNT(*) as patient_count FROM patients GROUP BY age_group, gender',
      category: 'Hasta',
      lastRun: '2024-01-14',
      usage: 23
    },
    {
      id: '3',
      name: 'Randevu Yoğunluğu',
      description: 'Günlük ve saatlik randevu yoğunluğu analizi',
      sql: 'SELECT date, hour, COUNT(*) as appointment_count FROM appointments GROUP BY date, hour',
      category: 'Randevu',
      lastRun: '2024-01-13',
      usage: 67
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Admin Header */}
      <header className="bg-white shadow-xl border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="bg-gradient-to-r from-red-600 via-purple-600 to-indigo-600 p-4 rounded-2xl shadow-2xl">
                  <Settings className="h-10 w-10 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-red-900 to-purple-900 bg-clip-text text-transparent">
                    Admin Paneli
                  </h1>
                  <p className="text-xl text-gray-600 mt-2 font-medium">Sistem Yönetimi ve Veritabanı Sorguları</p>
                  <p className="text-sm text-gray-500 mt-1">Merkezi HBYS Yönetim Sistemi</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Link href="/" className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-200 transition-all duration-300 font-semibold">
                  Ana Sayfa
                </Link>
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
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Toplam Şube</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{branches.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Building2 className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Kaydedilen Sorgu</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{savedQueries.length}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <Code className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Toplam Hasta</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{branches.reduce((sum, branch) => sum + branch.patients, 0).toLocaleString()}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Toplam Gelir</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">₺{branches.reduce((sum, branch) => sum + branch.revenue, 0).toLocaleString()}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-xl">
                <FileText className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Admin Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Şube Yönetimi */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Şube Yönetimi</h2>
                <p className="text-gray-600 mt-1">Şube ekleme, düzenleme ve yönetimi</p>
              </div>
              <Link href="/admin/branches" className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-xl hover:shadow-lg transition-all duration-300 font-semibold flex items-center">
                <Plus className="h-4 w-4 mr-2" />
                Şubeleri Yönet
              </Link>
            </div>
            
            <div className="space-y-4">
              {branches.map((branch) => (
                <div key={branch.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <h3 className="font-semibold text-gray-900">{branch.name}</h3>
                    <p className="text-sm text-gray-500">{branch.code}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link href={`/admin/branches/${branch.id}`} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Eye className="h-4 w-4" />
                    </Link>
                    <Link href={`/admin/branches/${branch.id}/edit`} className="p-2 text-green-600 hover:bg-green-50 rounded-lg">
                      <Edit className="h-4 w-4" />
                    </Link>
                    <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <Link href="/admin/branches" className="bg-gray-100 text-gray-700 px-4 py-3 rounded-xl text-center hover:bg-gray-200 transition-all duration-300 font-semibold">
                Tüm Şubeler
              </Link>
              <Link href="/admin/branches/analytics" className="bg-blue-100 text-blue-700 px-4 py-3 rounded-xl text-center hover:bg-blue-200 transition-all duration-300 font-semibold">
                Şube Analizleri
              </Link>
            </div>
          </div>

          {/* Kullanıcı Yönetimi */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Kullanıcı Yönetimi</h2>
                <p className="text-gray-600 mt-1">Kullanıcı ekleme, düzenleme ve yetkilendirme</p>
              </div>
              <Link href="/admin/users" className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-xl hover:shadow-lg transition-all duration-300 font-semibold flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Kullanıcıları Yönet
              </Link>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">Kullanıcı Ekleme</h3>
                    <p className="text-sm text-gray-500">Yeni kullanıcı hesabı oluştur</p>
                  </div>
                  <Link href="/admin/users" className="p-2 text-green-600 hover:bg-green-50 rounded-lg">
                    <Plus className="h-4 w-4" />
                  </Link>
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">Rol Yönetimi</h3>
                    <p className="text-sm text-gray-500">Kullanıcı yetkilerini düzenle</p>
                  </div>
                  <Link href="/admin/users" className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Shield className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <Link href="/admin/users" className="bg-gray-100 text-gray-700 px-4 py-3 rounded-xl text-center hover:bg-gray-200 transition-all duration-300 font-semibold">
                Tüm Kullanıcılar
              </Link>
              <Link href="/admin/users/roles" className="bg-green-100 text-green-700 px-4 py-3 rounded-xl text-center hover:bg-green-200 transition-all duration-300 font-semibold">
                Rol Analizleri
              </Link>
            </div>
          </div>

          {/* Veritabanı Sorgu Sistemi */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Veritabanı Sorguları</h2>
                <p className="text-gray-600 mt-1">SQL sorguları yazma ve kaydetme</p>
              </div>
              <Link href="/admin/queries/new" className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-xl hover:shadow-lg transition-all duration-300 font-semibold flex items-center">
                <Code className="h-4 w-4 mr-2" />
                Yeni Sorgu
              </Link>
            </div>
            
            <div className="space-y-4">
              {savedQueries.map((query) => (
                <div key={query.id} className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{query.name}</h3>
                      <p className="text-sm text-gray-500">{query.description}</p>
                      <p className="text-xs text-gray-400 mt-1">Kategori: {query.category}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Çalıştır">
                        <Play className="h-4 w-4" />
                      </button>
                      <Link href={`/admin/queries/${query.id}/edit`} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Düzenle">
                        <Edit className="h-4 w-4" />
                      </Link>
                      <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Sil">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Son çalıştırma: {query.lastRun} | Kullanım: {query.usage} kez
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <Link href="/admin/queries" className="bg-gray-100 text-gray-700 px-4 py-3 rounded-xl text-center hover:bg-gray-200 transition-all duration-300 font-semibold">
                Tüm Sorgular
              </Link>
              <Link href="/admin/database" className="bg-green-100 text-green-700 px-4 py-3 rounded-xl text-center hover:bg-green-200 transition-all duration-300 font-semibold">
                Veritabanı Ayarları
              </Link>
            </div>
          </div>
        </div>

        {/* Additional Admin Tools */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/admin/patients" className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <Users className="h-8 w-8 text-blue-600" />
              <span className="text-sm text-gray-500">Hasta Yönetimi</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Hasta Kayıtları</h3>
            <p className="text-gray-600 text-sm">Hasta ekleme, düzenleme ve arama işlemleri</p>
          </Link>

          <Link href="/admin/appointments" className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <Calendar className="h-8 w-8 text-purple-600" />
              <span className="text-sm text-gray-500">Randevu Sistemi</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Randevu Yönetimi</h3>
            <p className="text-gray-600 text-sm">Randevu oluşturma ve takvim yönetimi</p>
          </Link>

          <Link href="/admin/reports" className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <BarChart3 className="h-8 w-8 text-green-600" />
              <span className="text-sm text-gray-500">Rapor Sistemi</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Raporlar</h3>
            <p className="text-gray-600 text-sm">Özel raporlar ve analizler</p>
          </Link>
        </div>
      </main>
    </div>
  );
}
