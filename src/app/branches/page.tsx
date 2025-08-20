'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiGet, apiPut, apiDelete } from '../../lib/api';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Phone,
  Mail,
  MapPin,
  Building2,
  Users,
  Calendar,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Save,
  X,
  Copy
} from 'lucide-react';

interface Branch {
  id: number;
  name: string;
  code: string;
  province: string;
  address: string;
  phone: string;
  email: string;
  manager_id: number | null;
  manager_name: string | null;
  manager_email: string | null;
  timezone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [copiedBranchId, setCopiedBranchId] = useState(false);

  // Şubeleri yükle
  useEffect(() => {
    loadBranches();
    loadUsers();
  }, []);

  const loadBranches = async () => {
    try {
      const response = await apiGet('http://localhost:5000/api/branches');
      const data = await response.json();
      
      if (data.success) {
        setBranches(data.data || []);
      }
    } catch (error) {
      console.error('Şubeler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await apiGet('http://localhost:5000/api/users');
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.data || []);
      }
    } catch (error) {
      console.error('Kullanıcılar yüklenirken hata:', error);
    }
  };

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (!editingBranch) return;

    try {
      console.log('Gönderilecek veri:', editingBranch);
      console.log('Manager ID:', editingBranch.manager_id);
      console.log('Manager Name:', editingBranch.manager_name);
      
      const response = await apiPut(`http://localhost:5000/api/branches/${editingBranch.id}`, editingBranch);

      const data = await response.json();
      console.log('Backend yanıtı:', data);
      console.log('Güncellenmiş şube:', data.data);
      
      if (data.success) {
        await loadBranches();
        setShowEditModal(false);
        setEditingBranch(null);
        alert('Şube başarıyla güncellendi!');
      } else {
        alert('Hata: ' + data.message);
      }
    } catch (error) {
      console.error('Güncelleme hatası:', error);
      alert('Güncelleme sırasında hata oluştu');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu şubeyi silmek istediğinizden emin misiniz?')) return;

    try {
      const response = await apiDelete(`http://localhost:5000/api/branches/${id}`);

      if (response.ok) {
        await loadBranches();
        alert('Şube başarıyla silindi!');
      } else {
        alert('Şube silinirken hata oluştu');
      }
    } catch (error) {
      console.error('Silme hatası:', error);
      alert('Silme sırasında hata oluştu');
    }
  };

  const filteredBranches = branches.filter(branch => {
    const matchesSearch = 
      branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      branch.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      branch.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'ALL' || 
      (statusFilter === 'ACTIVE' && branch.is_active) ||
      (statusFilter === 'INACTIVE' && !branch.is_active);
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Şubeler yükleniyor...</p>
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
              <Link 
                href="/"
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                ← Anasayfa
              </Link>
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Şubeler</h1>
                <p className="text-gray-600 mt-1">Tüm şubeler ve yöneticileri</p>
              </div>
            </div>
            
            <Link
              href="/branches/new"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Yeni Şube</span>
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
                  placeholder="Şube ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            {/* Durum Filtresi */}
            <div className="flex items-center space-x-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">Tüm Durumlar</option>
                <option value="ACTIVE">Aktif</option>
                <option value="INACTIVE">Pasif</option>
              </select>
            </div>
          </div>
        </div>

        {/* Şubeler Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBranches.length > 0 ? (
            filteredBranches.map((branch) => (
              <div key={branch.id} className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      branch.is_active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}>
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">{branch.name}</h3>
                      <span className="text-sm text-gray-500">{branch.code}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(branch)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Düzenle"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(branch.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Sil"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Bilgiler */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{branch.address}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4" />
                    <span>{branch.phone}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span>{branch.email}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Users className="h-4 w-4" />
                    <span>Müdür: {branch.manager_name || 'Atanmamış'}</span>
                  </div>
                </div>

                {/* Durum */}
                <div className="flex items-center justify-between">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    branch.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {branch.is_active ? 'Aktif' : 'Pasif'}
                  </span>
                  
                  <span className="text-xs text-gray-500">
                    {new Date(branch.created_at).toLocaleDateString('tr-TR')}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-gray-500">
              <Building2 className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-lg">Şube bulunamadı</p>
              <p className="text-sm">Arama kriterlerinizi değiştirmeyi deneyin</p>
            </div>
          )}
        </div>
      </div>

      {/* Düzenleme Modal */}
      {showEditModal && editingBranch && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white rounded-t-3xl p-8 pb-6 border-b border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-2xl shadow-lg">
                    <Building2 className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-gray-900">Şube Düzenle</h3>
                    <p className="text-gray-600 text-base mt-1">Şube bilgilerini güncelleyin ve kaydedin</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-3 hover:bg-gray-100 rounded-full transition-all duration-200 hover:scale-110"
                >
                  <X className="h-7 w-7" />
                </button>
              </div>
            </div>
            
            <div className="p-8 space-y-8">
              {/* Şube ID - Özel Alan */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-2xl border border-blue-200">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <div className="bg-blue-600 p-2 rounded-lg mr-3">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                  Şube Kimlik Bilgisi
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                      <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full mr-2">branch_id</span>
                      Şube ID
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={editingBranch.id}
                        disabled
                        className="w-full px-4 py-4 bg-blue-50 border-2 border-blue-200 rounded-xl text-blue-800 font-mono font-bold text-lg cursor-not-allowed shadow-inner"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(String(editingBranch.id));
                            setCopiedBranchId(true);
                            setTimeout(() => setCopiedBranchId(false), 1500);
                          }}
                          className="p-1.5 rounded-lg bg-white/70 hover:bg-white border border-blue-200 text-blue-700 transition-colors"
                          title="branch_id kopyala"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-medium">Otomatik</span>
                      </div>
                    </div>
                    <p className="text-xs text-blue-600 mt-2">Bu alan otomatik olarak sistem tarafından atanır ve değiştirilemez. Gerekli formlarda kolon adı <span className="font-semibold">branch_id</span> olarak kullanılır.</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                      <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full mr-2">Kod</span>
                      Şube Kodu
                    </label>
                    <input
                      type="text"
                      value={editingBranch.code}
                      onChange={(e) => setEditingBranch({...editingBranch, code: e.target.value})}
                      className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                      placeholder="Örn: IST-BKRK-001"
                    />
                    <p className="text-xs text-gray-500 mt-2">Benzersiz şube kodu (örn: İl-İlçe-Sıra)</p>
                  </div>
                </div>
              </div>

              {/* Temel Bilgiler */}
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                  <div className="bg-blue-600 p-2 rounded-lg mr-3">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                  Temel Bilgiler
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                      <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded-full mr-2">*</span>
                      Şube Adı
                    </label>
                    <input
                      type="text"
                      value={editingBranch.name}
                      onChange={(e) => setEditingBranch({...editingBranch, name: e.target.value})}
                      className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                      placeholder="Şube adını girin"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                      <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded-full mr-2">*</span>
                      İl
                    </label>
                    <input
                      type="text"
                      value={editingBranch.province}
                      onChange={(e) => setEditingBranch({...editingBranch, province: e.target.value})}
                      className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                      placeholder="İl adını girin"
                    />
                  </div>
                </div>
              </div>

              {/* İletişim Bilgileri */}
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                  <div className="bg-green-600 p-2 rounded-lg mr-3">
                    <Phone className="h-5 w-5 text-white" />
                  </div>
                  İletişim Bilgileri
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                      <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded-full mr-2">*</span>
                      Telefon
                    </label>
                    <input
                      type="text"
                      value={editingBranch.phone}
                      onChange={(e) => setEditingBranch({...editingBranch, phone: e.target.value})}
                      className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                      placeholder="+90 212 555 0000"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                      <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded-full mr-2">*</span>
                      E-posta
                    </label>
                    <input
                      type="text"
                      value={editingBranch.email}
                      onChange={(e) => setEditingBranch({...editingBranch, email: e.target.value})}
                      className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                      placeholder="ornek@hospitatech.com"
                    />
                  </div>
                </div>
              </div>

              {/* Müdür Bilgileri */}
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                  <div className="bg-purple-600 p-2 rounded-lg mr-3">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  Müdür Bilgileri
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                      <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full mr-2">Ad</span>
                      Müdür Adı
                    </label>
                    <input
                      type="text"
                      value={editingBranch.manager_name || ''}
                      onChange={(e) => setEditingBranch({...editingBranch, manager_name: e.target.value})}
                      className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                      placeholder="Müdür adını girin"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                      <span className="bg-orange-100 text-orange-800 text-xs font-bold px-2 py-1 rounded-full mr-2">ID</span>
                      Müdür ID (Opsiyonel)
                    </label>
                    <select
                      value={editingBranch.manager_id || ''}
                      onChange={(e) => {
                        const managerId = e.target.value ? parseInt(e.target.value) : null;
                        setEditingBranch({
                          ...editingBranch, 
                          manager_id: managerId
                        });
                      }}
                      className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                    >
                      <option value="">Müdür Seçin (Opsiyonel)</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.username} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Adres ve Durum */}
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                  <div className="bg-orange-600 p-2 rounded-lg mr-3">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  Konum ve Durum
                </h4>
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                      <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded-full mr-2">*</span>
                      Adres
                    </label>
                    <textarea
                      value={editingBranch.address}
                      onChange={(e) => setEditingBranch({...editingBranch, address: e.target.value})}
                      rows={3}
                      className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                      placeholder="Detaylı adres bilgisi girin"
                    />
                  </div>
                  
                  <div className="flex items-center p-4 bg-white rounded-xl border border-gray-200">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={editingBranch.is_active}
                      onChange={(e) => setEditingBranch({...editingBranch, is_active: e.target.checked})}
                      className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_active" className="ml-3 block text-sm font-semibold text-gray-900">
                      Şube Aktif
                    </label>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Buttons */}
            <div className="sticky bottom-0 bg-white rounded-b-3xl p-8 pt-6 border-t border-gray-200 shadow-sm">
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-4 rounded-xl font-semibold transition-all duration-200 hover:shadow-md text-lg"
                >
                  İptal
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-4 rounded-xl font-semibold transition-all duration-200 hover:shadow-lg transform hover:scale-105 flex items-center justify-center space-x-2 text-lg"
                >
                  <Save className="h-6 w-6" />
                  <span>Güncelle</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 