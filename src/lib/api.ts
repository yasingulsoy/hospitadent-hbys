// API istekleri için utility fonksiyonları
export const apiRequest = async (url: string, options: RequestInit = {}) => {
  // Token'ı cookie'den al
  const getCookie = (name: string) => {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  const token = getCookie('token');
  
  // Headers'ı hazırla
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Eğer token varsa Authorization header'ı ekle
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // API isteğini yap (HttpOnly cookie gönderimi için credentials: 'include')
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  // Eğer 401 hatası alırsak, kullanıcıyı login'e yönlendir
  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
      document.cookie = 'role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  return response;
};

// GET isteği
export const apiGet = (url: string) => apiRequest(url);

// POST isteği
export const apiPost = (url: string, data: any) => apiRequest(url, {
  method: 'POST',
  body: JSON.stringify(data),
});

// PUT isteği
export const apiPut = (url: string, data: any) => apiRequest(url, {
  method: 'PUT',
  body: JSON.stringify(data),
});

// DELETE isteği
export const apiDelete = (url: string) => apiRequest(url, {
  method: 'DELETE',
});
