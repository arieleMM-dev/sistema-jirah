import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // 1. Permitir archivos estáticos, imágenes y la API de Next.js
  if (
    pathname.startsWith('/_next') || 
    pathname.includes('.') || 
    pathname.startsWith('/api')
  ) {
    return NextResponse.next()
  }

  // 2. Si el usuario ya está en el login o recuperar, NO REDIRIGIR (Evita el bucle infinito)
  if (pathname === '/login' || pathname.startsWith('/recuperar')) {
    return NextResponse.next()
  }

  // 3. Lógica de sesión con next-auth
  const token = request.cookies.get('next-auth.session-token')?.value
    || request.cookies.get('__Secure-next-auth.session-token')?.value
  
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

// ESTE MATCHER ES LA CLAVE PARA EVITAR EL BUCLE
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
