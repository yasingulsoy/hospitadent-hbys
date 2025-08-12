'use client';

import { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar,
  Download,
  Filter,
  Building2,
  Stethoscope,
  FileText,
  PieChart,
  Activity
} from 'lucide-react';

// Mock rapor verileri
const mockReportData = {
  // Aylık gelir verileri
  monthlyRevenue: [
    { month: 'Ocak', revenue: 125000, patients: 45 },
    { month: 'Şubat', revenue: 142000, patients: 52 },
    { month: 'Mart', revenue: 138000, patients: 48 },
    { month: 'Nisan', revenue: 156000, patients: 58 },
    { month: 'Mayıs', revenue: 168000, patients: 62 },
    { month: 'Haziran', revenue: 175000, patients: 65 }
  ],
  
  // Şube performansı
  branchPerformance: [
    { name: 'İstanbul Kadıköy', revenue: 45000, patients: 18, appointments: 85 },
    { name: 'Ankara Kızılay', revenue: 38000, patients: 15, appointments: 72 },
    { name: 'İzmir Alsancak', revenue: 32000, patients: 12, appointments: 58 },
    { name: 'Bursa Nilüfer', revenue: 28000, patients: 10, appointments: 45 }
  ],
  
  // Tedavi türleri dağılımı
  treatmentTypes: [
    { type: 'Kontrol', count: 45, percentage: 25 },
    { type: 'Dolgu', count: 38, percentage: 21 },
    { type: 'Temizlik', count: 32, percentage: 18 },
    { type: 'Kanal', count: 28, percentage: 16 },
    { type: 'Çekim', count: 22, percentage: 12 },
    { type: 'Diğer', count: 15, percentage: 8 }
  ],
  
  // Hasta yaş dağılımı
  patientAgeGroups: [
    { age: '0-18', count: 25, percentage: 15 },
    { age: '19-30', count: 45, percentage: 27 },
    { age: '31-45', count: 52, percentage: 31 },
    { age: '46-60', count: 35, percentage: 21 },
    { age: '60+', count: 12, percentage: 7 }
  ]
};

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('LAST_6_MONTHS');
  const [selectedBranch, setSelectedBranch] = useState('ALL');

  const periods = [
    { value: 'LAST_MONTH', label: 'Son 1 Ay' },
    { value: 'LAST_3_MONTHS', label: 'Son 3 Ay' },
    { value: 'LAST_6_MONTHS', label: 'Son 6 Ay' },
    { value: 'LAST_YEAR', label: 'Son 1 Yıl' }
  ];

  const branches = [
    { value: 'ALL', label: 'Tüm Şubeler' },
    { value: 'IST-001', label: 'İstanbul Kadıköy' },
    { value: 'ANK-001', label: 'Ankara Kızılay' },
    { value: 'IZM-001', label: 'İzmir Alsancak' },
    { value: 'BUR-001', label: 'Bursa Nilüfer' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Raporlar ve Analizler</h1>
              <p className="text-sm text-gray-600">Detaylı performans raporları ve analizler</p>
            </div>
            <div className="flex space-x-3">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {periods.map((period) => (
                  <option key={period.value} value={period.value}>{period.label}</option>
                ))}
              </select>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {branches.map((branch) => (
                  <option key={branch.value} value={branch.value}>{branch.label}</option>
                ))}
              </select>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                <Download className="h-4 w-4" />
                <span>Rapor İndir</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Toplam Gelir</p>
                <p className="text-2xl font-bold text-gray-900">₺904,000</p>
                <p className="text-sm text-green-600">+12.5% geçen aya göre</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Toplam Hasta</p>
                <p className="text-2xl font-bold text-gray-900">1,247</p>
                <p className="text-sm text-green-600">+8.3% geçen aya göre</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Randevu Sayısı</p>
                <p className="text-2xl font-bold text-gray-900">3,156</p>
                <p className="text-sm text-green-600">+15.2% geçen aya göre</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Stethoscope className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tamamlanan Tedavi</p>
                <p className="text-2xl font-bold text-gray-900">892</p>
                <p className="text-sm text-green-600">+6.7% geçen aya göre</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Revenue Chart */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                Aylık Gelir Trendi
              </h3>
              <div className="flex space-x-2">
                <button className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">Gelir</button>
                <button className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">Hasta</button>
              </div>
            </div>
            
            {/* Simple Bar Chart */}
            <div className="space-y-3">
              {mockReportData.monthlyRevenue.map((item, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-16 text-sm text-gray-600">{item.month}</div>
                  <div className="flex-1 ml-4">
                    <div className="flex items-center">
                      <div 
                        className="bg-blue-500 h-6 rounded"
                        style={{ width: `${(item.revenue / 200000) * 100}%` }}
                      ></div>
                      <span className="ml-2 text-sm font-medium">₺{item.revenue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Branch Performance */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <Building2 className="h-5 w-5 mr-2 text-green-600" />
              Şube Performansı
            </h3>
            
            <div className="space-y-4">
              {mockReportData.branchPerformance.map((branch, index) => (
                <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-900">{branch.name}</span>
                    <span className="text-sm font-semibold text-green-600">₺{branch.revenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{branch.patients} hasta</span>
                    <span>{branch.appointments} randevu</span>
                  </div>
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${(branch.revenue / 50000) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Treatment Types Distribution */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <PieChart className="h-5 w-5 mr-2 text-purple-600" />
              Tedavi Türleri Dağılımı
            </h3>
            
            <div className="space-y-3">
              {mockReportData.treatmentTypes.map((treatment, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-3"
                      style={{ 
                        backgroundColor: [
                          '#3B82F6', '#10B981', '#F59E0B', 
                          '#EF4444', '#8B5CF6', '#6B7280'
                        ][index % 6]
                      }}
                    ></div>
                    <span className="text-sm text-gray-700">{treatment.type}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">{treatment.count}</span>
                    <span className="text-sm text-gray-500">({treatment.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Patient Age Distribution */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <Activity className="h-5 w-5 mr-2 text-orange-600" />
              Hasta Yaş Dağılımı
            </h3>
            
            <div className="space-y-3">
              {mockReportData.patientAgeGroups.map((ageGroup, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{ageGroup.age} yaş</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-orange-500 h-2 rounded-full"
                        style={{ width: `${ageGroup.percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{ageGroup.count}</span>
                    <span className="text-sm text-gray-500">({ageGroup.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Additional Reports */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h4 className="font-semibold text-gray-900 mb-4">En Popüler Tedaviler</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Diş Dolgusu</span>
                <span className="text-sm font-medium">38 hasta</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Diş Temizliği</span>
                <span className="text-sm font-medium">32 hasta</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Kontrol</span>
                <span className="text-sm font-medium">45 hasta</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h4 className="font-semibold text-gray-900 mb-4">En Aktif Doktorlar</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Dr. Ayşe Kaya</span>
                <span className="text-sm font-medium">156 randevu</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Dr. Ali Yıldız</span>
                <span className="text-sm font-medium">142 randevu</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Dr. Mehmet Demir</span>
                <span className="text-sm font-medium">128 randevu</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h4 className="font-semibold text-gray-900 mb-4">Finansal Özet</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Ortalama Fatura</span>
                <span className="text-sm font-medium">₺1,250</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Tahsilat Oranı</span>
                <span className="text-sm font-medium text-green-600">94.2%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Gecikmiş Ödemeler</span>
                <span className="text-sm font-medium text-red-600">₺12,450</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 