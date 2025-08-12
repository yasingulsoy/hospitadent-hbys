'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Plus, 
  FileText,
  User,
  Calendar,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Clock,
  Edit,
  Trash2,
  Building2,
  Download,
  Eye,
  CreditCard,
  Banknote
} from 'lucide-react';

// Mock fatura verileri
const mockInvoices = [
  {
    id: '1',
    invoiceNumber: 'INV-2024-001',
    patientName: 'Ahmet Yılmaz',
    doctorName: 'Dr. Ayşe Kaya',
    branchName: 'İstanbul Kadıköy',
    amount: 1200,
    tax: 216,
    total: 1416,
    status: 'PAID',
    dueDate: '2024-01-20',
    paidDate: '2024-01-15',
    treatmentName: 'Diş Dolgusu',
    notes: 'Sol üst azı diş dolgusu'
  },
  {
    id: '2',
    invoiceNumber: 'INV-2024-002',
    patientName: 'Fatma Özkan',
    doctorName: 'Dr. Ali Yıldız',
    branchName: 'Ankara Kızılay',
    amount: 2500,
    tax: 450,
    total: 2950,
    status: 'PENDING',
    dueDate: '2024-01-25',
    paidDate: null,
    treatmentName: 'Kanal Tedavisi',
    notes: 'Sağ alt azı diş kanal tedavisi'
  },
  {
    id: '3',
    invoiceNumber: 'INV-2024-003',
    patientName: 'Mehmet Demir',
    doctorName: 'Dr. Ayşe Kaya',
    branchName: 'İstanbul Kadıköy',
    amount: 800,
    tax: 144,
    total: 944,
    status: 'OVERDUE',
    dueDate: '2024-01-10',
    paidDate: null,
    treatmentName: 'Diş Çekimi',
    notes: 'Sol alt yirmi yaş dişi çekimi'
  },
  {
    id: '4',
    invoiceNumber: 'INV-2024-004',
    patientName: 'Ayşe Kaya',
    doctorName: 'Dr. Mehmet Demir',
    branchName: 'İzmir Alsancak',
    amount: 15000,
    tax: 2700,
    total: 17700,
    status: 'PARTIAL',
    dueDate: '2024-02-01',
    paidDate: null,
    treatmentName: 'Ortodontik Tedavi',
    notes: 'Braket tedavisi - 6 aylık süreç'
  }
];

const invoiceStatuses = {
  PENDING: { label: 'Bekliyor', color: 'bg-yellow-100 text-yellow-800' },
  PAID: { label: 'Ödendi', color: 'bg-green-100 text-green-800' },
  OVERDUE: { label: 'Gecikmiş', color: 'bg-red-100 text-red-800' },
  CANCELLED: { label: 'İptal', color: 'bg-gray-100 text-gray-800' },
  PARTIAL: { label: 'Kısmi', color: 'bg-orange-100 text-orange-800' }
};

export default function InvoicesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');

  const filteredInvoices = mockInvoices.filter(invoice => {
    const matchesSearch = 
      invoice.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.branchName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || invoice.status === statusFilter;
    const matchesBranch = branchFilter === 'ALL' || invoice.branchName === branchFilter;

    return matchesSearch && matchesStatus && matchesBranch;
  });

  const branches = [...new Set(mockInvoices.map(i => i.branchName))];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Fatura Yönetimi</h1>
              <p className="text-sm text-gray-600">Tüm faturaları görüntüleyin ve yönetin</p>
            </div>
            <Link 
              href="/invoices/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Yeni Fatura</span>
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
                placeholder="Fatura, hasta ara..."
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
              <option value="PENDING">Bekliyor</option>
              <option value="PAID">Ödendi</option>
              <option value="OVERDUE">Gecikmiş</option>
              <option value="CANCELLED">İptal</option>
              <option value="PARTIAL">Kısmi</option>
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
                setBranchFilter('ALL');
              }}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Filtreleri Temizle
            </button>
          </div>
        </div>

        {/* Invoices List */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fatura No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hasta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tedavi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Şube
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tutar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vade
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
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {invoice.invoiceNumber}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {invoice.patientName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invoice.treatmentName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {invoice.branchName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="font-medium">₺{invoice.total.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">
                          Net: ₺{invoice.amount.toLocaleString()} | KDV: ₺{invoice.tax.toLocaleString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(invoice.dueDate).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${invoiceStatuses[invoice.status as keyof typeof invoiceStatuses].color}`}>
                        {invoice.status === 'PAID' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {invoice.status === 'OVERDUE' && <AlertCircle className="h-3 w-3 mr-1" />}
                        {invoice.status === 'PENDING' && <Clock className="h-3 w-3 mr-1" />}
                        {invoiceStatuses[invoice.status as keyof typeof invoiceStatuses].label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                          title="Görüntüle"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/invoices/${invoice.id}/edit`}
                          className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                          title="Düzenle"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          className="text-purple-600 hover:text-purple-900 p-1 rounded hover:bg-purple-50"
                          title="İndir"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          className="text-orange-600 hover:text-orange-900 p-1 rounded hover:bg-orange-50"
                          title="Ödeme Al"
                        >
                          <CreditCard className="h-4 w-4" />
                        </button>
                        <button
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                          title="Sil"
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
          {filteredInvoices.length === 0 && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Fatura bulunamadı</h3>
              <p className="mt-1 text-sm text-gray-500">
                Seçilen kriterlere uygun fatura bulunamadı.
              </p>
              <div className="mt-6">
                <Link
                  href="/invoices/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Yeni Fatura Oluştur
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Finansal Özet</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{filteredInvoices.length}</div>
              <div className="text-sm text-gray-500">Toplam Fatura</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                ₺{filteredInvoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.total, 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">Tahsilat</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                ₺{filteredInvoices.filter(i => i.status === 'PENDING').reduce((sum, i) => sum + i.total, 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">Bekleyen</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                ₺{filteredInvoices.filter(i => i.status === 'OVERDUE').reduce((sum, i) => sum + i.total, 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">Gecikmiş</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                ₺{filteredInvoices.reduce((sum, i) => sum + i.total, 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">Toplam Tutar</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 