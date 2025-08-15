import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Login sayfasına erişim her zaman serbest
  if (pathname === '/login') {
    return NextResponse.next();
  }

  // Token kontrolü - tüm sayfalar için zorunlu
  const token = request.cookies.get('token')?.value;
  
  // Eğer token yoksa login'e yönlendir
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Admin paneli erişim kontrolü - daha sıkı
  if (pathname.startsWith('/admin')) {
    try {
      const userStr = request.cookies.get('user')?.value;
      if (userStr) {
        const user = JSON.parse(userStr);
        // Sadece role 1 veya 2 olan kullanıcılar admin paneline erişebilir
        if (user.role === 1 || user.role === 2) {
          return NextResponse.next();
        } else {
          // Yetkisiz erişim - login'e yönlendir
          return NextResponse.redirect(new URL('/login', request.url));
        }
      } else {
        // User bilgisi yok - login'e yönlendir
        return NextResponse.redirect(new URL('/login', request.url));
      }
    } catch {
      // Parse hatası - login'e yönlendir
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Diğer tüm sayfalar için token kontrolü yeterli
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
