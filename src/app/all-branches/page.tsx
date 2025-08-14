'use client';

import Link from 'next/link';
import { 
  Building2, 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  LogOut, 
  Shield,
  ArrowLeft,
  Plus
} from 'lucide-react';
import { useEffect, useState } from 'react';

// Tip tanımlamaları
interface BranchWithCards {
  id: number;
  name: string;
  code: string;
  location: string;
  patients: string;
  appointments: string;
  revenue: string;
  manager: string;
  status: string;
  lastActivity: string;
  cards: CardData[];
}

interface CardData {
  card_title: string;
  formatted_value: string;
  data_type?: string;
}

interface Branch {
  id: number;
  name: string;
  code: string;
  location?: string;
  status?: string;
  last_activity?: string;
}

export default function AllBranchesPage() {
  const [role, setRole] = useState<number | null>(null);
  const [allBranches, setAllBranches] = useState<BranchWithCards[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user') || '';
      if (userStr) {
        const user = JSON.parse(userStr);
        setRole(typeof user?.role === 'number' ? user.role : null);
      }
    } catch {}
    
    // Tüm şubeleri yükle
    loadAllBranches();
  }, []);

  const canSeeAdmin = role === 1 || role === 2;

  // Tüm şubeleri yükle
  const loadAllBranches = async () => {
    try {
      setLoading(true);
      
      // PostgreSQL'den tüm şubeleri al
      const branchesResponse = await fetch('/api/branches');
      if (!branchesResponse.ok) {
        throw new Error('Şubeler yüklenemedi');
      }
      
      const branchesData = await branchesResponse.json();
      if (!branchesData.success) {
        throw new Error('Şube verisi alınamadı');
      }
      
      // Her şube için kart verilerini al
      const branchesWithCards = await Promise.all(
        branchesData.branches.map(async (branch: Branch) => {
          try {
            const response = await fetch('/api/test-db/branch-cards/data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ branch_id: branch.id })
            });
            
            let cards = [];
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.cards) {
                cards = data.cards;
              }
            }
            
            return {
              id: branch.id,
              name: branch.name,
              code: branch.code,
              location: branch.location || 'Belirtilmemiş',
              patients: cards.find((c: CardData) => c.card_title === 'Hasta Sayısı')?.formatted_value || '0',
              appointments: cards.find((c: CardData) => c.card_title === 'Bugünkü Randevu')?.formatted_value || '0',
              revenue: cards.find((c: CardData) => c.card_title === 'Aylık Gelir')?.formatted_value || '₺0',
              manager: cards.find((c: CardData) => c.card_title === 'Şube Müdürü')?.formatted_value || 'Belirtilmemiş',
              status: branch.status || 'active',
              lastActivity: branch.last_activity || 'Bilinmiyor',
              cards: cards
            };
          } catch (error) {
            console.error(`Şube ${branch.id} kartları yüklenirken hata:`, error);
            return {
              id: branch.id,
              name: branch.name,
              code: branch.code,
              location: branch.location || 'Belirtilmemiş',
              patients: '0',
              appointments: '0',
              revenue: '₺0',
              manager: 'Belirtilmemiş',
              status: branch.status || 'active',
              lastActivity: branch.last_activity || 'Bilinmiyor',
              cards: []
            };
          }
        })
      );
      
      setAllBranches(branchesWithCards);
      
    } catch (error) {
      console.error('Şubeler yüklenirken hata:', error);
      // Hata durumunda örnek veriler göster
      setAllBranches([
        {
          id: 1,
          name: 'Merkez Şube',
          code: 'MER-001',
          location: 'İstanbul, Merkez',
          patients: '1,247',
          appointments: '23',
          revenue: '₺45,230',
          manager: 'Dr. Ayşe Kaya',
          status: 'active',
          lastActivity: '2 dakika önce',
          cards: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const totalStats = {
    totalPatients: allBranches.reduce((sum, branch) => {
      const patients = typeof branch.patients === 'string' ? parseInt(branch.patients.replace(/,/g, '')) || 0 : branch.patients || 0;
      return sum + patients;
    }, 0),
    totalAppointments: allBranches.reduce((sum, branch) => {
      const appointments = typeof branch.appointments === 'string' ? parseInt(branch.appointments) || 0 : branch.appointments || 0;
      return sum + appointments;
    }, 0),
    totalRevenue: allBranches.reduce((sum, branch) => {
      const revenue = typeof branch.revenue === 'string' ? parseInt(branch.revenue.replace(/[₺,]/g, '')) || 0 : branch.revenue || 0;
      return sum + revenue;
    }, 0),
    activeBranches: allBranches.length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Professional Header */}
      <header className="bg-white shadow-xl border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <Link 
                  href="/"
                  className="bg-gray-100 p-3 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  <ArrowLeft className="h-6 w-6 text-gray-600" />
                </Link>
                <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 p-3 rounded-xl">
                  <Building2 className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Tüm Şubeler</h1>
                  <p className="text-gray-600 mt-1">Tüm şubelerin detaylı görünümü</p>
                </div>
              </div>
              <div className="flex items-center space-x-6">
                {canSeeAdmin && (
                  <Link 
                    href="/admin"
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-all duration-300 font-semibold flex items-center space-x-2"
                  >
                    <Shield className="h-4 w-4" />
                    <span>Admin Panel</span>
                  </Link>
                )}
                
                <button 
                  onClick={() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                    document.cookie = 'user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                    window.location.href = '/login';
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-all duration-300 font-semibold flex items-center space-x-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Çıkış Yap</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Toplam Şube</p>
                <p className="text-4xl font-bold text-gray-900 mt-3">{totalStats.activeBranches}</p>
                <div className="flex items-center mt-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                  <p className="text-sm text-green-600 font-semibold">Tümü Aktif</p>
                </div>
              </div>
              <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl shadow-lg">
                <Building2 className="h-10 w-10 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Toplam Hasta</p>
                <p className="text-4xl font-bold text-gray-900 mt-3">{totalStats.totalPatients.toLocaleString()}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-blue-500 mr-1" />
                  <p className="text-sm text-blue-600 font-semibold">+8.5% bu ay</p>
                </div>
              </div>
              <div className="p-4 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl shadow-lg">
                <Users className="h-10 w-10 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Toplam Randevu</p>
                <p className="text-4xl font-bold text-gray-900 mt-3">{totalStats.totalAppointments}</p>
                <div className="flex items-center mt-2">
                  <Clock className="h-4 w-4 text-purple-500 mr-1" />
                  <p className="text-sm text-purple-600 font-semibold">Bugün</p>
                </div>
              </div>
              <div className="p-4 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl shadow-lg">
                <Calendar className="h-10 w-10 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Toplam Gelir</p>
                <p className="text-4xl font-bold text-gray-900 mt-3">₺{totalStats.totalRevenue.toLocaleString()}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-orange-500 mr-1" />
                  <p className="text-sm text-orange-600 font-semibold">+12.3% geçen aya göre</p>
                </div>
              </div>
              <div className="p-4 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl shadow-lg">
                <DollarSign className="h-10 w-10 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* All Branches Grid */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Tüm Şubeler</h2>
              <p className="text-gray-600 mt-1">Toplam {allBranches.length} şube</p>
            </div>
            {canSeeAdmin && (
              <Link 
                href="/admin/branches" 
                className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition-all duration-300 font-semibold flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Yeni Şube Ekle</span>
              </Link>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {allBranches.map((branch) => (
              <div key={branch.id} className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{branch.name}</h3>
                    <p className="text-sm text-gray-500 font-mono">{branch.code}</p>
                    <p className="text-xs text-gray-400">{branch.location}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Aktif
                    </span>
                    {branch.growth && (
                      <span className="text-xs text-green-600 font-semibold">{branch.growth}</span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      Hasta
                    </span>
                    <span className="font-bold text-gray-900">{branch.patients}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      Randevu
                    </span>
                    <span className="font-bold text-gray-900">{branch.appointments}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Gelir
                    </span>
                    <span className="font-bold text-gray-900">{branch.revenue}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      Müdür
                    </span>
                    <span className="font-medium text-gray-900 text-xs">{branch.manager}</span>
                  </div>
                </div>

                <div className="text-xs text-gray-400 mb-4">
                  Son aktivite: {branch.lastActivity}
                </div>

                {canSeeAdmin ? (
                  <div className="flex space-x-3">
                    <Link
                      href={`/admin/branches/${branch.id}`}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-xl text-sm text-center hover:shadow-lg transition-all duration-300 font-semibold"
                    >
                      Detaylar
                    </Link>
                    <Link
                      href={`/admin/branches/${branch.id}/edit`}
                      className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm text-center hover:bg-gray-200 transition-all duration-300 font-semibold"
                    >
                      Düzenle
                    </Link>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 font-medium">Admin yetkisi gerekli</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
