'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../../lib/api';
import Link from 'next/link';
import { 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  BarChart3, 
  Calendar, 
  User, 
  Eye, 
  Edit, 
  Trash2, 
  ArrowRight,
  Home,
  TrendingUp,
  Database,
  Lightbulb,
  Clock,
  Tag,
  Star,
  Zap,
  BarChart,
  PieChart,
  LineChart
} from 'lucide-react';

interface SavedQuery {
  id: number;
  name: string;
  description: string;
  sql_query: string;
  category: string;
  is_public: boolean;
  created_by: string;
  created_at: string;
}

interface AxisOption {
  value: string;
  label: string;
  type: string;
  table?: string;
  sourceField?: string;
  sourceTable?: string;
}

interface AxisOptions {
  xAxis: AxisOption[];
  yAxis: AxisOption[];
}

export default function ReportsPage() {
  const [queries, setQueries] = useState<SavedQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tüm Kategoriler');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'category'>('date');
  const [userRole, setUserRole] = useState<string>('user'); // Kullanıcı rolü
  
  // Dinamik grafik ayarları
  const [showAdvancedChart, setShowAdvancedChart] = useState(false);
  const [axisOptions, setAxisOptions] = useState<AxisOptions>({ xAxis: [], yAxis: [] });
  const [selectedXAxis, setSelectedXAxis] = useState<AxisOption | null>(null);
  const [selectedYAxis, setSelectedYAxis] = useState<AxisOption | null>(null);
  const [sorting, setSorting] = useState<'asc' | 'desc'>('desc');
  const [aggregationMethod, setAggregationMethod] = useState<'sum' | 'count' | 'avg' | 'count_nonzero' | 'distinct'>('sum');
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [branchFilter, setBranchFilter] = useState<string>('');

  useEffect(() => {
    loadSavedQueries();
    loadAxisOptions();
    loadUserRole();
  }, []);

  // Kullanıcı rolünü yükle
  const loadUserRole = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        // JWT token'dan rol bilgisini çıkar (basit decode)
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role || 'user');
      }
    } catch (error) {
      console.log('Kullanıcı rolü yüklenemedi, varsayılan: user');
      setUserRole('user');
    }
  };

  const loadSavedQueries = async () => {
    try {
      // Önce public endpoint'i dene, başarısız olursa admin endpoint'i dene
      let response;
      try {
        response = await apiGet('http://localhost:5000/api/reports/public-queries');
        const data = await response.json();
        
        if (data.success) {
          setQueries(data.queries);
          return;
        }
      } catch (error) {
        console.log('Public endpoint başarısız, admin endpoint deneniyor...');
      }

      // Fallback: Admin endpoint'i dene
      response = await apiGet('http://localhost:5000/api/admin/database/save-query');
      const data = await response.json();
      
      if (data.success) {
        setQueries(data.queries);
      }
    } catch (error) {
      console.error('Raporlar yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  // Eksen seçeneklerini backend'den yükle
  const loadAxisOptions = async () => {
    try {
      const response = await apiGet('http://localhost:5000/api/reports/axis-options');
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API hatası:', errorData);
        throw new Error(errorData.message || 'API hatası');
      }
      
      const data = await response.json();
      if (data.success) {
        setAxisOptions(data.data);
        console.log('📊 Eksen seçenekleri yüklendi:', data.data);
      } else {
        throw new Error(data.message || 'Veri yüklenemedi');
      }
    } catch (error: any) {
      console.error('❌ Eksen seçenekleri yüklenirken hata:', error);
      alert(`Eksen seçenekleri yüklenemedi: ${error.message}`);
    }
  };

  // Dinamik grafik oluştur
  const createDynamicChart = async () => {
    if (!selectedXAxis || !selectedYAxis) {
      alert('Lütfen X ve Y eksenlerini seçin');
      return;
    }

    setChartLoading(true);
    try {

      console.log('🔍 Grafik oluşturuluyor:', {
        xAxis: selectedXAxis,
        yAxis: selectedYAxis,
        aggregationMethod,
        sorting
      });

      const response = await apiPost('http://localhost:5000/api/reports/dynamic-chart', {
        xAxis: selectedXAxis,
        yAxis: selectedYAxis,
        aggregationMethod,
        sorting,
        filters: {
          clinic_name: branchFilter || undefined
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Grafik API hatası:', errorData);
        throw new Error(errorData.message || 'Grafik oluşturulamadı');
      }
      
      const data = await response.json();
      if (data.success) {
        setChartData(data.data.chartData);
        console.log('📊 Grafik verisi oluşturuldu:', data.data);
      } else {
        throw new Error(data.message || 'Grafik verisi alınamadı');
      }
    } catch (error: any) {
      console.error('❌ Grafik oluşturulurken hata:', error);
      alert(`Grafik oluşturulamadı: ${error.message}`);
    } finally {
      setChartLoading(false);
    }
  };

  // Kategori listesini oluştur
  const categories = ['Tüm Kategoriler', ...new Set(queries.map(q => q.category))];

  // Filtreleme ve sıralama
  const filteredAndSortedQueries = queries
    .filter(query => {
      const matchesSearch = query.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          query.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Tüm Kategoriler' || query.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'category':
          return a.category.localeCompare(b.category);
        default:
          return 0;
      }
    });

  // Tarih formatla
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Kategori rengi
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Genel': 'bg-blue-100 text-blue-800',
      'Finans': 'bg-green-100 text-green-800',
      'Personel': 'bg-purple-100 text-purple-800',
      'Hasta': 'bg-pink-100 text-pink-800',
      'İstatistik': 'bg-orange-100 text-orange-800',
      'Test': 'bg-gray-100 text-gray-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  // Kategori ikonu
  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      'Genel': Database,
      'Finans': TrendingUp,
      'Personel': User,
      'Hasta': FileText,
      'İstatistik': BarChart3,
      'Test': Zap
    };
    return icons[category] || FileText;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Raporlar yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center gap-2 shadow-sm"
              >
                <Home className="h-4 w-4" />
                Anasayfa
              </Link>
              <div className="bg-blue-600 p-3 rounded-lg shadow-sm">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Raporlar
                </h1>
                <p className="text-gray-600 mt-1">Kayıtlı sorgular ve raporlar</p>
              </div>
            </div>
            
            <Link
              href="/admin/database"
              className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center gap-2 shadow-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              Yeni Sorgu
            </Link>
          </div>
        </div>

        {/* İstatistikler */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Toplam Rapor</p>
                <p className="text-2xl font-bold text-gray-900">{queries.length}</p>
              </div>
              <div className="bg-blue-100 p-2.5 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Bu Ay</p>
                <p className="text-2xl font-bold text-gray-900">
                  {queries.filter(q => {
                    const date = new Date(q.created_at);
                    const now = new Date();
                    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
              <div className="bg-green-100 p-2.5 rounded-lg">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Kategoriler</p>
                <p className="text-2xl font-bold text-gray-900">{new Set(queries.map(q => q.category)).size}</p>
              </div>
              <div className="bg-purple-100 p-2.5 rounded-lg">
                <Tag className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Dinamik Grafik</p>
                <button
                  onClick={() => setShowAdvancedChart(!showAdvancedChart)}
                  className="text-lg font-bold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {showAdvancedChart ? 'Gizle' : 'Göster'}
                </button>
              </div>
              <div className="bg-orange-100 p-2.5 rounded-lg">
                <BarChart className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Dinamik Grafik Ayarları */}
        {showAdvancedChart && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-orange-500 p-2.5 rounded-lg shadow-sm">
                <BarChart className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Gelişmiş Grafik Ayarları</h2>
                <p className="text-gray-600">X ve Y eksenlerinde tüm veri türlerini kullanarak dinamik grafik oluşturun</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* X Ekseni (Kategori/Tarih) */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-700">
                  X Ekseni (Kategori/Tarih)
                </label>
                <select
                  value={selectedXAxis?.value || ''}
                  onChange={(e) => {
                    const selected = axisOptions.xAxis.find(opt => opt.value === e.target.value);
                    setSelectedXAxis(selected || null);
                  }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                >
                  <option value="">X Ekseni Seçin</option>
                  {axisOptions.xAxis.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} ({option.type})
                    </option>
                  ))}
                </select>

                <select
                  value={sorting}
                  onChange={(e) => setSorting(e.target.value as 'asc' | 'desc')}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                >
                  <option value="desc">Azalan (Büyükten Küçüğe)</option>
                  <option value="asc">Artan (Küçükten Büyüğe)</option>
                </select>
              </div>

              {/* Y Ekseni (Sayısal Değer) */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-700">
                  Y Ekseni (Sayısal Değer)
                </label>
                <select
                  value={selectedYAxis?.value || ''}
                  onChange={(e) => {
                    const selected = axisOptions.yAxis.find(opt => opt.value === e.target.value);
                    setSelectedYAxis(selected || null);
                  }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                >
                  <option value="">Y Ekseni Seçin</option>
                  {axisOptions.yAxis.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} ({option.type})
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-2">
                  <BarChart className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-gray-600">Bar Grafik</span>
                </div>
              </div>

              {/* Toplama Yöntemi */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-700">
                  Toplama Yöntemi
                </label>
                <select
                  value={aggregationMethod}
                  onChange={(e) => setAggregationMethod(e.target.value as 'sum' | 'count' | 'avg' | 'count_nonzero' | 'distinct')}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                >
                  <option value="sum">Toplam</option>
                  <option value="count">Sayı</option>
                  <option value="avg">Ortalama</option>
                  <option value="count_nonzero">0'dan Farklı Say</option>
                  <option value="distinct">Benzersiz Sayı (Distinct)</option>
                </select>

                <button
                  onClick={createDynamicChart}
                  disabled={!selectedXAxis || !selectedYAxis || chartLoading}
                  className="w-full bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {chartLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <BarChart className="h-4 w-4" />
                      Grafiği Uygula
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Grafik Sonucu */}
            {chartData.length > 0 && (
              <div className="mt-6 p-5 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Grafik Sonucu</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {chartData.slice(0, 6).map((item, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <div className="text-sm text-gray-600">{item.label}</div>
                      <div className="text-2xl font-bold text-blue-600">{item.value}</div>
                    </div>
                  ))}
                </div>
                {chartData.length > 6 && (
                  <div className="mt-4 text-center text-gray-600">
                    +{chartData.length - 6} daha...
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Arama ve Filtreler */}
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6 border border-gray-100">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex-1 w-full lg:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rapor ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full lg:w-96 pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Sırala:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="date">Tarih</option>
                  <option value="name">İsim</option>
                  <option value="category">Kategori</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Rapor Kartları */}
        {filteredAndSortedQueries.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-10 text-center border border-gray-100">
            <FileText className="h-14 w-14 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Rapor Bulunamadı</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || selectedCategory !== 'Tüm Kategoriler' 
                ? 'Arama kriterlerinize uygun rapor bulunamadı.' 
                : 'Henüz hiç rapor oluşturulmamış.'}
            </p>
            {userRole === 'admin' ? (
              <Link
                href="/admin/database"
                className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                İlk Raporı Oluştur
              </Link>
            ) : (
              <div className="text-gray-500 text-sm">
                Yeni rapor oluşturmak için admin yetkisi gerekli
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredAndSortedQueries.map((query) => {
              const CategoryIcon = getCategoryIcon(query.category);
              
              return (
                <div key={query.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5 group">
                  <div className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="bg-blue-50 p-2.5 rounded-lg">
                        <CategoryIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getCategoryColor(query.category)}`}>
                          {query.category}
                        </span>
                        {query.is_public && (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                            <Eye className="h-3 w-3 inline mr-1" />
                            Genel
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* İçerik */}
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                        {query.name}
                      </h3>
                      <p className="text-gray-600 text-sm line-clamp-2">
                        {query.description || 'Açıklama bulunmuyor'}
                      </p>
                    </div>
                    
                    {/* Alt Bilgiler */}
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{query.created_by}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{formatDate(query.created_at)}</span>
                      </div>
                    </div>
                    
                    {/* Aksiyonlar */}
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/reports/${query.id}`}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center justify-center gap-2 font-medium"
                      >
                        <Eye className="h-4 w-4" />
                        Görüntüle
                      </Link>
                      
                      {/* Sadece admin kullanıcılar için düzenleme ve silme */}
                      {userRole === 'admin' && (
                        <>
                          <Link
                            href={`/admin/database?edit=${query.id}`}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                            title="Düzenle"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          
                          <button
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                            title="Sil"
                            onClick={() => {
                              if (confirm('Bu raporu silmek istediğinizden emin misiniz?')) {
                                // Silme işlemi
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Alt Bilgi */}
        <div className="mt-10 text-center">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <Lightbulb className="h-10 w-10 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Rapor Oluşturma İpuçları</h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Etkili raporlar oluşturmak için SQL sorgularınızı optimize edin, 
              kategorileri düzenli tutun ve açıklayıcı isimler kullanın.
            </p>
            <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span>Veritabanı bağlantısı gerekli</span>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span>Grafik ve filtreleme desteği</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <span>Hızlı sorgu çalıştırma</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 