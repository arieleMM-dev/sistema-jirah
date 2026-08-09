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
import { NextRequest, NextResponse } from 'next/server';

// ─── NextAuth Options — configurados en el Controller ───────────
export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Correo', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

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
    // Enriquecer el JWT con datos del usuario
    async jwt({ token, user }) {
      if (user) {
        token.id        = (user as any).id;
        token.rol       = (user as any).rol;
        token.nombres   = (user as any).nombres;
        token.apellidos = (user as any).apellidos;
      }
      // CU-03.4: Verificar si la sesión fue revocada (blacklist en memoria)
      if (token.id && AuthService.isRevoked(token.id as string)) {
        return { ...token, revoked: true };
      }
      return token;
    },

    // Exponer datos relevantes en la sesión de cliente
    async session({ session, token }) {
      // CU-03.4: Si la sesión está revocada, invalidarla
      if (token.revoked) {
        return { ...session, user: undefined, expires: new Date(0).toISOString() };
      }
      if (token && session.user) {
        (session.user as any).id        = token.id;
        (session.user as any).rol       = token.rol;
        (session.user as any).nombres   = token.nombres;
        (session.user as any).apellidos = token.apellidos;
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
      console.log(`[AuthController] Login exitoso — usuario ${(user as any).id}`);
    },
  },
};

// ─── Controlador HTTP para CU-01.2: Recuperación de contraseña ──
export const AuthController = {
  /**
   * POST /api/auth/recuperar
   * CU-01.2 — Solicitar enlace de recuperación de contraseña.
   * Por seguridad, siempre devuelve 200 aunque el email no exista.
   */
  async recuperar(req: NextRequest): Promise<NextResponse> {
    try {
      const { email } = await req.json();
      if (!email) {
        return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
      }
      // Capa 2: AuthService aplica la lógica de generación de token
      await AuthService.generarTokenRecuperacion(email);
    } catch {
      // No revelar si el email existe o no (seguridad)
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
      if (!token || !newPassword) {
        return NextResponse.json(
          { error: 'Token y nueva contraseña son obligatorios' },
          { status: 400 }
        );
      }

      await AuthService.resetearPassword(token, newPassword);
      return NextResponse.json({ message: 'Contraseña actualizada exitosamente' });
    } catch (error: any) {
      const errorMap: Record<string, [number, string]> = {
        TOKEN_INVALIDO: [400, 'El enlace de recuperación no es válido.'],
        TOKEN_EXPIRADO: [410, 'El enlace de recuperación ha expirado. Solicite uno nuevo.'],
      };
      const mapped = errorMap[error.message];
      if (mapped) {
        return NextResponse.json({ error: mapped[1] }, { status: mapped[0] });
      }
      // Errores de fortaleza de contraseña
      if (error.message && !error.message.startsWith('TOKEN_')) {
        return NextResponse.json({ error: error.message }, { status: 422 });
      }
      return NextResponse.json({ error: 'Error al restablecer la contraseña' }, { status: 500 });
    }
  },
};
