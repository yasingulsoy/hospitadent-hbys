'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar,
  Activity,
  PieChart,
  Target,
  FileText,
  Plus,
  Search,
  Filter
} from 'lucide-react';
import Link from 'next/link';

interface SavedQuery {
  id: number;
  name: string;
  description: string;
  category: string;
  is_public: boolean;
  created_by: string;
  created_at: string;
}

export default function ReportsPage() {
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Kayıtlı sorguları yükle
  useEffect(() => {
    loadSavedQueries();
  }, []);

  const loadSavedQueries = async () => {
    try {
      // Artık doğrudan PostgreSQL'den veri çek, parametre gönderme
      const response = await fetch('http://localhost:5000/api/admin/database/save-query');
      const data = await response.json();
      
      if (data.success) {
        setSavedQueries(data.queries || []);
      }
    } catch (error) {
      console.error('Sorgular yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  // Kategorileri filtrele
  const categories = ['all', 'financial', 'operational', 'analytics', 'general'];
  
  const filteredQueries = savedQueries.filter(query => {
    const matchesSearch = query.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         query.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || query.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Kategori ikonları
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'financial': return <DollarSign className="h-5 w-5 text-green-600" />;
      case 'operational': return <Activity className="h-5 w-5 text-blue-600" />;
      case 'analytics': return <BarChart3 className="h-5 w-5 text-purple-600" />;
      default: return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  // Kategori etiketleri
  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'financial': return 'Finansal';
      case 'operational': return 'Operasyonel';
      case 'analytics': return 'Analitik';
      default: return 'Genel';
    }
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Raporlar</h1>
                <p className="text-gray-600 mt-1">Kayıtlı sorgular ve raporlar</p>
              </div>
            </div>
            
            <Link
              href="/admin/database?tab=query"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Yeni Sorgu</span>
            </Link>
          </div>
        </div>

        {/* Filtreler */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 mb-8 p-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Arama */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Rapor ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            {/* Kategori Filtresi */}
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-500" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tüm Kategoriler</option>
                {categories.filter(cat => cat !== 'all').map(category => (
                  <option key={category} value={category}>
                    {getCategoryLabel(category)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Raporlar Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQueries.length > 0 ? (
            filteredQueries.map((query) => (
              <Link
                key={query.id}
                href={`/reports/${query.id}`}
                className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {getCategoryIcon(query.category)}
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">{query.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        query.category === 'financial' ? 'bg-green-100 text-green-800' :
                        query.category === 'operational' ? 'bg-blue-100 text-blue-800' :
                        query.category === 'analytics' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {getCategoryLabel(query.category)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {query.description || 'Açıklama yok'}
                </p>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{query.created_by}</span>
                  <span>{new Date(query.created_at).toLocaleDateString('tr-TR')}</span>
                </div>
              </Link>
            ))
          ) : (
            <div className="col-span-full text-center py-20">
              <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                {searchTerm || selectedCategory !== 'all' ? 'Sonuç bulunamadı' : 'Henüz rapor yok'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchTerm || selectedCategory !== 'all' 
                  ? 'Arama kriterlerinizi değiştirmeyi deneyin'
                  : 'İlk raporunuzu oluşturmak için "Yeni Sorgu" butonuna tıklayın'
                }
              </p>
              {!searchTerm && selectedCategory === 'all' && (
                <Link
                  href="/admin/database?tab=query"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold inline-flex items-center space-x-2 transition-colors"
                >
                  <Plus className="h-5 w-5" />
                  <span>İlk Raporu Oluştur</span>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 