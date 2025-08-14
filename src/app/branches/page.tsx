'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
  X
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

  // Şubeleri yükle
  useEffect(() => {
    loadBranches();
    loadUsers();
  }, []);

  const loadBranches = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/branches');
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
      const response = await fetch('http://localhost:5000/api/users');
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
      console.log('Gönderilecek veri:', editingBranch); // Debug için
      
      const response = await fetch(`http://localhost:5000/api/branches/${editingBranch.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingBranch),
      });

      const data = await response.json();
      console.log('Backend yanıtı:', data); // Debug için
      
      if (data.success) {
        await loadBranches(); // Şubeleri yeniden yükle
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
      const response = await fetch(`http://localhost:5000/api/branches/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadBranches(); // Şubeleri yeniden yükle
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Şube Düzenle</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Şube Adı</label>
                  <input
                    type="text"
                    value={editingBranch.name}
                    onChange={(e) => setEditingBranch({...editingBranch, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Şube Kodu</label>
                  <input
                    type="text"
                    value={editingBranch.code}
                    onChange={(e) => setEditingBranch({...editingBranch, code: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">İl</label>
                  <input
                    type="text"
                    value={editingBranch.province}
                    onChange={(e) => setEditingBranch({...editingBranch, province: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                  <input
                    type="text"
                    value={editingBranch.phone}
                    onChange={(e) => setEditingBranch({...editingBranch, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">E-posta</label>
                  <input
                    type="text"
                    value={editingBranch.email}
                    onChange={(e) => setEditingBranch({...editingBranch, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Müdür</label>
                  <select
                    value={editingBranch.manager_id || ''}
                    onChange={(e) => {
                      const managerId = e.target.value ? parseInt(e.target.value) : null;
                      const manager = users.find(u => u.id === managerId);
                      console.log('Seçilen müdür ID:', managerId); // Debug için
                      console.log('Bulunan müdür:', manager); // Debug için
                      setEditingBranch({
                        ...editingBranch, 
                        manager_id: managerId,
                        manager_name: manager?.username || null,
                        manager_email: manager?.email || null
                      });
                      console.log('Güncellenmiş şube:', {
                        ...editingBranch, 
                        manager_id: managerId,
                        manager_name: manager?.username || null,
                        manager_email: manager?.email || null
                      }); // Debug için
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Müdür Seçin</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.username} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Adres</label>
                <textarea
                  value={editingBranch.address}
                  onChange={(e) => setEditingBranch({...editingBranch, address: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={editingBranch.is_active}
                  onChange={(e) => setEditingBranch({...editingBranch, is_active: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                  Aktif
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
                onClick={handleSave}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                <Save className="h-4 w-4 inline mr-2" />
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 