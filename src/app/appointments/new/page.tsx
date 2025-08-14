'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Save, 
  Calendar, 
  Clock, 
  User, 
  Building2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

export default function NewAppointmentPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    patientId: '',
    doctorId: '',
    branchId: '',
    date: '',
    time: '',
    duration: 30,
    type: 'CONSULTATION',
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Mock veriler
  const patients = [
    { id: '1', name: 'Ahmet Yılmaz', phone: '0532 123 45 67', email: 'ahmet@email.com' },
    { id: '2', name: 'Fatma Özkan', phone: '0533 234 56 78', email: 'fatma@email.com' },
    { id: '3', name: 'Mehmet Demir', phone: '0534 345 67 89', email: 'mehmet@email.com' },
    { id: '4', name: 'Ayşe Kaya', phone: '0535 456 78 90', email: 'ayse@email.com' }
  ];

  const doctors = [
    { id: '1', name: 'Dr. Ayşe Kaya', specialization: 'Ortodonti', branchId: '1' },
    { id: '2', name: 'Dr. Ali Yıldız', specialization: 'Cerrahi', branchId: '2' },
    { id: '3', name: 'Dr. Mehmet Demir', specialization: 'Pedodonti', branchId: '3' },
    { id: '4', name: 'Dr. Fatma Özkan', specialization: 'Endodonti', branchId: '4' }
  ];

  const branches = [
    { id: '1', name: 'İstanbul Kadıköy Şubesi', code: 'IST-001' },
    { id: '2', name: 'Ankara Kızılay Şubesi', code: 'ANK-001' },
    { id: '3', name: 'İzmir Alsancak Şubesi', code: 'IZM-001' },
    { id: '4', name: 'Bursa Nilüfer Şubesi', code: 'BUR-001' }
  ];

  const appointmentTypes = [
    { value: 'CONSULTATION', label: 'Kontrol' },
    { value: 'TREATMENT', label: 'Tedavi' },
    { value: 'CLEANING', label: 'Temizlik' },
    { value: 'EMERGENCY', label: 'Acil' },
    { value: 'FOLLOW_UP', label: 'Kontrol' },
    { value: 'SURGERY', label: 'Ameliyat' }
  ];

  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.patientId) {
      newErrors.patientId = 'Hasta seçimi zorunludur';
    }

    if (!formData.doctorId) {
      newErrors.doctorId = 'Doktor seçimi zorunludur';
    }

    if (!formData.branchId) {
      newErrors.branchId = 'Şube seçimi zorunludur';
    }

    if (!formData.date) {
      newErrors.date = 'Tarih seçimi zorunludur';
    }

    if (!formData.time) {
      newErrors.time = 'Saat seçimi zorunludur';
    }

    if (!formData.type) {
      newErrors.type = 'Randevu türü seçimi zorunludur';
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
      console.log('Randevu kaydediliyor:', formData);
      
      // Simüle edilmiş API çağrısı
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Başarılı kayıt sonrası randevu listesine yönlendir
      router.push('/appointments');
    } catch (error) {
      console.error('Randevu kaydedilirken hata oluştu:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Hata mesajını temizle
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Seçili şubeye göre doktorları filtrele
  const filteredDoctors = doctors.filter(doctor => 
    !formData.branchId || doctor.branchId === formData.branchId
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link 
                href="/appointments"
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Yeni Randevu</h1>
                <p className="text-sm text-gray-600">Randevu bilgilerini girin ve kaydedin</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Patient and Doctor Selection */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <User className="h-5 w-5 mr-2 text-blue-600" />
              Hasta ve Doktor Seçimi
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hasta *
                </label>
                <select
                  value={formData.patientId}
                  onChange={(e) => handleInputChange('patientId', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.patientId ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Hasta seçiniz</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name} - {patient.phone}
                    </option>
                  ))}
                </select>
                {errors.patientId && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.patientId}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Şube *
                </label>
                <select
                  value={formData.branchId}
                  onChange={(e) => handleInputChange('branchId', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.branchId ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Şube seçiniz</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} ({branch.code})
                    </option>
                  ))}
                </select>
                {errors.branchId && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.branchId}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Doktor *
                </label>
                <select
                  value={formData.doctorId}
                  onChange={(e) => handleInputChange('doctorId', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.doctorId ? 'border-red-300' : 'border-gray-300'
                  }`}
                  disabled={!formData.branchId}
                >
                  <option value="">Doktor seçiniz</option>
                  {filteredDoctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.name} - {doctor.specialization}
                    </option>
                  ))}
                </select>
                {errors.doctorId && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.doctorId}
                  </p>
                )}
                {!formData.branchId && (
                  <p className="mt-1 text-sm text-gray-500">
                    Önce şube seçiniz
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Appointment Details */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-green-600" />
              Randevu Detayları
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tarih *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.date ? 'border-red-300' : 'border-gray-300'
                  }`}
                  min={new Date().toISOString().split('T')[0]}
                />
                {errors.date && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.date}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Saat *
                </label>
                <select
                  value={formData.time}
                  onChange={(e) => handleInputChange('time', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.time ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Saat seçiniz</option>
                  {timeSlots.map((time) => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
                {errors.time && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.time}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Süre (Dakika)
                </label>
                <select
                  value={formData.duration}
                  onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={15}>15 dakika</option>
                  <option value={30}>30 dakika</option>
                  <option value={45}>45 dakika</option>
                  <option value={60}>1 saat</option>
                  <option value={90}>1.5 saat</option>
                  <option value={120}>2 saat</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Randevu Türü *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.type ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  {appointmentTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
                {errors.type && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.type}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notlar
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Randevu ile ilgili notlar..."
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4">
            <Link
              href="/appointments"
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
                  <span>Randevuyu Kaydet</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 