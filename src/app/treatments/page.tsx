'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Plus, 
  Stethoscope,
  User,
  Calendar,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Clock,
  Edit,
  Trash2,
  Building2,
  FileText,
  Activity
} from 'lucide-react';

// Mock tedavi verileri
const mockTreatments = [
  {
    id: '1',
    patientName: 'Ahmet Yılmaz',
    doctorName: 'Dr. Ayşe Kaya',
    branchName: 'İstanbul Kadıköy',
    name: 'Diş Dolgusu',
    type: 'FILLING',
    status: 'IN_PROGRESS',
    startDate: '2024-01-10',
    endDate: '2024-01-20',
    cost: 1200,
    notes: 'Sol üst azı diş dolgusu'
  },
  {
    id: '2',
    patientName: 'Fatma Özkan',
    doctorName: 'Dr. Ali Yıldız',
    branchName: 'Ankara Kızılay',
    name: 'Kanal Tedavisi',
    type: 'ROOT_CANAL',
    status: 'COMPLETED',
    startDate: '2024-01-05',
    endDate: '2024-01-15',
    cost: 2500,
    notes: 'Sağ alt azı diş kanal tedavisi'
  },
  {
    id: '3',
    patientName: 'Mehmet Demir',
    doctorName: 'Dr. Ayşe Kaya',
    branchName: 'İstanbul Kadıköy',
    name: 'Diş Çekimi',
    type: 'EXTRACTION',
    status: 'PLANNED',
    startDate: '2024-01-25',
    endDate: '2024-01-25',
    cost: 800,
    notes: 'Sol alt yirmi yaş dişi çekimi'
  },
  {
    id: '4',
    patientName: 'Ayşe Kaya',
    doctorName: 'Dr. Mehmet Demir',
    branchName: 'İzmir Alsancak',
    name: 'Ortodontik Tedavi',
    type: 'ORTHODONTICS',
    status: 'IN_PROGRESS',
    startDate: '2023-12-01',
    endDate: '2024-06-01',
    cost: 15000,
    notes: 'Braket tedavisi - 6 aylık süreç'
  }
];

const treatmentTypes = {
  CLEANING: { label: 'Temizlik', color: 'bg-blue-100 text-blue-800' },
  FILLING: { label: 'Dolgu', color: 'bg-green-100 text-green-800' },
  EXTRACTION: { label: 'Çekim', color: 'bg-red-100 text-red-800' },
  ROOT_CANAL: { label: 'Kanal', color: 'bg-purple-100 text-purple-800' },
  CROWN: { label: 'Kuron', color: 'bg-yellow-100 text-yellow-800' },
  BRIDGE: { label: 'Köprü', color: 'bg-indigo-100 text-indigo-800' },
  IMPLANT: { label: 'İmplant', color: 'bg-pink-100 text-pink-800' },
  ORTHODONTICS: { label: 'Ortodonti', color: 'bg-orange-100 text-orange-800' },
  SURGERY: { label: 'Ameliyat', color: 'bg-gray-100 text-gray-800' },
  CONSULTATION: { label: 'Kontrol', color: 'bg-teal-100 text-teal-800' }
};

const treatmentStatuses = {
  PLANNED: { label: 'Planlandı', color: 'bg-gray-100 text-gray-800' },
  IN_PROGRESS: { label: 'Devam Ediyor', color: 'bg-blue-100 text-blue-800' },
  COMPLETED: { label: 'Tamamlandı', color: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'İptal', color: 'bg-red-100 text-red-800' }
};

