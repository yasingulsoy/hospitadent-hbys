'use client';

import Link from 'next/link';
import { 
  Building2, 
  Plus, 
  Edit, 
  Trash2, 
  ArrowLeft,
  Users,
  Calendar,
  DollarSign,
  Activity,
  Code,
  Save,
  Shield,
  Play,
  Database
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../../lib/api';

// Tip tanımlamaları
interface BranchCard {
  id?: number;
  branch_id: number;
  card_title: string;
  card_subtitle?: string;
  card_icon: string;
  sql_query?: string;
  data_type?: string;
  format_string?: string;
  order_index: number;
  is_active: boolean;
  branch_name?: string;
}

interface Branch {
  id: number;
  name: string;
  location?: string;
}

export default function BranchCardsManagement() {
  const [role, setRole] = useState<number | null>(null);
  const [branchCards, setBranchCards] = useState<BranchCard[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCard, setEditingCard] = useState<BranchCard | null>(null);
  const [testingQuery, setTestingQuery] = useState(false);
  const [queryResult, setQueryResult] = useState<any>(null);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user') || '';
      if (userStr) {
        const user = JSON.parse(userStr);
        setRole(typeof user?.role === 'number' ? user.role : null);
      }
    } catch {}
    
    // Şube kartlarını ve şubeleri yükle
    loadBranchCards();
    loadBranches();
  }, []);

  const canSeeAdmin = role === 1 || role === 2;

  // Şube kartlarını yükle
  const loadBranchCards = async () => {
    try {
      setLoading(true);
      
      const response = await apiGet('http://localhost:5000/api/branch-cards');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setBranchCards(data.data);
        }
      }
    } catch (error) {
      console.error('Şube kartları yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  // Şubeleri yükle
  const loadBranches = async () => {
    try {
      const response = await apiGet('http://localhost:5000/api/branches');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setBranches(data.data);
        }
      }
    } catch (error) {
      console.error('Şubeler yüklenirken hata:', error);
    }
  };

  // SQL sorgusu test et
  const testQuery = async (sqlQuery: string, branchId: number) => {
    if (!sqlQuery || !sqlQuery.trim()) {
      alert('Lütfen SQL sorgusu girin');
      return;
    }

    setTestingQuery(true);
    try {
      const response = await apiPost('http://localhost:5000/api/branch-cards/test-query', { sql_query: sqlQuery, branch_id: branchId });

      const data = await response.json();
      if (data.success) {
        setQueryResult(data.data);
      } else {
        alert('Hata: ' + data.message);
      }
    } catch (error) {
      console.error('Sorgu test hatası:', error);
      alert('Sorgu test edilirken hata oluştu');
    } finally {
      setTestingQuery(false);
    }
  };

  // Şube kartı ekle/güncelle
  const saveBranchCard = async (cardData: BranchCard) => {
    try {
      const url = editingCard ? `http://localhost:5000/api/branch-cards/${editingCard.id}` : 'http://localhost:5000/api/branch-cards';
      const response = editingCard
        ? await apiPut(url, cardData)
        : await apiPost(url, cardData);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          alert(editingCard ? 'Şube kartı güncellendi!' : 'Şube kartı eklendi!');
          await loadBranchCards();
          setShowAddForm(false);
          setEditingCard(null);
          setQueryResult(null);
        } else {
          alert('Hata: ' + data.message);
        }
      } else {
        alert('Kaydetme sırasında hata oluştu');
      }
    } catch (error) {
      console.error('Şube kartı kaydedilirken hata:', error);
      alert('Kaydetme sırasında hata oluştu');
    }
  };

  // Şube kartı sil
  const deleteBranchCard = async (id: number) => {
    if (confirm('Bu şube kartını silmek istediğinizden emin misiniz?')) {
      try {
        const response = await apiDelete(`http://localhost:5000/api/branch-cards/${id}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            alert('Şube kartı silindi!');
            await loadBranchCards();
          } else {
            alert('Hata: ' + data.message);
          }
        } else {
          alert('Silme sırasında hata oluştu');
        }
      } catch (error) {
        console.error('Şube kartı silinirken hata:', error);
        alert('Silme sırasında hata oluştu');
      }
    }
  };

  if (!canSeeAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 mx-auto text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Yetkisiz Erişim</h1>
          <p className="text-gray-600 mb-4">Bu sayfaya erişim için admin yetkisi gerekli</p>
          <Link href="/" className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all duration-300">
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-xl border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <Link 
                  href="/admin"
                  className="bg-gray-100 p-3 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  <ArrowLeft className="h-6 w-6 text-gray-600" />
                </Link>
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-3 rounded-xl">
                  <Building2 className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Şube Kartları Yönetimi</h1>
                  <p className="text-gray-600 mt-1">Dinamik şube kartlarını yönetin</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowAddForm(true)}
                  className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition-all duration-300 font-semibold flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Yeni Kart</span>
                </button>
                <Link href="/" className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-all duration-300 font-semibold">
                  Ana Sayfa
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingCard ? 'Şube Kartını Düzenle' : 'Yeni Şube Kartı Ekle'}
              </h2>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingCard(null);
                  setQueryResult(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const cardData: BranchCard = {
                branch_id: parseInt(formData.get('branch_id') as string),
                card_title: formData.get('card_title') as string,
                card_subtitle: formData.get('card_subtitle') as string,
                card_icon: formData.get('card_icon') as string,
                sql_query: formData.get('sql_query') as string,
                data_type: formData.get('data_type') as string,
                format_string: formData.get('format_string') as string,
                order_index: parseInt(formData.get('order_index') as string),
                is_active: true
              };
              saveBranchCard(cardData);
            }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Şube</label>
                  <select
                    name="branch_id"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    defaultValue={editingCard?.branch_id || ''}
                  >
                    <option value="">Şube seçin</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kart Başlığı</label>
                  <input
                    type="text"
                    name="card_title"
                    required
                    defaultValue={editingCard?.card_title || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Örn: Hasta Sayısı"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Alt Başlık</label>
                  <input
                    type="text"
                    name="card_subtitle"
                    defaultValue={editingCard?.card_subtitle || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Örn: Toplam aktif hasta"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">İkon</label>
                  <select
                    name="card_icon"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    defaultValue={editingCard?.card_icon || 'users'}
                  >
                    <option value="users">👥 Hasta</option>
                    <option value="calendar">📅 Randevu</option>
                    <option value="dollar-sign">💰 Gelir</option>
                    <option value="activity">📊 Aktivite</option>
                    <option value="trending-up">📈 Trend</option>
                    <option value="target">🎯 Hedef</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Veri Tipi</label>
                  <select
                    name="data_type"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    defaultValue={editingCard?.data_type || 'number'}
                  >
                    <option value="number">🔢 Sayı</option>
                    <option value="currency">💰 Para</option>
                    <option value="text">📝 Metin</option>
                    <option value="percentage">📊 Yüzde</option>
                    <option value="date">📅 Tarih</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sıra</label>
                  <input
                    type="number"
                    name="order_index"
                    required
                    defaultValue={editingCard?.order_index || 1}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="1"
                  />
                </div>
              </div>

              {/* SQL Sorgusu */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SQL Sorgusu <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <textarea
                    name="sql_query"
                    required
                    rows={4}
                    defaultValue={editingCard?.sql_query || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    placeholder="SELECT COUNT(*) FROM patients WHERE branch_id = $1 AND is_active = true"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const form = document.querySelector('form');
                      const branchId = (form?.querySelector('[name="branch_id"]') as HTMLSelectElement)?.value;
                      const sqlQuery = (form?.querySelector('[name="sql_query"]') as HTMLTextAreaElement)?.value;
                      if (branchId && sqlQuery) {
                        testQuery(sqlQuery, parseInt(branchId));
                      } else {
                        alert('Lütfen önce şube seçin ve SQL sorgusu girin');
                      }
                    }}
                    disabled={testingQuery}
                    className="absolute top-2 right-2 bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
                    title="SQL sorgusunu test et"
                  >
                    {testingQuery ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  $1 parametresi şube ID'si için kullanılır. Örnek: SELECT COUNT(*) FROM patients WHERE branch_id = $1
                </p>
              </div>

              {/* Format String */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Format String</label>
                <input
                  type="text"
                  name="format_string"
                  defaultValue={editingCard?.format_string || '{value}'}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="₺{value} veya {value} hasta"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {'{value}'} yerine gerçek değer gelecek. Örnek: ₺{'{value}'}, {'{value}'} hasta, %{'{value}'}
                </p>
              </div>

              {/* Test Sonucu */}
              {queryResult && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <h4 className="font-semibold text-green-800 mb-2">✅ SQL Sorgusu Test Sonucu</h4>
                  <div className="text-sm text-green-700 space-y-1">
                    <p><strong>Satır Sayısı:</strong> {queryResult.rowCount}</p>
                    <p><strong>Kolonlar:</strong> {queryResult.columns.join(', ')}</p>
                    {queryResult.sampleData.length > 0 && (
                      <div>
                        <p><strong>Örnek Veri:</strong></p>
                        <pre className="bg-white p-2 rounded text-xs overflow-x-auto">
                          {JSON.stringify(queryResult.sampleData, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="mt-6 flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingCard(null);
                    setQueryResult(null);
                  }}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-300 font-semibold"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-300 font-semibold flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{editingCard ? 'Güncelle' : 'Kaydet'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Branch Cards List */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Mevcut Şube Kartları</h2>
              <p className="text-gray-600 mt-1">Toplam {branchCards.length} kart</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition-all duration-300 font-semibold flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Yeni Kart</span>
              </button>
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
              <p className="text-sm">İlk şube kartını eklemek için yukarıdaki butonu kullanın</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {branchCards.map((card) => (
                <div key={card.id} className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl p-6 hover:shadow-xl transition-all duration-300">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{card.card_title}</h3>
                      <p className="text-sm text-gray-500">{card.card_subtitle}</p>
                      <p className="text-xs text-gray-400">Şube: {card.branch_name || `ID: ${card.branch_id}`}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                        <Database className="h-3 w-3 mr-1" />
                        {card.data_type || 'Veri'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">İkon:</span>
                      <span className="font-medium text-gray-900">{card.card_icon}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Veri Tipi:</span>
                      <span className="font-medium text-gray-900">{card.data_type || 'Belirtilmemiş'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Sıra:</span>
                      <span className="font-medium text-gray-900">{card.order_index}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Durum:</span>
                      <span className={`font-medium ${card.is_active ? 'text-green-600' : 'text-red-600'}`}>
                        {card.is_active ? 'Aktif' : 'Pasif'}
                      </span>
                    </div>
                    {card.sql_query && (
                      <div className="mt-3 p-2 bg-gray-100 rounded text-xs font-mono overflow-x-auto">
                        <div className="text-gray-600 mb-1">SQL:</div>
                        <div className="text-gray-800">{card.sql_query}</div>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        setEditingCard(card);
                        setShowAddForm(true);
                        setQueryResult(null);
                      }}
                      className="flex-1 bg-blue-100 text-blue-700 px-4 py-2 rounded-xl text-sm text-center hover:bg-blue-200 transition-all duration-300 font-semibold flex items-center justify-center space-x-2"
                    >
                      <Edit className="h-4 w-4" />
                      <span>Düzenle</span>
                    </button>
                    <button
                      onClick={() => card.id && deleteBranchCard(card.id)}
                      className="flex-1 bg-red-100 text-red-700 px-4 py-2 rounded-xl text-sm text-center hover:bg-red-200 transition-all duration-300 font-semibold flex items-center justify-center space-x-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Sil</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
