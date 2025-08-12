'use client';

import { useState } from 'react';
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
  User,
  Clock
} from 'lucide-react';

export default function NewBranchPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
    managerId: '',
    timezone: 'Europe/Istanbul',
    isActive: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Mock müdür listesi
  const managers = [
    { id: '1', name: 'Dr. Ayşe Kaya', email: 'ayse.kaya@hospitadent.com' },
    { id: '2', name: 'Dr. Ali Yıldız', email: 'ali.yildiz@hospitadent.com' },
    { id: '3', name: 'Dr. Mehmet Demir', email: 'mehmet.demir@hospitadent.com' },
    { id: '4', name: 'Dr. Fatma Özkan', email: 'fatma.ozkan@hospitadent.com' },
    { id: '5', name: 'Dr. Can Yılmaz', email: 'can.yilmaz@hospitadent.com' }
  ];

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

    if (!formData.managerId) {
      newErrors.managerId = 'Şube müdürü seçimi zorunludur';
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
      // Burada API çağrısı yapılacak
      console.log('Şube kaydediliyor:', formData);
      
      // Simüle edilmiş API çağrısı
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Başarılı kayıt sonrası şube listesine yönlendir
      router.push('/branches');
    } catch (error) {
      console.error('Şube kaydedilirken hata oluştu:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Hata mesajını temizle
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link 
                href="/branches"
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Yeni Şube Ekle</h1>
                <p className="text-sm text-gray-600">Şube bilgilerini girin ve kaydedin</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <Building2 className="h-5 w-5 mr-2 text-blue-600" />
              Temel Bilgiler
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Şube Adı *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
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
                  Şube Kodu *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
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
                <p className="mt-1 text-xs text-gray-500">Format: XXX-000 (örn: IST-001, ANK-002)</p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adres *
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.address ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Şube adresi"
                />
                {errors.address && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.address}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <Phone className="h-5 w-5 mr-2 text-green-600" />
              İletişim Bilgileri
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefon *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
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
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="sube@hospitadent.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.email}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Management */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <User className="h-5 w-5 mr-2 text-purple-600" />
              Yönetim
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Şube Müdürü *
                </label>
                <select
                  value={formData.managerId}
                  onChange={(e) => handleInputChange('managerId', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.managerId ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Müdür seçiniz</option>
                  {managers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name} - {manager.email}
                    </option>
                  ))}
                </select>
                {errors.managerId && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.managerId}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Saat Dilimi
                </label>
                <select
                  value={formData.timezone}
                  onChange={(e) => handleInputChange('timezone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Europe/Istanbul">Türkiye (UTC+3)</option>
                  <option value="Europe/London">Londra (UTC+0)</option>
                  <option value="Europe/Paris">Paris (UTC+1)</option>
                  <option value="America/New_York">New York (UTC-5)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-orange-600" />
              Ayarlar
            </h2>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                Şube aktif olsun
              </label>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Aktif olmayan şubeler sisteme giriş yapamaz ve yeni kayıt alamaz.
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4">
            <Link
              href="/branches"
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              İptal
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Kaydediliyor...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Şubeyi Kaydet</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 