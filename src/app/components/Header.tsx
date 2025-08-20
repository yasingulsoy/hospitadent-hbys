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
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-5">
          <div className="flex items-center justify-between">
            {/* Sol taraf - Logo ve Sistem Adı */}
            <div className="flex items-center space-x-6">
              <div className="bg-blue-600 p-3 rounded-lg shadow-sm">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  HospitaTech BI
                </h1>
              </div>
            </div>

            {/* Sağ taraf - Sistem Durumu ve Kullanıcı Bilgisi */}
            <div className="flex items-center space-x-6">
              {/* Sistem Durumu */}
              <div className="text-right">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 p-2 rounded-full">
                    <Activity className="h-4 w-4 text-green-600" />
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
                  <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center">
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
                      className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-all duration-200 font-medium flex items-center space-x-2"
                    >
                      <span>Ana Sayfa</span>
                    </Link>
                    {canSeeAdmin && (
                      <Link
                        href="/admin"
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium flex items-center space-x-2"
                      >
                        <Shield className="h-4 w-4" />
                        <span>Admin Panel</span>
                      </Link>
                    )}
                    <button 
                      onClick={handleLogout}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-all duration-200 font-medium flex items-center space-x-2"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Çıkış Yap</span>
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium flex items-center space-x-2"
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
