'use client';

import { useState } from 'react';
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
  AlertCircle
} from 'lucide-react';

// Mock şube verileri
const mockBranches = [
  {
    id: '1',
    name: 'İstanbul Kadıköy Şubesi',
    code: 'IST-001',
    address: 'Kadıköy, İstanbul',
    phone: '0216 123 45 67',
    email: 'kadikoy@hospitadent.com',
    manager: 'Dr. Ayşe Kaya',
    patients: 1247,
    appointments: 23,
    revenue: 45230,
    status: 'ACTIVE',
    timezone: 'Europe/Istanbul'
  },
  {
    id: '2',
    name: 'Ankara Kızılay Şubesi',
    code: 'ANK-001',
    address: 'Kızılay, Ankara',
    phone: '0312 234 56 78',
    email: 'kizilay@hospitadent.com',
    manager: 'Dr. Ali Yıldız',
    patients: 892,
    appointments: 18,
    revenue: 32150,
    status: 'ACTIVE',
    timezone: 'Europe/Istanbul'
  },
  {
    id: '3',
    name: 'İzmir Alsancak Şubesi',
    code: 'IZM-001',
    address: 'Alsancak, İzmir',
    phone: '0232 345 67 89',
    email: 'alsancak@hospitadent.com',
    manager: 'Dr. Mehmet Demir',
    patients: 756,
    appointments: 15,
    revenue: 28420,
    status: 'ACTIVE',
    timezone: 'Europe/Istanbul'
  },
  {
    id: '4',
    name: 'Bursa Nilüfer Şubesi',
    code: 'BUR-001',
    address: 'Nilüfer, Bursa',
    phone: '0224 456 78 90',
    email: 'nilufer@hospitadent.com',
    manager: 'Dr. Fatma Özkan',
    patients: 634,
    appointments: 12,
    revenue: 19850,
    status: 'ACTIVE',
    timezone: 'Europe/Istanbul'
  },
  {
    id: '5',
    name: 'Antalya Muratpaşa Şubesi',
    code: 'ANT-001',
    address: 'Muratpaşa, Antalya',
    phone: '0242 567 89 01',
    email: 'muratpasa@hospitadent.com',
    manager: 'Dr. Can Yılmaz',
    patients: 523,
    appointments: 9,
    revenue: 15680,
    status: 'INACTIVE',
    timezone: 'Europe/Istanbul'
  }
];

export default function BranchesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredBranches = mockBranches.filter(branch => {
    const matchesSearch = 
      branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      branch.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      branch.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      branch.manager.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || branch.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Şube Yönetimi</h1>
              <p className="text-sm text-gray-600">Tüm şubeleri görüntüleyin ve yönetin</p>
            </div>
            <Link 
              href="/branches/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Yeni Şube</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Şube ara..."
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
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Pasif</option>
            </select>

            {/* Clear Filters */}
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
              }}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Filtreleri Temizle
            </button>
          </div>
        </div>

        {/* Branches Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBranches.map((branch) => (
            <div key={branch.id} className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Building2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-semibold text-gray-900">{branch.name}</h3>
                      <p className="text-sm text-gray-500">{branch.code}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    branch.status === 'ACTIVE' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {branch.status === 'ACTIVE' ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Aktif
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Pasif
                      </>
                    )}
                  </span>
                </div>

                {/* Contact Info */}
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                    <span>{branch.address}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="h-4 w-4 mr-2 text-gray-400" />
                    <span>{branch.phone}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="h-4 w-4 mr-2 text-gray-400" />
                    <span>{branch.email}</span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="p-6">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">{branch.patients}</div>
                    <div className="text-xs text-gray-500">Hasta</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">{branch.appointments}</div>
                    <div className="text-xs text-gray-500">Randevu</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">₺{branch.revenue.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">Gelir</div>
                  </div>
                </div>

                <div className="text-sm text-gray-600 mb-4">
                  <strong>Müdür:</strong> {branch.manager}
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <Link
                    href={`/branches/${branch.id}`}
                    className="flex-1 bg-blue-50 text-blue-700 px-3 py-2 rounded text-sm text-center hover:bg-blue-100 transition-colors"
                  >
                    <Eye className="h-4 w-4 inline mr-1" />
                    Görüntüle
                  </Link>
                  <Link
                    href={`/branches/${branch.id}/edit`}
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
        {filteredBranches.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Şube bulunamadı</h3>
            <p className="mt-1 text-sm text-gray-500">
              Arama kriterlerinize uygun şube bulunamadı.
            </p>
            <div className="mt-6">
              <Link
                href="/branches/new"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Yeni Şube Ekle
              </Link>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Özet İstatistikler</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{filteredBranches.length}</div>
              <div className="text-sm text-gray-500">Toplam Şube</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {filteredBranches.filter(b => b.status === 'ACTIVE').length}
              </div>
              <div className="text-sm text-gray-500">Aktif Şube</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {filteredBranches.reduce((sum, b) => sum + b.patients, 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">Toplam Hasta</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                ₺{filteredBranches.reduce((sum, b) => sum + b.revenue, 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">Toplam Gelir</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 