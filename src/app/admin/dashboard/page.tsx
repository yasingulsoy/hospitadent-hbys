'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, BarChart3, Users, Calendar, DollarSign, Building2 } from 'lucide-react';

interface DashboardCard {
  id?: number;
  name: string;
  display_name: string;
  query: string;
  card_type: 'branch' | 'patient' | 'appointment' | 'revenue';
  icon: string;
  color: string;
  is_active: boolean;
  sort_order: number;
}

const cardTypes = [
  { value: 'branch', label: 'Şube', icon: Building2 },
  { value: 'patient', label: 'Hasta', icon: Users },
  { value: 'appointment', label: 'Randevu', icon: Calendar },
  { value: 'revenue', label: 'Gelir', icon: DollarSign }
];

const colors = [
  { value: 'blue', label: 'Mavi', class: 'bg-blue-500' },
  { value: 'green', label: 'Yeşil', class: 'bg-green-500' },
  { value: 'purple', label: 'Mor', class: 'bg-purple-500' },
  { value: 'orange', label: 'Turuncu', class: 'bg-orange-500' },
  { value: 'red', label: 'Kırmızı', class: 'bg-red-500' },
  { value: 'indigo', label: 'İndigo', class: 'bg-indigo-500' }
];

export default function DashboardManagement() {
  const [cards, setCards] = useState<DashboardCard[]>([]);
  const [editingCard, setEditingCard] = useState<DashboardCard | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Yeni kart ekleme için boş kart
  const emptyCard: DashboardCard = {
    name: '',
    display_name: '',
    query: '',
    card_type: 'branch',
    icon: 'building',
    color: 'blue',
    is_active: true,
    sort_order: 0
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/reports/dashboard-cards', {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setCards(data.data);
      }
    } catch (error) {
      console.error('Dashboard kartları alınamadı:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (card: DashboardCard) => {
    setSaving(true);
    try {
      const response = await fetch('http://localhost:5000/api/reports/dashboard-cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(card)
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchCards();
        setEditingCard(null);
        setIsAdding(false);
      } else {
        alert('Kaydetme hatası: ' + data.message);
      }
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      alert('Kaydetme hatası oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu dashboard kartını silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/reports/dashboard-cards/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchCards();
      } else {
        alert('Silme hatası: ' + data.message);
      }
    } catch (error) {
      console.error('Silme hatası:', error);
      alert('Silme hatası oluştu');
    }
  };

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'building': return Building2;
      case 'users': return Users;
      case 'calendar': return Calendar;
      case 'dollar': return DollarSign;
      default: return BarChart3;
    }
  };

  const getColorClass = (color: string) => {
    const colorObj = colors.find(c => c.value === color);
    return colorObj?.class || 'bg-blue-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Yönetimi</h1>
          <p className="mt-2 text-gray-600">
            Ana sayfada görünecek dashboard kartlarını yönetin
          </p>
        </div>

        {/* Yeni Kart Ekle */}
        {!isAdding && (
          <div className="mb-6">
            <button
              onClick={() => {
                setIsAdding(true);
                setEditingCard(emptyCard);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Yeni Kart Ekle</span>
            </button>
          </div>
        )}

        {/* Kart Ekleme/Düzenleme Formu */}
        {(isAdding || editingCard) && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingCard ? 'Kart Düzenle' : 'Yeni Kart Ekle'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kart Adı (API)
                </label>
                <input
                  type="text"
                  value={editingCard?.name || ''}
                  onChange={(e) => setEditingCard(prev => ({ ...prev!, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="active_branches"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Görüntü Adı
                </label>
                <input
                  type="text"
                  value={editingCard?.display_name || ''}
                  onChange={(e) => setEditingCard(prev => ({ ...prev!, display_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="AKTİF ŞUBE"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kart Türü
                </label>
                <select
                  value={editingCard?.card_type || 'branch'}
                  onChange={(e) => setEditingCard(prev => ({ ...prev!, card_type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {cardTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  İkon
                </label>
                <select
                  value={editingCard?.icon || 'building'}
                  onChange={(e) => setEditingCard(prev => ({ ...prev!, icon: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="building">Bina</option>
                  <option value="users">Kullanıcılar</option>
                  <option value="calendar">Takvim</option>
                  <option value="dollar">Dolar</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Renk
                </label>
                <select
                  value={editingCard?.color || 'blue'}
                  onChange={(e) => setEditingCard(prev => ({ ...prev!, color: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {colors.map(color => (
                    <option key={color.value} value={color.value}>
                      {color.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sıralama
                </label>
                <input
                  type="number"
                  value={editingCard?.sort_order || 0}
                  onChange={(e) => setEditingCard(prev => ({ ...prev!, sort_order: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                MariaDB Sorgusu
              </label>
              <textarea
                value={editingCard?.query || ''}
                onChange={(e) => setEditingCard(prev => ({ ...prev!, query: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 font-mono text-sm"
                placeholder="SELECT COUNT(*) as count FROM clinics WHERE status = 1 AND isDeleted = 0"
              />
              <p className="text-xs text-gray-500 mt-1">
                Bu sorgu MariaDB'de çalıştırılacak. Sonuç 'count' veya 'total_income' alanında olmalı.
              </p>
            </div>

            <div className="mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={editingCard?.is_active || false}
                  onChange={(e) => setEditingCard(prev => ({ ...prev!, is_active: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Aktif</span>
              </label>
            </div>

            <div className="mt-6 flex space-x-3">
                              <button
                  onClick={() => handleSave(editingCard || emptyCard)}
                  disabled={saving || !editingCard?.name || !editingCard?.display_name || !editingCard?.query}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Kaydediliyor...' : 'Kaydet'}</span>
              </button>
              <button
                onClick={() => {
                  setEditingCard(null);
                  setIsAdding(false);
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-all duration-200 flex items-center space-x-2"
              >
                <X className="h-4 w-4" />
                <span>İptal</span>
              </button>
            </div>
          </div>
        )}

        {/* Mevcut Kartlar */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => (
            <div key={card.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${getColorClass(card.color)} rounded-lg flex items-center justify-center`}>
                  {(() => {
                    const IconComponent = getIconComponent(card.icon);
                    return <IconComponent className="h-6 w-6 text-white" />;
                  })()}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setEditingCard(card)}
                    className="text-blue-600 hover:text-blue-800 p-1"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(card.id!)}
                    className="text-red-600 hover:text-red-800 p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {card.display_name}
              </h3>
              
              <div className="space-y-2 text-sm text-gray-600">
                <p><strong>API Adı:</strong> {card.name}</p>
                <p><strong>Tür:</strong> {cardTypes.find(t => t.value === card.card_type)?.label}</p>
                <p><strong>Renk:</strong> {colors.find(c => c.value === card.color)?.label}</p>
                <p><strong>Sıra:</strong> {card.sort_order}</p>
                <p><strong>Durum:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                    card.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {card.is_active ? 'Aktif' : 'Pasif'}
                  </span>
                </p>
              </div>

              <div className="mt-4">
                <details className="text-sm">
                  <summary className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium">
                    Sorguyu Göster
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
                    {card.query}
                  </pre>
                </details>
              </div>
            </div>
          ))}
        </div>

        {cards.length === 0 && !isAdding && (
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz dashboard kartı yok</h3>
            <p className="text-gray-600 mb-4">
              İlk dashboard kartınızı ekleyerek başlayın
            </p>
            <button
              onClick={() => {
                setIsAdding(true);
                setEditingCard(emptyCard);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200"
            >
              İlk Kartı Ekle
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
