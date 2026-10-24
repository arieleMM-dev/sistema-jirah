import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt';
import { randomBytes } from 'node:crypto';
import { UserRepository } from '@/lib/repositories/UserRepository';
import { LimiteAccesoRepo } from '@/lib/repositories/LimiteAccesoRepository';
import { isAdminResource, isKnownRole } from '@/lib/auth/permissions';
import { bodyWithinLimit, contentSecurityPolicy, networkIdentity } from '@/lib/http-security';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const api = pathname.startsWith('/api/');
  const writing = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);
  const deny = (error: string, status: number) => NextResponse.json({ error }, {
    status, headers: { 'Cache-Control': 'private, no-store', ...(status === 429 ? { 'Retry-After': '60' } : {}) },
  });
  if (api && writing) {
    const origin = request.headers.get('origin');
    const expected = new URL(process.env.NEXTAUTH_URL || request.url).origin;
    if (request.headers.get('sec-fetch-site') === 'cross-site' || (origin && origin !== expected)) {
      return deny('Origen de solicitud no permitido.', 403);
    }
  }
  try {
    if (api) {
      const identity = networkIdentity(request.headers);
      if (!await LimiteAccesoRepo.consumir('api-network', identity, 600, 60_000)) return deny('Demasiadas solicitudes. Espere un minuto.', 429);
      if (writing && pathname.startsWith('/api/auth/') &&
          !await LimiteAccesoRepo.consumir('auth-network', identity, 30, 60_000)) return deny('Demasiados intentos. Espere un minuto.', 429);
    }

    if ((api && !pathname.startsWith('/api/auth/')) || pathname === '/dashboard' || pathname.startsWith('/dashboard/') || pathname === '/bienvenida') {
      const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
      const user = !token?.revoked && typeof token?.id === 'string' && Number.isInteger(token.sessionVersion)
        ? await UserRepository.findSessionUser(token.id) : null;
      if (!user?.isActive || user.sessionVersion !== token?.sessionVersion) {
        return api ? deny('No autenticado', 401) : NextResponse.redirect(new URL('/login', request.url));
      }
      const approved = user.estadoAcceso === 'APROBADO' && isKnownRole(user.rol);
      if (!approved && pathname !== '/bienvenida') {
        return api ? deny('Su cuenta todavía no tiene acceso a la finca.', 403)
          : NextResponse.redirect(new URL('/bienvenida', request.url));
      }
      if (pathname === '/bienvenida' && !approved && !(user.rol === 'SIN_ASIGNAR' && ['PENDIENTE', 'RECHAZADO'].includes(user.estadoAcceso))) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
      if (isAdminResource(pathname) && user.rol !== 'ADMIN') {
        return api ? deny('Acceso denegado', 403) : NextResponse.redirect(new URL('/dashboard/campo/pesaje', request.url));
      }
      if (api && !await LimiteAccesoRepo.consumir(writing ? 'api-write' : 'api-read', user.id, writing ? 120 : 240, 60_000)) return deny('Demasiadas solicitudes. Espere un minuto.', 429);
    }

    if (api && writing) {
      const limit = pathname === '/api/perfil' && request.method === 'PATCH' ? 3 * 1024 * 1024
        : pathname.startsWith('/api/sync/') ? 512 * 1024 : 64 * 1024;
      if (!await bodyWithinLimit(request, limit)) return deny('La solicitud supera el tamaño permitido.', 413);
    }
  } catch {
    return deny('No se pudo verificar la solicitud. Intente nuevamente.', 503);
  }

  if (api || pathname.startsWith('/_next/') || !request.headers.get('accept')?.includes('text/html')) return NextResponse.next();
  const nonce = randomBytes(18).toString('base64');
  const policy = contentSecurityPolicy(nonce);
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', policy);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

// ESTE MATCHER ES LA CLAVE PARA EVITAR EL BUCLE
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
