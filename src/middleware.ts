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

  // Admin paneli erişim kontrolü - backend'de yapılacak
  if (pathname.startsWith('/admin')) {
    // Admin yetkisi backend'de kontrol edilecek
    // Burada sadece token varlığını kontrol et
    return NextResponse.next();
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
