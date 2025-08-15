// API istekleri için utility fonksiyonları
export const apiRequest = async (url: string, options: RequestInit = {}) => {
  // Token'ı localStorage'dan al
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  // Headers'ı hazırla
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Eğer token varsa Authorization header'ına ekle
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // API isteğini yap
  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Eğer 401 hatası alırsak, kullanıcıyı login'e yönlendir
  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
      document.cookie = 'user=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
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
