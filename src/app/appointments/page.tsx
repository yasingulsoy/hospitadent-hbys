'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Plus, 
  Calendar,
  Clock,
  User,
  Stethoscope,
  CheckCircle,
  AlertCircle,
  Edit,
  Trash2,
  Building2
} from 'lucide-react';

// Mock randevu verileri
const mockAppointments = [
  {
    id: '1',
    patientName: 'Ahmet Yılmaz',
    doctorName: 'Dr. Ayşe Kaya',
    branchName: 'İstanbul Kadıköy',
    date: '2024-01-15',
    time: '09:00',
    duration: 30,
    type: 'CONSULTATION',
    status: 'CONFIRMED',
    notes: 'Kontrol randevusu'
  },
  {
    id: '2',
    patientName: 'Fatma Özkan',
    doctorName: 'Dr. Ali Yıldız',
    branchName: 'Ankara Kızılay',
    date: '2024-01-15',
    time: '10:30',
    duration: 60,
    type: 'TREATMENT',
    status: 'SCHEDULED',
    notes: 'Dolgu işlemi'
  },
  {
    id: '3',
    patientName: 'Mehmet Demir',
    doctorName: 'Dr. Ayşe Kaya',
    branchName: 'İstanbul Kadıköy',
    date: '2024-01-15',
    time: '14:00',
    duration: 45,
    type: 'CLEANING',
    status: 'CANCELLED',
    notes: 'Hasta iptal etti'
  },
  {
    id: '4',
    patientName: 'Ayşe Kaya',
    doctorName: 'Dr. Mehmet Demir',
    branchName: 'İzmir Alsancak',
    date: '2024-01-16',
    time: '11:00',
    duration: 90,
    type: 'SURGERY',
    status: 'SCHEDULED',
    notes: 'Diş çekimi'
  }
];

const appointmentTypes = {
  CONSULTATION: { label: 'Kontrol', color: 'bg-blue-100 text-blue-800' },
  TREATMENT: { label: 'Tedavi', color: 'bg-green-100 text-green-800' },
  CLEANING: { label: 'Temizlik', color: 'bg-purple-100 text-purple-800' },
  EMERGENCY: { label: 'Acil', color: 'bg-red-100 text-red-800' },
  FOLLOW_UP: { label: 'Kontrol', color: 'bg-yellow-100 text-yellow-800' },
  SURGERY: { label: 'Ameliyat', color: 'bg-orange-100 text-orange-800' }
};

const appointmentStatuses = {
  SCHEDULED: { label: 'Planlandı', color: 'bg-gray-100 text-gray-800' },
  CONFIRMED: { label: 'Onaylandı', color: 'bg-green-100 text-green-800' },
  IN_PROGRESS: { label: 'Devam Ediyor', color: 'bg-blue-100 text-blue-800' },
  COMPLETED: { label: 'Tamamlandı', color: 'bg-purple-100 text-purple-800' },
  CANCELLED: { label: 'İptal', color: 'bg-red-100 text-red-800' },
  NO_SHOW: { label: 'Gelmedi', color: 'bg-orange-100 text-orange-800' }
};

export default function AppointmentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState('2024-01-15');

  const filteredAppointments = mockAppointments.filter(appointment => {
    const matchesSearch = 
      appointment.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.branchName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || appointment.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || appointment.type === typeFilter;
    const matchesBranch = branchFilter === 'ALL' || appointment.branchName === branchFilter;
    const matchesDate = appointment.date === selectedDate;

    return matchesSearch && matchesStatus && matchesType && matchesBranch && matchesDate;
  });

  const branches = [...new Set(mockAppointments.map(a => a.branchName))];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Randevu Yönetimi</h1>
              <p className="text-sm text-gray-600">Tüm randevuları görüntüleyin ve yönetin</p>
            </div>
            <Link 
              href="/appointments/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Yeni Randevu</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Date Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tarih</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Search */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">Arama</label>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Hasta, doktor ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Durum</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">Tüm Durumlar</option>
                <option value="SCHEDULED">Planlandı</option>
                <option value="CONFIRMED">Onaylandı</option>
                <option value="IN_PROGRESS">Devam Ediyor</option>
                <option value="COMPLETED">Tamamlandı</option>
                <option value="CANCELLED">İptal</option>
                <option value="NO_SHOW">Gelmedi</option>
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tür</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">Tüm Türler</option>
                <option value="CONSULTATION">Kontrol</option>
                <option value="TREATMENT">Tedavi</option>
                <option value="CLEANING">Temizlik</option>
                <option value="EMERGENCY">Acil</option>
                <option value="FOLLOW_UP">Kontrol</option>
                <option value="SURGERY">Ameliyat</option>
              </select>
            </div>

            {/* Branch Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Şube</label>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">Tüm Şubeler</option>
                {branches.map((branch) => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('ALL');
                  setTypeFilter('ALL');
                  setBranchFilter('ALL');
                  setSelectedDate('2024-01-15');
                }}
                className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Filtreleri Temizle
              </button>
            </div>
          </div>
        </div>

        {/* Appointments List */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Saat
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hasta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Doktor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Şube
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tür
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notlar
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAppointments.map((appointment) => (
                  <tr key={appointment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {appointment.time}
                        </span>
                        <span className="text-xs text-gray-500 ml-1">
                          ({appointment.duration}dk)
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {appointment.patientName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Stethoscope className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {appointment.doctorName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {appointment.branchName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${appointmentTypes[appointment.type as keyof typeof appointmentTypes].color}`}>
                        {appointmentTypes[appointment.type as keyof typeof appointmentTypes].label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${appointmentStatuses[appointment.status as keyof typeof appointmentStatuses].color}`}>
                        {appointmentStatuses[appointment.status as keyof typeof appointmentStatuses].label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {appointment.notes}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          href={`/appointments/${appointment.id}`}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {filteredAppointments.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Randevu bulunamadı</h3>
              <p className="mt-1 text-sm text-gray-500">
                Seçilen kriterlere uygun randevu bulunamadı.
              </p>
              <div className="mt-6">
                <Link
                  href="/appointments/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Yeni Randevu Oluştur
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Günlük Özet</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{filteredAppointments.length}</div>
              <div className="text-sm text-gray-500">Toplam Randevu</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {filteredAppointments.filter(a => a.status === 'CONFIRMED').length}
              </div>
              <div className="text-sm text-gray-500">Onaylanan</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {filteredAppointments.filter(a => a.status === 'SCHEDULED').length}
              </div>
              <div className="text-sm text-gray-500">Bekleyen</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {filteredAppointments.filter(a => a.status === 'CANCELLED').length}
              </div>
              <div className="text-sm text-gray-500">İptal</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 