export default function TreatmentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');

  const filteredTreatments = mockTreatments.filter(treatment => {
    const matchesSearch = 
      treatment.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      treatment.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      treatment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      treatment.branchName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || treatment.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || treatment.type === typeFilter;
    const matchesBranch = branchFilter === 'ALL' || treatment.branchName === branchFilter;

    return matchesSearch && matchesStatus && matchesType && matchesBranch;
  });

  const branches = [...new Set(mockTreatments.map(t => t.branchName))];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tedavi Yönetimi</h1>
              <p className="text-sm text-gray-600">Tüm tedavileri görüntüleyin ve yönetin</p>
            </div>
            <Link 
              href="/treatments/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Yeni Tedavi</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tedavi, hasta ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">Tüm Durumlar</option>
              <option value="PLANNED">Planlandı</option>
              <option value="IN_PROGRESS">Devam Ediyor</option>
              <option value="COMPLETED">Tamamlandı</option>
              <option value="CANCELLED">İptal</option>
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">Tüm Türler</option>
              <option value="CLEANING">Temizlik</option>
              <option value="FILLING">Dolgu</option>
              <option value="EXTRACTION">Çekim</option>
              <option value="ROOT_CANAL">Kanal</option>
              <option value="CROWN">Kuron</option>
              <option value="BRIDGE">Köprü</option>
              <option value="IMPLANT">İmplant</option>
              <option value="ORTHODONTICS">Ortodonti</option>
              <option value="SURGERY">Ameliyat</option>
            </select>

            {/* Branch Filter */}
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">Tüm Şubeler</option>
              {branches.map((branch) => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </select>

            {/* Clear Filters */}
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
                setTypeFilter('ALL');
                setBranchFilter('ALL');
              }}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Filtreleri Temizle
            </button>
          </div>
        </div>

        {/* Treatments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTreatments.map((treatment) => (
            <div key={treatment.id} className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Stethoscope className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-semibold text-gray-900">{treatment.name}</h3>
                      <p className="text-sm text-gray-500">{treatment.patientName}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${treatmentStatuses[treatment.status as keyof typeof treatmentStatuses].color}`}>
                    {treatmentStatuses[treatment.status as keyof typeof treatmentStatuses].label}
                  </span>
                </div>

                {/* Treatment Info */}
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <User className="h-4 w-4 mr-2 text-gray-400" />
                    <span><strong>Doktor:</strong> {treatment.doctorName}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                    <span><strong>Şube:</strong> {treatment.branchName}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    <span><strong>Tarih:</strong> {new Date(treatment.startDate).toLocaleDateString('tr-TR')} - {new Date(treatment.endDate).toLocaleDateString('tr-TR')}</span>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${treatmentTypes[treatment.type as keyof typeof treatmentTypes].color}`}>
                        {treatmentTypes[treatment.type as keyof typeof treatmentTypes].label}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">Tedavi Türü</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">₺{treatment.cost.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">Maliyet</div>
                  </div>
                </div>

                <div className="text-sm text-gray-600 mb-4">
                  <strong>Notlar:</strong> {treatment.notes}
                </div>

                {/* Progress Bar for In Progress */}
                {treatment.status === 'IN_PROGRESS' && (
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>İlerleme</span>
                      <span>%60</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '60%' }}></div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex space-x-2">
                  <Link
                    href={`/treatments/${treatment.id}`}
                    className="flex-1 bg-blue-50 text-blue-700 px-3 py-2 rounded text-sm text-center hover:bg-blue-100 transition-colors"
                  >
                    <FileText className="h-4 w-4 inline mr-1" />
                    Detaylar
                  </Link>
                  <Link
                    href={`/treatments/${treatment.id}/edit`}
                    className="flex-1 bg-gray-50 text-gray-700 px-3 py-2 rounded text-sm text-center hover:bg-gray-100 transition-colors"
                  >
                    <Edit className="h-4 w-4 inline mr-1" />
                    Düzenle
                  </Link>
                  <button
                    className="flex-1 bg-red-50 text-red-700 px-3 py-2 rounded text-sm text-center hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="h-4 w-4 inline mr-1" />
                    Sil
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredTreatments.length === 0 && (
          <div className="text-center py-12">
            <Stethoscope className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Tedavi bulunamadı</h3>
            <p className="mt-1 text-sm text-gray-500">
              Seçilen kriterlere uygun tedavi bulunamadı.
            </p>
            <div className="mt-6">
              <Link
                href="/treatments/new"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Yeni Tedavi Oluştur
              </Link>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tedavi Özeti</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{filteredTreatments.length}</div>
              <div className="text-sm text-gray-500">Toplam Tedavi</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {filteredTreatments.filter(t => t.status === 'COMPLETED').length}
              </div>
              <div className="text-sm text-gray-500">Tamamlanan</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {filteredTreatments.filter(t => t.status === 'IN_PROGRESS').length}
              </div>
              <div className="text-sm text-gray-500">Devam Eden</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                ₺{filteredTreatments.reduce((sum, t) => sum + t.cost, 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">Toplam Maliyet</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 