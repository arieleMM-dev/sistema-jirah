/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CAPA DE LÓGICA DE NEGOCIO — AuthController                 ║
 * ║  Arquitectura de Tres Capas: Capa 2 (Negocio) — MVC         ║
 * ║                                                             ║
 * ║  Responsabilidad: coordina autenticación y sesión.          ║
 * ║  Provee la configuración de NextAuth para la ruta           ║
 * ║  /api/auth/[...nextauth].                                   ║
 * ║                                                             ║
 * ║  Patrón Observer integrado: AuthService notifica eventos    ║
 * ║  de login a cualquier suscriptor registrado.                ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import type { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { AuthService } from '@/lib/services/auth.service';
import { NextRequest, NextResponse, after } from 'next/server';
import { CorreoService } from '@/lib/services/correo.service';

const secret = process.env.NEXTAUTH_SECRET;
if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
  throw new Error('Configure NEXTAUTH_SECRET con al menos 32 caracteres aleatorios.');
}
const authUrl = new URL(process.env.NEXTAUTH_URL ?? 'http://localhost:3000');
if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_URL) throw new Error('Configure NEXTAUTH_URL antes de publicar.');
if (!['http:', 'https:'].includes(authUrl.protocol) || authUrl.username || authUrl.password ||
    (process.env.NODE_ENV === 'production' && authUrl.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(authUrl.hostname))) {
  throw new Error('Configure NEXTAUTH_URL con HTTPS para un servidor público.');
}

// ─── NextAuth Options — configurados en el Controller ───────────
export const authOptions: AuthOptions = {
  secret,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Correo', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },

      async authorize(credentials) {
        if (typeof credentials?.email !== 'string' || typeof credentials.password !== 'string') return null;
        if (!credentials.email || !credentials.password) return null;

        // Capa 2: AuthService valida y aplica reglas de negocio
        const user = await AuthService.login(
          credentials.email,
          credentials.password
        );
        return user ?? null;
      },
    }),
  ],

  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 }, // 8 horas de sesión

  callbacks: {
    async redirect({ url, baseUrl }) {
      try {
        const target = new URL(url, baseUrl);
        return target.origin === new URL(baseUrl).origin ? target.href : baseUrl;
      } catch { return baseUrl; }
    },
    // Enriquecer el JWT con datos del usuario
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.sessionVersion = user.sessionVersion;
      }
      // Los JWT anteriores a esta versión requieren iniciar sesión nuevamente.
      if (token.revoked || !token.id || typeof token.sessionVersion !== 'number' || !Number.isInteger(token.sessionVersion)) {
        return { ...token, revoked: true };
      }
      const currentUser = await AuthService.validarSesion(token.id, token.sessionVersion);
      if (!currentUser) return { ...token, revoked: true };
      return {
        ...token, revoked: false, email: currentUser.email,
        rol: currentUser.rol, nombres: currentUser.nombres, apellidos: currentUser.apellidos,
        estadoAcceso: currentUser.estadoAcceso, emailVerificado: Boolean(currentUser.emailVerificadoAt),
      };
    },

    // Exponer datos relevantes en la sesión de cliente
    async session({ session, token }) {
      // CU-03.4: Si la sesión está revocada, invalidarla
      if (token.revoked || !token.id || !token.rol || !token.estadoAcceso || !token.nombres || !token.apellidos) {
        return { ...session, user: undefined, expires: new Date(0).toISOString() };
      }
      if (token && session.user) {
        session.user.id = token.id;
        session.user.rol = token.rol;
        session.user.nombres = token.nombres;
        session.user.apellidos = token.apellidos;
        session.user.email = token.email;
        session.user.estadoAcceso = token.estadoAcceso;
        session.user.emailVerificado = token.emailVerificado === true;
      }
      return session;
    },
  },

  pages: {
    signIn: '/login',
    error:  '/login',
  },

  // Error handler: mapea errores del Service a mensajes HTTP
  events: {
    async signIn({ user }) {
      // Evento de sesión iniciada (para auditoría futura)
      console.log(`[AuthController] Login exitoso — usuario ${user.id}`);
    },
  },
};

// ─── Controlador HTTP para CU-01.2: Recuperación de contraseña ──
export const AuthController = {
  /**
   * POST /api/auth/recuperar
   * CU-01.2 — Solicitar enlace de recuperación de contraseña.
   * No revela si una cuenta existe. Correo pendiente de configurar.
   */
  async recuperar(req: NextRequest): Promise<NextResponse> {
    try {
      const { email } = await req.json();
      if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
      }
      // Capa 2: AuthService aplica la lógica de generación de token
      CorreoService.configuracion();
      after(async () => {
        try { await AuthService.generarTokenRecuperacion(email); }
        catch { console.warn('[Recuperación] La solicitud no pudo completarse; no se divulgaron datos de la cuenta.'); }
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'ACCESO_LIMITE') return NextResponse.json({ error: 'Demasiadas solicitudes. Espere unos minutos antes de reintentar.' }, { status: 429 });
      if (error instanceof Error && ['RECUPERACION_NO_CONFIGURADA', 'CORREO_NO_ENTREGADO'].includes(error.message)) {
        return NextResponse.json({ error: 'La recuperación por correo no está disponible. Contacte al administrador.' }, { status: 503 });
      }
      if (error instanceof SyntaxError || error instanceof TypeError) {
        return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
      }
      return NextResponse.json({ error: 'No se pudo procesar la solicitud' }, { status: 500 });
    }
    return NextResponse.json({ message: 'Si el correo es válido, recibirá un enlace de recuperación.' });
  },

  /**
   * POST /api/auth/reset
   * CU-01.2 — Consumir token de recuperación y restablecer contraseña.
   */
  async resetPassword(req: NextRequest): Promise<NextResponse> {
    try {
      const { token, newPassword } = await req.json();
      if (typeof token !== 'string' || typeof newPassword !== 'string' || !token || !newPassword) {
        return NextResponse.json(
          { error: 'Token y nueva contraseña son obligatorios' },
          { status: 400 }
        );
      }

      await AuthService.resetearPassword(token, newPassword);
      return NextResponse.json({ message: 'Contraseña actualizada exitosamente' });
    } catch (error: unknown) {
      const errorMap: Record<string, [number, string]> = {
        ACCESO_LIMITE: [429, 'Demasiadas solicitudes. Espere un minuto antes de reintentar.'],
        TOKEN_INVALIDO: [400, 'El enlace de recuperación no es válido.'],
        TOKEN_EXPIRADO: [410, 'El enlace de recuperación ha expirado. Solicite uno nuevo.'],
        'Use al menos 15 caracteres.': [422, 'Use al menos 15 caracteres.'],
        'La contraseña supera los 72 bytes permitidos. Use una frase más corta.': [422, 'La contraseña supera los 72 bytes permitidos. Use una frase más corta.'],
        'Esa contraseña es demasiado común. Elija otra frase.': [422, 'Esa contraseña es demasiado común. Elija otra frase.'],
      };
      const mapped = errorMap[error instanceof Error ? error.message : ''];
      if (mapped) {
        return NextResponse.json({ error: mapped[1] }, { status: mapped[0] });
      }
      if (error instanceof SyntaxError || error instanceof TypeError) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
      return NextResponse.json({ error: 'Error al restablecer la contraseña' }, { status: 500 });
    }
  },
};
