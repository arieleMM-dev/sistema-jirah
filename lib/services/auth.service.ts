/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CAPA DE LÓGICA DE NEGOCIO — AuthService                    ║
 * ║  Arquitectura de Tres Capas: Capa 2 (Negocio)               ║
 * ║                                                             ║
 * ║  Responsabilidad: implementa las reglas de autenticación.   ║
 * ║  NO conoce Prisma — delega al UserRepository (Capa 3).      ║
 * ║  Usa el Patrón Observer para notificar cambios de sesión.   ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import bcrypt from 'bcryptjs';
import { UserRepository } from '@/lib/repositories';

// ─── Patrón Observer — interfaz del suscriptor de autenticación ─
export interface AuthObserver {
  onLoginSuccess(userId: string): void;
  onLoginFailure(email: string): void;
}

const observers: AuthObserver[] = [];

export const AuthService = {
  // ── Patrón Observer: registrar/quitar observadores ────────────
  subscribe(observer: AuthObserver) {
    observers.push(observer);
  },
  unsubscribe(observer: AuthObserver) {
    const idx = observers.indexOf(observer);
    if (idx >= 0) observers.splice(idx, 1);
  },

  /**
   * Valida credenciales de un usuario.
   * CU-01.1 — Autenticación con correo y contraseña.
   *
   * @returns El usuario público si las credenciales son correctas, null si no.
   * @throws 'ACCOUNT_INACTIVE' si la cuenta existe pero está desactivada.
   */
  async login(email: string, password: string) {
    // Capa 3: obtener el hash almacenado
    const user = await UserRepository.findByEmailWithPassword(email);

    if (!user) {
      observers.forEach(o => o.onLoginFailure(email));
      return null;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      observers.forEach(o => o.onLoginFailure(email));
      return null;
    }

    if (!user.isActive) {
      throw new Error('ACCOUNT_INACTIVE');
    }

    // Registrar el último acceso (sin bloquear la respuesta)
    UserRepository.update(user.id, { lastLoginAt: new Date() }).catch(() => null);

    observers.forEach(o => o.onLoginSuccess(user.id));

    // Devolvemos el usuario sin el hash
    const { passwordHash: _, ...publicUser } = user;
    return publicUser;
  },

  /**
   * Genera y almacena un token de recuperación de contraseña.
   * CU-01.2 — Recuperación de contraseña por correo.
   * Persiste el token hasheado en la tabla PasswordResetToken (1 hora de validez).
   */
  async generarTokenRecuperacion(email: string): Promise<string | null> {
    const user = await UserRepository.findByEmail(email);
    if (!user) return null; // No revelar si existe (E.1)

    const token = crypto.randomUUID();
    const tokenHash = await bcrypt.hash(token, 10);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Persistir en la tabla PasswordResetToken
    const { prisma } = await import('@/lib/prisma');
    await prisma.passwordResetToken.create({
      data: {
        token: tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    // Simulación de envío de email (console.log en desarrollo)
    const resetUrl = `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/recuperar/reset?token=${token}`;
    console.log(`\n══════════════════════════════════════════════════`);
    console.log(`📧 [EMAIL SIMULADO] Recuperación de contraseña`);
    console.log(`   Para: ${email}`);
    console.log(`   Enlace: ${resetUrl}`);
    console.log(`   Expira: ${expiresAt.toISOString()}`);
    console.log(`══════════════════════════════════════════════════\n`);

    return token;
  },

  /**
   * Restablece la contraseña usando el token de recuperación.
   * CU-01.2 — Consumir token y actualizar contraseña.
   *
   * @throws TOKEN_INVALIDO - si el token no se encuentra
   * @throws TOKEN_EXPIRADO - si el enlace ha caducado (>1 hora)
   * @throws TOKEN_USADO - si el token ya fue consumido
   */
  async resetearPassword(token: string, newPassword: string): Promise<void> {
    const { prisma } = await import('@/lib/prisma');

    // Buscar todos los tokens no usados para comparar el hash
    const tokens = await prisma.passwordResetToken.findMany({
      where: { usedAt: null },
      include: { user: true },
    });

    let matchedToken: typeof tokens[0] | null = null;
    for (const t of tokens) {
      const isMatch = await bcrypt.compare(token, t.token);
      if (isMatch) { matchedToken = t; break; }
    }

    if (!matchedToken) throw new Error('TOKEN_INVALIDO');

    // E.2 — Verificar expiración
    if (new Date() > matchedToken.expiresAt) {
      throw new Error('TOKEN_EXPIRADO');
    }

    // Validar fortaleza de la nueva contraseña
    const fortaleza = AuthService.validarFortaleza(newPassword);
    if (!fortaleza.ok) throw new Error(fortaleza.mensaje ?? 'CLAVE_DEBIL');

    // Actualizar contraseña
    const newHash = await AuthService.hashPassword(newPassword);
    await UserRepository.update(matchedToken.userId, { passwordHash: newHash });

    // Marcar el token como usado
    await prisma.passwordResetToken.update({
      where: { id: matchedToken.id },
      data: { usedAt: new Date() },
    });
  },

  /**
   * Valida la fortaleza de una contraseña nueva.
   * Mínimo 8 caracteres, 1 mayúscula, 1 número.
   */
  validarFortaleza(password: string): { ok: boolean; mensaje?: string } {
    if (password.length < 8)       return { ok: false, mensaje: 'Mínimo 8 caracteres' };
    if (!/[A-Z]/.test(password))   return { ok: false, mensaje: 'Debe tener al menos 1 letra mayúscula' };
    if (!/[0-9]/.test(password))   return { ok: false, mensaje: 'Debe tener al menos 1 número' };
    return { ok: true };
  },

  /**
   * Genera una contraseña temporal alfanumérica de 10 caracteres.
   * Usada al crear nuevos agricultores (CU-03.1).
   */
  generarPasswordTemporal(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    return Array.from(crypto.getRandomValues(new Uint8Array(10)))
      .map(b => chars[b % chars.length])
      .join('');
  },

  /**
   * Hashea una contraseña con bcrypt (cost factor 12).
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  },

  // ── CU-03.4: Blacklist de usuarios revocados (en memoria) ────
  _revokedUserIds: new Set<string>(),

  /**
   * Revoca la sesión de un usuario, agregándolo a la blacklist.
   * Los tokens JWT existentes serán rechazados en el callback jwt().
   */
  revokeUser(userId: string) {
    AuthService._revokedUserIds.add(userId);
  },

  /**
   * Verifica si un usuario tiene la sesión revocada.
   */
  isRevoked(userId: string): boolean {
    return AuthService._revokedUserIds.has(userId);
  },
};
