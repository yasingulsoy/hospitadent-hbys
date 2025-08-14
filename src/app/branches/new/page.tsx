'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Save, 
  Building2, 
  Phone, 
  Mail, 
  MapPin,
  AlertCircle,
  CheckCircle,
  User
} from 'lucide-react';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

export default function NewBranchPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    province: '',
    address: '',
    phone: '',
    email: '',
    manager_id: '',
    timezone: 'Europe/Istanbul',
    is_active: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Kullanıcıları yükle
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/users');
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.data || []);
      }
    } catch (error) {
      console.error('Kullanıcılar yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Şube adı zorunludur';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Şube kodu zorunludur';
    } else if (!/^[A-Z]{3}-\d{3}$/.test(formData.code)) {
      newErrors.code = 'Şube kodu formatı: XXX-000 (örn: IST-001)';
    }

    if (!formData.province.trim()) {
      newErrors.province = 'İl zorunludur';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Adres zorunludur';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Telefon zorunludur';
    } else if (!/^[0-9\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Geçerli bir telefon numarası giriniz';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Geçerli bir e-posta adresi giriniz';
    }

    if (!formData.manager_id) {
      newErrors.manager_id = 'Şube müdürü seçimi zorunludur';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Gönderilecek veri:', formData); // Debug için
      
      const response = await fetch('http://localhost:5000/api/branches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          manager_id: formData.manager_id || null
        }),
      });

      const data = await response.json();
      console.log('Backend yanıtı:', data); // Debug için
      
      if (data.success) {
        alert('Şube başarıyla oluşturuldu!');
        router.push('/branches');
      } else {
        alert('Hata: ' + data.message);
      }
    } catch (error) {
      console.error('Şube kaydedilirken hata oluştu:', error);
      alert('Şube oluşturulurken hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Kullanıcılar yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                href="/branches"
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Geri Dön
              </Link>
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Yeni Şube</h1>
                <p className="text-gray-600 mt-1">Yeni şube bilgilerini girin</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Şube Bilgileri */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Şube Adı <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="İstanbul Kadıköy Şubesi"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Şube Kodu <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.code ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="IST-001"
                />
                {errors.code && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.code}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  İl <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.province}
                  onChange={(e) => setFormData({...formData, province: e.target.value})}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.province ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="İstanbul"
                />
                {errors.province && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.province}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefon <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.phone ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="0216 123 45 67"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.phone}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-posta
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="kadikoy@hospitadent.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Müdür <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.manager_id}
                  onChange={(e) => setFormData({...formData, manager_id: e.target.value})}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.manager_id ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Müdür Seçin</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.username} ({user.email})
                    </option>
                  ))}
                </select>
                {errors.manager_id && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.manager_id}
                  </p>
                )}
              </div>
            </div>

            {/* Adres */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adres <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                rows={3}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.address ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Kadıköy, İstanbul"
              />
              {errors.address && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.address}
                </p>
              )}
            </div>

            {/* Durum */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                Aktif
              </label>
            </div>

            {/* Buttons */}
            <div className="flex space-x-4 pt-6">
              <Link
                href="/branches"
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold text-center transition-colors"
              >
                İptal
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Kaydediliyor...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    <span>Şube Oluştur</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 