'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPut, apiDelete } from '../../../lib/api';
import Link from 'next/link';
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Activity,
  Code,
  Eye,
  MoreVertical,
  Search,
  Filter,
  Calendar,
  User,
  Database
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
  last_run?: string;
  usage_count?: number;
}

export default function QueriesPage() {
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingQuery, setEditingQuery] = useState<SavedQuery | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    category: 'general',
    is_public: false,
    sql_query: ''
  });

  useEffect(() => {
    loadSavedQueries();
  }, []);

  const loadSavedQueries = async () => {
    try {
      setLoading(true);
      
      // Token durumunu debug et
      const getCookie = (name: string) => {
        if (typeof document === 'undefined') return null;
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return null;
      };
      
      const token = getCookie('token');
      console.log('🔍 Token durumu:', {
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
        tokenStart: token ? token.substring(0, 20) + '...' : 'none',
        allCookies: document.cookie
      });
      
      const response = await apiGet('http://localhost:5000/api/admin/database/save-query');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSavedQueries(data.queries || []);
        }
      } else {
        console.error('❌ API yanıtı başarısız:', response.status, response.statusText);
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Hata detayı:', errorData);
      }
    } catch (error) {
      console.error('❌ Kayıtlı sorgular yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (query: SavedQuery) => {
    setEditingQuery(query);
    setEditForm({
      name: query.name,
      description: query.description,
      category: query.category,
      is_public: query.is_public,
      sql_query: query.sql_query
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!editingQuery) return;
    
    try {
      const response = await apiPut(`http://localhost:5000/api/admin/database/save-query/${editingQuery.id}`, editForm);
      
      if (response.ok) {
        alert('Sorgu başarıyla güncellendi!');
        setShowEditModal(false);
        setEditingQuery(null);
        loadSavedQueries();
      } else {
        alert('Güncelleme hatası!');
      }
    } catch (error) {
      alert('Güncelleme hatası!');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu sorguyu silmek istediğinizden emin misiniz?')) return;
    
    try {
      const response = await apiDelete(`http://localhost:5000/api/admin/database/save-query/${id}`);
      
      if (response.ok) {
        alert('Sorgu başarıyla silindi!');
        loadSavedQueries();
      } else {
        alert('Silme hatası!');
      }
    } catch (error) {
      alert('Silme hatası!');
    }
  };

  const executeQuery = (id: number) => {
    window.open(`/reports/${id}`, '_blank');
  };

  const filteredQueries = savedQueries.filter(query => {
    const matchesSearch = query.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         query.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || query.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', 'general', 'financial', 'patient', 'appointment', 'branch', 'treatment', 'personnel', 'time'];

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'financial': return <Activity className="h-4 w-4" />;
      case 'patient': return <User className="h-4 w-4" />;
      case 'appointment': return <Calendar className="h-4 w-4" />;
      case 'branch': return <Database className="h-4 w-4" />;
      case 'treatment': return <Activity className="h-4 w-4" />;
      case 'personnel': return <User className="h-4 w-4" />;
      case 'time': return <Calendar className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'financial': return 'bg-green-100 text-green-800';
      case 'patient': return 'bg-blue-100 text-blue-800';
      case 'appointment': return 'bg-purple-100 text-purple-800';
      case 'branch': return 'bg-orange-100 text-orange-800';
      case 'treatment': return 'bg-red-100 text-red-800';
      case 'personnel': return 'bg-indigo-100 text-indigo-800';
      case 'time': return 'bg-cyan-100 text-cyan-800';
      default: return 'bg-gray-100 text-gray-800';
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
                <Code className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Sorgu Yönetimi</h1>
                <p className="text-gray-600 mt-1">PostgreSQL'deki kayıtlı sorguları yönetin</p>
              </div>
            </div>
            
            <Link 
              href="/admin/queries/new"
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all duration-300 font-semibold flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Yeni Sorgu</span>
            </Link>
          </div>
        </div>

        {/* Filtreler */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-gray-100">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Sorgu ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-500" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'Tüm Kategoriler' : category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Sorgu Listesi */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Sorgular yükleniyor...</p>
            </div>
          ) : filteredQueries.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-lg">Sorgu bulunamadı</p>
              <p className="text-sm">Arama kriterlerinizi değiştirmeyi deneyin</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredQueries.map((query) => (
                <div key={query.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{query.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(query.category)}`}>
                          {query.category}
                        </span>
                        {query.is_public && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Genel
                          </span>
                        )}
                      </div>
                      
                      <p className="text-gray-600 mb-3">{query.description || 'Açıklama yok'}</p>
                      
                      <div className="flex items-center space-x-6 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <User className="h-4 w-4" />
                          <span>{query.created_by || 'Admin'}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(query.created_at).toLocaleDateString('tr-TR')}</span>
                        </div>
                        {query.last_run && (
                          <div className="flex items-center space-x-1">
                            <Activity className="h-4 w-4" />
                            <span>Son çalıştırma: {new Date(query.last_run).toLocaleDateString('tr-TR')}</span>
                          </div>
                        )}
                        {query.usage_count !== undefined && (
                          <div className="flex items-center space-x-1">
                            <Play className="h-4 w-4" />
                            <span>Kullanım: {query.usage_count} kez</span>
                          </div>
                        )}
                      </div>
                      
                      {/* SQL Kodu */}
                      <div className="mt-3 bg-gray-50 rounded-lg p-3">
                        <code className="text-xs text-gray-800 font-mono line-clamp-2">
                          {query.sql_query}
                        </code>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => executeQuery(query.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Çalıştır"
                      >
                        <Play className="h-5 w-5" />
                      </button>
                      
                      <button
                        onClick={() => handleEdit(query)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Düzenle"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      
                      <button
                        onClick={() => handleDelete(query.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Sil"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                      
                      <Link
                        href={`/reports/${query.id}`}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Görüntüle"
                      >
                        <Eye className="h-5 w-5" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Düzenleme Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Sorguyu Düzenle</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sorgu Adı *
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Açıklama
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kategori
                </label>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="general">Genel</option>
                  <option value="financial">Finansal</option>
                  <option value="patient">Hasta</option>
                  <option value="appointment">Randevu</option>
                  <option value="branch">Şube</option>
                  <option value="treatment">Tedavi</option>
                  <option value="personnel">Personel</option>
                  <option value="time">Zaman</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SQL Sorgusu *
                </label>
                <textarea
                  value={editForm.sql_query}
                  onChange={(e) => setEditForm({...editForm, sql_query: e.target.value})}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={editForm.is_public}
                  onChange={(e) => setEditForm({...editForm, is_public: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_public" className="ml-2 block text-sm text-gray-900">
                  Genel erişime açık
                </label>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleUpdate}
                disabled={!editForm.name.trim() || !editForm.sql_query.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                Güncelle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
