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
  Shield
} from 'lucide-react';
import { useEffect, useState } from 'react';

// Tip tanımlamaları
interface BranchCard {
  id?: number;
  branch_id: number;
  card_title: string;
  card_subtitle?: string;
  card_icon: string;
  color: string;
  order_index: number;
  is_active: boolean;
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
      
      const response = await fetch('/api/test-db/branch-cards');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setBranchCards(data.cards);
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
      const response = await fetch('/api/branches');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setBranches(data.branches);
        }
      }
    } catch (error) {
      console.error('Şubeler yüklenirken hata:', error);
    }
  };

  // Şube kartı ekle/güncelle
  const saveBranchCard = async (cardData: BranchCard) => {
    try {
      const url = editingCard ? `/api/test-db/branch-cards/${editingCard.id}` : '/api/test-db/branch-cards';
      const method = editingCard ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardData)
      });
      
      if (response.ok) {
        await loadBranchCards();
        setShowAddForm(false);
        setEditingCard(null);
      }
    } catch (error) {
      console.error('Şube kartı kaydedilirken hata:', error);
    }
  };

  // Şube kartı sil
  const deleteBranchCard = async (id: number) => {
    if (confirm('Bu şube kartını silmek istediğinizden emin misiniz?')) {
      try {
        const response = await fetch(`/api/test-db/branch-cards/${id}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          await loadBranchCards();
        }
      } catch (error) {
        console.error('Şube kartı silinirken hata:', error);
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
                color: formData.get('color') as string,
                order_index: parseInt(formData.get('order_index') as string),
                is_active: true // Default to true for new cards
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
                    placeholder="Örn: Hasta İstatistikleri"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Alt Başlık</label>
                  <input
                    type="text"
                    name="card_subtitle"
                    defaultValue={editingCard?.card_subtitle || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Örn: Güncel hasta verileri"
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
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Renk</label>
                  <select
                    name="color"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    defaultValue={editingCard?.color || 'blue'}
                  >
                    <option value="blue">🔵 Mavi</option>
                    <option value="green">🟢 Yeşil</option>
                    <option value="purple">🟣 Mor</option>
                    <option value="orange">🟠 Turuncu</option>
                    <option value="red">🔴 Kırmızı</option>
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
              
              <div className="mt-6 flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingCard(null);
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
                      <p className="text-xs text-gray-400">Şube ID: {card.branch_id}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                        <Building2 className="h-3 w-3 mr-1" />
                        Kart
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">İkon:</span>
                      <span className="font-medium text-gray-900">{card.card_icon}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Renk:</span>
                      <span className="font-medium text-gray-900">{card.color}</span>
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
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        setEditingCard(card);
                        setShowAddForm(true);
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
