'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, User } from 'lucide-react';

interface LoginResponse {
  success: boolean;
  message: string;
  user?: {
    id: number;
    username: string;
    email: string;
    role: number;
    görev_tanımı: string;
  };
  token?: string;
}

export default function LoginPage() {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data: LoginResponse = await response.json();
      
      console.log('Giriş yanıtı:', data);

      if (data.success && data.user && data.token) {
        console.log('Giriş başarılı, kullanıcı:', data.user);
        console.log('Kullanıcı rolü:', data.user.role);
        
        // Token'ı localStorage ve cookie'ye kaydet
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Cookie'ye de kaydet (middleware için)
        document.cookie = `token=${data.token}; path=/; max-age=86400`;
        document.cookie = `user=${JSON.stringify(data.user)}; path=/; max-age=86400`;

        // Giriş sonrası ana sayfaya yönlendir (role bağımsız)
        try {
          await router.push('/');
        } catch {
          window.location.href = '/';
        }
      } else {
        console.log('Giriş başarısız:', data.message);
        setError(data.message || 'Giriş başarısız');
      }
    } catch {
      setError('Bağlantı hatası oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="hidden md:flex flex-col justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-8 text-white shadow-2xl">
          <h1 className="text-3xl font-extrabold">HBYS</h1>
          <p className="mt-2 text-blue-100">Hospitadent Business Intelligence</p>
          <div className="mt-8 space-y-3 text-sm text-blue-100/90">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-emerald-300" />
              <span>Güvenli kimlik doğrulama</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-emerald-300" />
              <span>Rol tabanlı yetkilendirme</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-emerald-300" />
              <span>Modern ve hızlı arayüz</span>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Giriş Yap</h2>
            <p className="text-gray-500 mt-1">Hesabınıza güvenle giriş yapın</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 mt-8">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Kullanıcı Adı
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  id="username"
                  type="text"
                  required
                  autoComplete="username"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Kullanıcı adınızı girin"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Şifre
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Şifrenizi girin"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                'Giriş Yap'
              )}
            </button>
          </form>


        </div>
      </div>
    </div>
  );
}
