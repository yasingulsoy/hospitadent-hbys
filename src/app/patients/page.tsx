'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Plus, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye,
  Phone,
  Mail,
  Calendar,
  User
} from 'lucide-react';

// Mock data - gerçek uygulamada API'den gelecek
const mockPatients = [
  {
    id: '1',
    firstName: 'Ahmet',
    lastName: 'Yılmaz',
    email: 'ahmet.yilmaz@email.com',
    phone: '0532 123 45 67',
    dateOfBirth: '1985-03-15',
    gender: 'MALE',
    lastVisit: '2024-01-15',
    status: 'ACTIVE'
  },
  {
    id: '2',
    firstName: 'Fatma',
    lastName: 'Özkan',
    email: 'fatma.ozkan@email.com',
    phone: '0533 234 56 78',
    dateOfBirth: '1990-07-22',
    gender: 'FEMALE',
    lastVisit: '2024-01-20',
    status: 'ACTIVE'
  },
  {
    id: '3',
    firstName: 'Mehmet',
    lastName: 'Demir',
    email: 'mehmet.demir@email.com',
    phone: '0534 345 67 89',
    dateOfBirth: '1978-11-08',
    gender: 'MALE',
    lastVisit: '2024-01-18',
    status: 'ACTIVE'
  },
  {
    id: '4',
    firstName: 'Ayşe',
    lastName: 'Kaya',
    email: 'ayse.kaya@email.com',
    phone: '0535 456 78 90',
    dateOfBirth: '1992-05-12',
    gender: 'FEMALE',
    lastVisit: '2024-01-10',
    status: 'INACTIVE'
  }
];

export default function PatientsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [genderFilter, setGenderFilter] = useState('ALL');

  const filteredPatients = mockPatients.filter(patient => {
    const matchesSearch = 
      patient.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.phone.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'ALL' || patient.status === statusFilter;
    const matchesGender = genderFilter === 'ALL' || patient.gender === genderFilter;

    return matchesSearch && matchesStatus && matchesGender;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Hasta Yönetimi</h1>
              <p className="text-sm text-gray-600">Tüm hastaları görüntüleyin ve yönetin</p>
            </div>
            <Link 
              href="/patients/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Yeni Hasta</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Hasta ara..."
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

            {/* Gender Filter */}
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">Tüm Cinsiyetler</option>
              <option value="MALE">Erkek</option>
              <option value="FEMALE">Kadın</option>
            </select>

            {/* Clear Filters */}
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
                setGenderFilter('ALL');
              }}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Filtreleri Temizle
            </button>
          </div>
        </div>

        {/* Patients Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hasta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İletişim
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Doğum Tarihi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Son Ziyaret
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {patient.firstName} {patient.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {patient.gender === 'MALE' ? 'Erkek' : 'Kadın'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span>{patient.phone}</span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span>{patient.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(patient.dateOfBirth).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(patient.lastVisit).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        patient.status === 'ACTIVE' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {patient.status === 'ACTIVE' ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          href={`/patients/${patient.id}`}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/patients/${patient.id}/edit`}
                          className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
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

          {/* Pagination */}
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                Önceki
              </button>
              <button className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                Sonraki
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Toplam <span className="font-medium">{filteredPatients.length}</span> hasta
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                    Önceki
                  </button>
                  <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                    1
                  </button>
                  <button className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                    Sonraki
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 