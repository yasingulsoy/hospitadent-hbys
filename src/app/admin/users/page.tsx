'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../../lib/api';
import { Plus, Edit, Trash2, Search, User, Shield } from 'lucide-react';

interface User {
  id: number;
  username: string;
  email: string;
  role: number;
  görev_tanımı: string;
  name?: string;
  surname?: string;
  branch_id?: number;
  branch_role?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  branches?: Array<{id: number; name: string; code: string}>;
}

const roleLabels = {
  0: 'Kullanıcı',
  1: 'Admin',
  2: 'Superadmin'
};

const branchRoleLabels = {
  0: 'Başhekim',
  1: 'Müdür',
  2: 'Hekim',
  3: 'Kullanıcı'
};

const defaultBranchOptions = [
  { id: 1, name: 'Çamlıca Şubesi' },
  { id: 2, name: 'Kadıköy Şubesi' },
  { id: 3, name: 'Beşiktaş Şubesi' }
];

const görevOptions = [
  'Superadmin',
  'Admin', 
  'Diş Hekimi',
  'Müdür',
  'Başhekim',
  'Yönetim',
  'Belirtilmemiş'
];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [branchOptions, setBranchOptions] = useState(defaultBranchOptions);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 0,
    görev_tanımı: 'Belirtilmemiş',
    name: '',
    surname: '',
    branch_id: 1,
    branch_role: 3,
    is_active: true
  });

  // Şubeleri getir
  const fetchBranches = async () => {
    try {
      const response = await apiGet('http://localhost:5000/api/users/branches/all');
      const data = await response.json();
      
      if (data.success) {
        setBranchOptions(data.data);
      }
    } catch (error) {
      console.error('Şubeler getirilemedi:', error);
    }
  };

  // Kullanıcıları getir
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await apiGet('http://localhost:5000/api/users');
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error('Kullanıcılar getirilemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  // Yeni kullanıcı ekle
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Debug: Form verilerini kontrol et
    console.log('Form Data:', formData);
    console.log('Branch ID:', formData.branch_id);
    console.log('Branch ID Type:', typeof formData.branch_id);
    
    try {
      // Önce kullanıcıyı ekle
      const userData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        görev_tanımı: formData.görev_tanımı,
        name: formData.name,
        surname: formData.surname,
        branch_id: formData.branch_id,
        branch_role: formData.branch_role,
        is_active: formData.is_active
      };

      console.log('Sending User Data:', userData);

      const response = await apiPost('http://localhost:5000/api/users', userData);

      console.log('Response Status:', response.status);
      const data = await response.json();
      console.log('Response Data:', data);
      
      if (data.success) {
        // Activity log ekle
        try {
          await apiPost('http://localhost:5000/api/admin/activity-logs', {
            action: 'USER_CREATE',
            details: `Yeni kullanıcı eklendi: ${formData.name} ${formData.surname} (${formData.username})`
          });
        } catch (logError) {
          console.error('Activity log hatası:', logError);
        }

        setShowAddModal(false);
        setFormData({
          username: '',
          email: '',
          password: '',
          role: 0,
          görev_tanımı: 'Belirtilmemiş',
          name: '',
          surname: '',
          branch_id: 1,
          branch_role: 3,
          is_active: true
        });
        fetchUsers();
        alert('Kullanıcı başarıyla eklendi!');
      } else {
        alert(`Hata: ${data.message}`);
      }
    } catch (error) {
      console.error('Kullanıcı eklenemedi:', error);
      alert(`Kullanıcı eklenirken hata oluştu: ${error}`);
    }
  };

  // Kullanıcı güncelle
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      const userData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        görev_tanımı: formData.görev_tanımı,
        name: formData.name,
        surname: formData.surname,
        branch_id: formData.branch_id, // İlk şubeyi branch_id olarak ata
        branch_role: formData.branch_role,
        is_active: formData.is_active
      };

      const response = await apiPut(`http://localhost:5000/api/users/${selectedUser.id}`, userData);

      const data = await response.json();
      
      if (data.success) {
        // Activity log ekle
        try {
          await apiPost('http://localhost:5000/api/admin/activity-logs', {
            action: 'USER_UPDATE',
            details: `Kullanıcı güncellendi: ${formData.name} ${formData.surname} (${formData.username})`
          });
        } catch (logError) {
          console.error('Activity log hatası:', logError);
        }

        setShowEditModal(false);
        setSelectedUser(null);
        fetchUsers();
      }
    } catch (error) {
      console.error('Kullanıcı güncellenemedi:', error);
    }
  };

  // Kullanıcı sil
  const handleDeleteUser = async (id: number) => {
    if (!confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) return;

    try {
      const response = await apiDelete(`http://localhost:5000/api/users/${id}`);

      const data = await response.json();
      
      if (data.success) {
        // Activity log ekle
        try {
          const userToDelete = users.find(u => u.id === id);
          if (userToDelete) {
            await apiPost('http://localhost:5000/api/admin/activity-logs', {
              action: 'USER_DELETE',
              details: `Kullanıcı silindi: ${userToDelete.name || ''} ${userToDelete.surname || ''} (${userToDelete.username})`
            });
          }
        } catch (logError) {
          console.error('Activity log hatası:', logError);
        }

        fetchUsers();
      }
    } catch (error) {
      console.error('Kullanıcı silinemedi:', error);
    }
  };

  // Kullanıcı düzenleme modalını aç
  const openEditModal = (user: User) => {
    setSelectedUser(user);
    
    // Branch bilgilerini doğru şekilde ayarla
    let branchId = 1; // Varsayılan
    if (user.branch_id) {
      branchId = user.branch_id;
    }
    
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      role: user.role,
      görev_tanımı: user.görev_tanımı || 'Belirtilmemiş',
      name: user.name || '',
      surname: user.surname || '',
      branch_id: user.branch_id || 1,
      branch_role: user.branch_role || 3,
      is_active: user.is_active
    });
    setShowEditModal(true);
  };

  // Filtrelenmiş kullanıcılar
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.görev_tanımı.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || 
                       (roleFilter === 'admin' && (user.role === 1 || user.role === 2)) ||
                       (roleFilter === 'user' && user.role === 0);
    
    return matchesSearch && matchesRole;
  });

  useEffect(() => {
    fetchBranches();
    fetchUsers();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kullanıcı Yönetimi</h1>
          <p className="text-gray-600 mt-2">Tüm kullanıcıları görüntüleyin, ekleyin ve yönetin</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Yeni Kullanıcı Ekle
        </button>
      </div>

      {/* Filtreler */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Kullanıcı adı, e-posta veya görev ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tüm Roller</option>
              <option value="admin">Admin</option>
              <option value="user">Kullanıcı</option>
            </select>
          </div>
        </div>
      </div>

      {/* Kullanıcı Listesi */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kullanıcı Bilgileri
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol & Görev
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Şube & Yetki
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.name && user.surname ? `${user.name} ${user.surname}` : user.username}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                      {user.name && user.surname && (
                        <div className="text-xs text-gray-400">@{user.username}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.role === 2 ? 'bg-purple-100 text-purple-800' :
                        user.role === 1 ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {roleLabels[user.role as keyof typeof roleLabels]}
                      </span>
                      <span className="text-sm text-gray-600">{user.görev_tanımı}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {branchOptions.find(b => b.id === user.branch_id)?.name || 'Şube Belirtilmemiş'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {user.branch_role !== undefined ? branchRoleLabels[user.branch_role as keyof typeof branchRoleLabels] : 'Rol Belirtilmemiş'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="Düzenle"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className={`p-1 ${
                          // Mevcut kullanıcının rolüne göre yetki kontrolü
                          (() => {
                            // localStorage'dan mevcut kullanıcı rolünü al
                            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                            const currentUserRole = currentUser.role || 0;
                            
                            // Superadmin herkesi silebilir (kendisi hariç)
                            if (currentUserRole === 2) {
                              return user.role === 2 ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-900';
                            }
                            // Admin sadece normal kullanıcıları silebilir
                            else if (currentUserRole === 1) {
                              return (user.role === 1 || user.role === 2) ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-900';
                            }
                            // Normal kullanıcı hiç kimseyi silemez
                            else {
                              return 'text-gray-400 cursor-not-allowed';
                            }
                          })()
                        }`}
                        title={
                          (() => {
                            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                            const currentUserRole = currentUser.role || 0;
                            
                            if (currentUserRole === 2) {
                              return user.role === 2 ? 'Diğer Superadmin kullanıcıları silinemez' : 'Sil';
                            } else if (currentUserRole === 1) {
                              return (user.role === 1 || user.role === 2) ? 'Yetkiniz yeterli değil. Admin ve Superadmin kullanıcıları silemezsiniz.' : 'Sil';
                            } else {
                              return 'Yetkiniz yeterli değil. Kullanıcı silme yetkiniz bulunmuyor.';
                            }
                          })()
                        }
                        disabled={
                          (() => {
                            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                            const currentUserRole = currentUser.role || 0;
                            
                            if (currentUserRole === 2) {
                              return user.role === 2;
                            } else if (currentUserRole === 1) {
                              return (user.role === 1 || user.role === 2);
                            } else {
                              return true;
                            }
                          })()
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Kullanıcı bulunamadı</p>
          </div>
        )}
      </div>

      {/* Yeni Kullanıcı Ekleme Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-semibold mb-6 text-gray-900">Yeni Kullanıcı Ekle</h2>
            <form onSubmit={handleAddUser}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sol Sütun */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kullanıcı Adı *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Kullanıcı adını girin"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      E-posta *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="E-posta adresini girin"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Şifre *
                    </label>
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Şifre girin"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ad
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Adını girin"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Soyad
                    </label>
                    <input
                      type="text"
                      value={formData.surname}
                      onChange={(e) => setFormData({...formData, surname: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Soyadını girin"
                    />
                  </div>
                </div>

                {/* Sağ Sütun */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rol *
                    </label>
                    <select
                      required
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={0}>Kullanıcı</option>
                      <option value={1}>Admin</option>
                      <option value={2}>Superadmin</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Görev Tanımı
                    </label>
                    <select
                      value={formData.görev_tanımı}
                      onChange={(e) => setFormData({...formData, görev_tanımı: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {görevOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Şube *
                    </label>
                    <select
                      required
                      value={formData.branch_id}
                      onChange={(e) => setFormData({...formData, branch_id: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {branchOptions.map(branch => (
                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Şube Rolü *
                    </label>
                    <select
                      required
                      value={formData.branch_role}
                      onChange={(e) => setFormData({...formData, branch_role: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={0}>Başhekim (Tüm raporlara erişim)</option>
                      <option value={1}>Müdür (Alt hekimlerin raporlarına erişim)</option>
                      <option value={2}>Hekim (Sadece kendi raporlarına erişim)</option>
                      <option value={3}>Kullanıcı (Sadece kendi raporlarına erişim)</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center pt-2">
                    <input
                      type="checkbox"
                      id="is_active_add"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_active_add" className="ml-2 block text-sm text-gray-700">
                      Kullanıcı Aktif
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Kullanıcı Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

             {/* Kullanıcı Düzenleme Modal */}
       {showEditModal && selectedUser && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
             <h2 className="text-2xl font-semibold mb-6 text-gray-900">Kullanıcı Düzenle</h2>
             <form onSubmit={handleUpdateUser}>
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {/* Sol Sütun */}
                 <div className="space-y-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       Kullanıcı Adı *
                     </label>
                     <input
                       type="text"
                       required
                       value={formData.username}
                       onChange={(e) => setFormData({...formData, username: e.target.value})}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                       placeholder="Kullanıcı adını girin"
                     />
                   </div>
                   
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       E-posta *
                     </label>
                     <input
                       type="email"
                       required
                       value={formData.email}
                       onChange={(e) => setFormData({...formData, email: e.target.value})}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                       placeholder="E-posta adresini girin"
                     />
                   </div>
                   
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       Şifre (Boş bırakılırsa değişmez)
                     </label>
                     <input
                       type="password"
                       value={formData.password}
                       onChange={(e) => setFormData({...formData, password: e.target.value})}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                       placeholder="Şifre girin"
                     />
                   </div>
                   
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       Ad
                     </label>
                     <input
                       type="text"
                       value={formData.name}
                       onChange={(e) => setFormData({...formData, name: e.target.value})}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                       placeholder="Adını girin"
                     />
                   </div>
                   
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       Soyad
                     </label>
                     <input
                       type="text"
                       value={formData.surname}
                       onChange={(e) => setFormData({...formData, surname: e.target.value})}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                       placeholder="Soyadını girin"
                     />
                   </div>
                 </div>

                 {/* Sağ Sütun */}
                 <div className="space-y-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       Rol *
                     </label>
                     <select
                       required
                       value={formData.role}
                       onChange={(e) => setFormData({...formData, role: parseInt(e.target.value)})}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     >
                       <option value={0}>Kullanıcı</option>
                       <option value={1}>Admin</option>
                       <option value={2}>Superadmin</option>
                     </select>
                   </div>
                   
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       Görev Tanımı
                     </label>
                     <select
                       value={formData.görev_tanımı}
                       onChange={(e) => setFormData({...formData, görev_tanımı: e.target.value})}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     >
                       {görevOptions.map(option => (
                         <option key={option} value={option}>{option}</option>
                       ))}
                     </select>
                   </div>
                   
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       Şube *
                     </label>
                     <select
                       required
                       value={formData.branch_id}
                       onChange={(e) => setFormData({...formData, branch_id: parseInt(e.target.value)})}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     >
                       {branchOptions.map(branch => (
                         <option key={branch.id} value={branch.id}>{branch.name}</option>
                       ))}
                     </select>
                   </div>
                   
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       Şube Rolü *
                     </label>
                     <select
                       required
                       value={formData.branch_role}
                       onChange={(e) => setFormData({...formData, branch_role: parseInt(e.target.value)})}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     >
                       <option value={0}>Başhekim (Tüm raporlara erişim)</option>
                       <option value={1}>Müdür (Alt hekimlerin raporlarına erişim)</option>
                       <option value={2}>Hekim (Sadece kendi raporlarına erişim)</option>
                       <option value={3}>Kullanıcı (Sadece kendi raporlarına erişim)</option>
                     </select>
                   </div>
                   
                   <div className="flex items-center pt-2">
                     <input
                       type="checkbox"
                       id="is_active_edit"
                       checked={formData.is_active}
                       onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                       className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                     />
                     <label htmlFor="is_active_edit" className="ml-2 block text-sm text-gray-700">
                       Kullanıcı Aktif
                     </label>
                   </div>
                 </div>
               </div>
               
               <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
                 <button
                   type="button"
                   onClick={() => setShowEditModal(false)}
                   className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                 >
                   İptal
                 </button>
                 <button
                   type="submit"
                   className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                 >
                   Güncelle
                 </button>
               </div>
             </form>
           </div>
         </div>
       )}
    </div>
  );
}
