import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Login sayfasına erişim her zaman serbest
  if (pathname === '/login') {
    return NextResponse.next();
  }

  // Token kontrolü
  const token = request.cookies.get('token')?.value;
  
  // Eğer token yoksa login'e yönlendir
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Admin paneli erişim kontrolü
  if (pathname.startsWith('/admin')) {
    try {
      // Token'dan user bilgisini al (basit decode)
      const userStr = request.cookies.get('user')?.value;
      if (userStr) {
        const user = JSON.parse(userStr);
        // Role 1 veya 2 ise admin paneline erişim ver
        if (user.role === 1 || user.role === 2) {
          return NextResponse.next();
        } else {
          // Yetkisiz erişim - ana sayfaya yönlendir
          return NextResponse.redirect(new URL('/', request.url));
        }
      }
    } catch {
      // Token geçersiz - login'e yönlendir
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

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
