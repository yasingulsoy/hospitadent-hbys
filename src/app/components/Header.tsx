'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Building2, Activity, Shield, LogOut, Users } from 'lucide-react';

export default function Header() {
  const [userName, setUserName] = useState<string>('Kullanıcı');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [canSeeAdmin, setCanSeeAdmin] = useState(false);

  useEffect(() => {
    // Kullanıcı giriş durumunu kontrol et
    const checkAuth = () => {
      // Local storage'dan kullanıcı bilgisini al
      const user = localStorage.getItem('user');
      if (user) {
        try {
          const userData = JSON.parse(user);
          setUserName(userData.username || userData.name || 'Kullanıcı');
          setIsLoggedIn(true);
          // Admin yetkisini kontrol et
          setCanSeeAdmin(userData.role === 1 || userData.role === 2);
        } catch (error) {
          console.error('Kullanıcı bilgisi parse edilemedi:', error);
          // Hata durumunda giriş yapılmamış kabul et
          setIsLoggedIn(false);
          setCanSeeAdmin(false);
          setUserName('Kullanıcı');
        }
      } else {
        // Kullanıcı giriş yapmamış
        setIsLoggedIn(false);
        setCanSeeAdmin(false);
        setUserName('Kullanıcı');
      }
    };

    checkAuth();
    
    // Storage değişikliklerini dinle
    const handleStorageChange = () => {
      checkAuth();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLogout = async () => {
    try {
      // Backend'e logout isteği gönder
      await fetch('http://localhost:5000/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout hatası:', error);
    } finally {
      // Local storage'dan sadece user bilgisini temizle
      localStorage.removeItem('user');
      setIsLoggedIn(false);
      setUserName('Kullanıcı');
      // Login sayfasına yönlendir
      window.location.href = '/login';
    }
  };

  return (
    <header className="bg-white shadow-xl border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          <div className="flex items-center justify-between">
            {/* Sol taraf - Logo ve Sistem Adı */}
            <div className="flex items-center space-x-6">
              <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 p-4 rounded-2xl shadow-2xl">
                <Building2 className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
                  Hospitadent Dental HBYS
                </h1>
                <p className="text-lg text-gray-600 mt-2 font-medium">Merkezi Yönetim Sistemi</p>
                <p className="text-sm text-gray-500 mt-1">Kurumsal Diş Sağlığı Yönetimi Platformu</p>
              </div>
            </div>

            {/* Sağ taraf - Sistem Durumu ve Kullanıcı Bilgisi */}
            <div className="flex items-center space-x-6">
              {/* Sistem Durumu */}
              <div className="text-right">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 p-2 rounded-full">
                    <Activity className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Sistem Durumu</p>
                    <p className="text-sm font-semibold text-green-600">Aktif</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">Son güncelleme: {new Date().toLocaleDateString('tr-TR')}</p>
              </div>

              {/* Kullanıcı Bilgisi */}
              {isLoggedIn && (
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Hoşgeldiniz,</div>
                    <div className="text-sm font-semibold text-gray-800">{userName}</div>
                  </div>
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">
                      {userName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
              )}

              {/* Admin Panel ve Çıkış Butonları */}
              <div className="flex items-center space-x-3">
                {isLoggedIn ? (
                  <>
                    <Link
                      href="/"
                      className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-200 transition-all duration-300 font-semibold flex items-center space-x-2"
                    >
                      <span>Ana Sayfa</span>
                    </Link>
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
                      onClick={handleLogout}
                      className="bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-all duration-300 font-semibold flex items-center space-x-2"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Çıkış Yap</span>
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-all duration-300 font-semibold flex items-center space-x-2"
                  >
                    <span>Giriş Yap</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
