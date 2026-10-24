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
import { PasswordResetRepository } from '@/lib/repositories/PasswordResetRepository';
import { createHash, randomBytes } from 'node:crypto';
import { CorreoService } from '@/lib/services/correo.service';
import { LimiteAccesoRepo } from '@/lib/repositories/LimiteAccesoRepository';
import { validatePassword, MAX_PASSWORD_BYTES } from '@/lib/password-policy';

const dummyPasswordHash = '$2b$12$5V0IbvGcx0fRmpIFF4qg7uE6Fbow1LluBDAl7VZOLF344J/iJgfPC';

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
    if (typeof email !== 'string' || email.length > 254 || typeof password !== 'string' || Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) return null;
    email = email.trim().toLowerCase();
    if (!await LimiteAccesoRepo.consumir('login', email, 10, 15 * 60_000)) throw new Error('ACCESO_LIMITE');
    // Capa 3: obtener el hash almacenado
    const user = await UserRepository.findByEmailWithPassword(email);

    const valid = await bcrypt.compare(password, user?.passwordHash ?? dummyPasswordHash);
    if (!user || !valid) {
      observers.forEach(o => o.onLoginFailure(email));
      return null;
    }

    if (!user.isActive) {
      throw new Error('ACCOUNT_INACTIVE');
    }

    // Registrar el último acceso (sin bloquear la respuesta)
    UserRepository.update(user.id, { lastLoginAt: new Date() }).catch(() => {
      console.warn('[AuthService] No se pudo registrar la fecha del último acceso.');
    });

    observers.forEach(o => o.onLoginSuccess(user.id));

    // Devolvemos el usuario sin el hash
    return {
      id: user.id, email: user.email, rol: user.rol,
      nombres: user.nombres, apellidos: user.apellidos, sessionVersion: user.sessionVersion,
      estadoAcceso: user.estadoAcceso,
    };
  },

  /**
   * Entrega un enlace de un solo uso mediante el transporte SMTP configurado.
   * CU-01.2 — Recuperación de contraseña por correo.
   * No simula una entrega ni registra credenciales en consola.
   */
  async generarTokenRecuperacion(email: string): Promise<string | null> {
    if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error('EMAIL_INVALIDO');
    if (!await LimiteAccesoRepo.consumir('recuperacion', email.trim().toLowerCase(), 5, 15 * 60_000)) throw new Error('ACCESO_LIMITE');
    CorreoService.configuracion();
    const user = await UserRepository.findByEmailWithPassword(email.trim().toLowerCase());
    if (!user?.isActive) return null;
    const token = randomBytes(32).toString('hex');
    const hash = createHash('sha256').update(token).digest('hex');
    const issued = await PasswordResetRepository.issue(user.id, hash);
    if (!issued) return null;
    try { await CorreoService.recuperacion(user.email, token); }
    catch { await PasswordResetRepository.invalidate(issued.id); throw new Error('CORREO_NO_ENTREGADO'); }
    return null;
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
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) throw new Error('TOKEN_INVALIDO');
    if (!await LimiteAccesoRepo.consumir('restablecer', token, 5, 15 * 60_000)) throw new Error('ACCESO_LIMITE');
    const stored = await PasswordResetRepository.findByHash(createHash('sha256').update(token).digest('hex'));
    const matchedToken = stored && !stored.usedAt && stored.user.isActive ? stored : null;

    if (!matchedToken) throw new Error('TOKEN_INVALIDO');

    // E.2 — Verificar expiración
    if (new Date() > matchedToken.expiresAt) {
      throw new Error('TOKEN_EXPIRADO');
    }

    // Validar fortaleza de la nueva contraseña
    const fortaleza = AuthService.validarFortaleza(newPassword);
    if (!fortaleza.ok) throw new Error(fortaleza.mensaje ?? 'CLAVE_DEBIL');

    // Consumir una sola vez y cambiar credenciales en una misma transacción.
    const newHash = await AuthService.hashPassword(newPassword);
    const consumed = await PasswordResetRepository.consume(matchedToken.id, matchedToken.userId, newHash);
    if (!consumed) throw new Error('TOKEN_INVALIDO');
  },

  /**
   * Valida la fortaleza de una contraseña nueva.
   * Frases de al menos 15 caracteres; nunca truncar el límite de bcrypt.
   */
  validarFortaleza(password: string): { ok: boolean; mensaje?: string } {
    return validatePassword(password);
  },

  /**
   * Genera una contraseña temporal con 144 bits aleatorios.
   * Usada al crear nuevos agricultores (CU-03.1).
   */
  generarPasswordTemporal(): string {
    return randomBytes(18).toString('base64url');
  },

  /**
   * Hashea una contraseña con bcrypt (cost factor 12).
   */
  async hashPassword(password: string): Promise<string> {
    const policy = validatePassword(password);
    if (!policy.ok) throw new Error(policy.mensaje);
    return bcrypt.hash(password, 12);
  },

  async validarSesion(userId: string, sessionVersion: number) {
    const user = await UserRepository.findSessionUser(userId);
    if (!user?.isActive || user.sessionVersion !== sessionVersion) return null;
    return user;
  },
};
