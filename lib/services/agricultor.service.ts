/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CAPA DE LÓGICA DE NEGOCIO — AgricultorService              ║
 * ║  Arquitectura de Tres Capas: Capa 2 (Negocio)               ║
 * ║                                                             ║
 * ║  Responsabilidad: reglas de negocio para la gestión del     ║
 * ║  personal de campo.                                         ║
 * ║  NO conoce Prisma — delega al UserRepository (Capa 3).      ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { UserRepository } from '@/lib/repositories';
import { AuthService } from './auth.service';
import type { Rol } from '@prisma/client';

export const AgricultorService = {
  /**
   * Busca agricultores por texto libre (nombre, apellido o cédula).
   * CU-03.2 — Búsqueda en tiempo real.
   */
  async buscar(query: string) {
    return UserRepository.search(query);
  },

  /**
   * Obtiene el expediente completo de un agricultor por ID.
   * CU-03.2 — Ver ficha.
   */
  async obtener(id: string) {
    return UserRepository.findById(id);
  },

  /**
   * Crea la ficha contractual de un nuevo trabajador de campo.
   * CU-03.1 — Crear expediente.
   *
   * Reglas de negocio aplicadas:
   *   1. La cédula ecuatoriana debe ser válida (algoritmo de dígito verificador).
   *   2. El email y la cédula no deben estar registrados previamente.
   *   3. Se genera contraseña temporal y se hashea.
   *
   * @returns el usuario creado y la contraseña temporal (en texto plano, solo para dev/correo)
   */
  async crear(input: {
    nombres: string;
    apellidos: string;
    cedula: string;
    email: string;
    telefono?: string | null;
    rol: Rol;
  }) {
    // Regla 1: Validar cédula ecuatoriana
    if (!AgricultorService.validarCedulaEC(input.cedula)) {
      throw new Error('CEDULA_INVALIDA');
    }

    // Regla 2: Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.email)) {
      throw new Error('EMAIL_INVALIDO');
    }

    // Regla 3: Email único
    const emailDuplicado = await UserRepository.existsByEmail(input.email);
    if (emailDuplicado) {
      throw new Error('EMAIL_EN_USO');
    }

    // Regla 2b: Cédula única
    const cedulaDuplicada = await UserRepository.existsByCedula(input.cedula);
    if (cedulaDuplicada) {
      throw new Error('CEDULA_EN_USO');
    }

    // Regla 3: Generar y hashear contraseña temporal
    const passwordPlano = AuthService.generarPasswordTemporal();
    const passwordHash  = await AuthService.hashPassword(passwordPlano);

    const user = await UserRepository.create({ ...input, telefono: input.telefono ?? undefined, passwordHash });

    return { user, _dev_password: passwordPlano };
  },

  /**
   * Edita los campos modificables de un expediente.
   * CU-03.3 — Editar ficha.
   * Reglas: Cédula y Rol son inmutables. Email no puede estar en uso por otro usuario.
   */
  async editar(id: string, campos: { nombres?: string; apellidos?: string; email?: string; telefono?: string | null }) {
    if (campos.email) {
      const emailEnUso = await UserRepository.existsByEmail(campos.email, id);
      if (emailEnUso) throw new Error('EMAIL_EN_USO');
      
      // Invalidate recovery tokens on email change
      const { prisma } = await import('@/lib/prisma');
      await prisma.passwordResetToken.deleteMany({
        where: { userId: id }
      });
    }
    return UserRepository.update(id, campos);
  },

  /**
   * Desactiva la cuenta de un agricultor (soft-delete).
   * CU-03.4 — Desactivar cuenta.
   * Regla: un admin no puede desactivar su propia cuenta activa.
   */
  async desactivar(id: string, adminId: string) {
    if (id === adminId) {
      throw new Error('SELF_DEACTIVATION');
    }
    // CU-03.4: Revocar sesión inmediatamente
    AuthService.revokeUser(id);
    return UserRepository.softDelete(id);
  },

  /**
   * Reactiva la cuenta de un agricultor.
   * CU-03.4 — Reactivar cuenta (extensión).
   */
  async reactivar(id: string) {
    // Para reactivar, se puede invocar UserRepository.update con isActive: true
    return UserRepository.update(id, { isActive: true });
  },

  /**
   * Algoritmo de validación de cédula ecuatoriana (dígito verificador módulo 10).
   * Validación en Capa 2 (negocio) — no en la Capa 1 (presentación).
   */
  validarCedulaEC(cedula: string): boolean {
    if (!/^\d{10}$/.test(cedula)) return false;

    const provincia = parseInt(cedula.substring(0, 2));
    if (provincia < 1 || provincia > 24) return false;

    const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
    let suma = 0;

    for (let i = 0; i < 9; i++) {
      let producto = parseInt(cedula[i]) * coeficientes[i];
      if (producto > 9) producto -= 9;
      suma += producto;
    }

    const residuo = suma % 10;
    const digitoVerificador = residuo === 0 ? 0 : 10 - residuo;

    return digitoVerificador === parseInt(cedula[9]);
  },
};
