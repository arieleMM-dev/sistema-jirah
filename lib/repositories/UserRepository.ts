/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CAPA DE DATOS — UserRepository                             ║
 * ║  Arquitectura de Tres Capas: Capa 3 (Datos)                 ║
 * ║                                                             ║
 * ║  Responsabilidad: abstrae TODO acceso a la tabla User        ║
 * ║  de la base de datos. Ninguna otra capa toca Prisma          ║
 * ║  directamente para operaciones sobre usuarios.               ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { prisma } from '@/lib/prisma';
import type { User, Rol, Tema } from '@prisma/client';

// ─── Tipos de entrada ───────────────────────────────────────────
export interface CreateUserInput {
  email: string;
  passwordHash: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  rol: Rol;
  telefono?: string;
}

export interface UpdateUserInput {
  nombres?: string;
  apellidos?: string;
  email?: string;
  telefono?: string | null;
  tema?: Tema;
  passwordHash?: string;
  isActive?: boolean;
  lastLoginAt?: Date;
}

// ─── Proyección pública (sin passwordHash) ──────────────────────
export type PublicUser = Omit<User, 'passwordHash'>;

export const UserRepository = {
  /**
   * Busca un usuario por su ID.
   * Usado en: AuthController (verificar sesión), AgricultorController (obtener ficha)
   */
  async findById(id: string): Promise<PublicUser | null> {
    return prisma.user.findUnique({
      where: { id },
      omit: { passwordHash: true },
    });
  },

  /**
   * Busca un usuario por email incluyendo passwordHash (solo para auth).
   * Usado en: AuthController (validar credenciales)
   */
  async findByEmailWithPassword(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  },

  /**
   * Busca un usuario por email sin exponer el hash.
   * Usado en: PerfilController (comprobar si email ya existe), AgricultorController
   */
  async findByEmail(email: string): Promise<PublicUser | null> {
    return prisma.user.findUnique({
      where: { email },
      omit: { passwordHash: true },
    });
  },

  /**
   * Busca usuarios por nombre, apellido o cédula. Devuelve hasta 50 resultados.
   * Usado en: AgricultorController (CU-03.2 — búsqueda en tiempo real)
   */
  async search(query: string, limit = 50): Promise<PublicUser[]> {
    const q = query.trim();
    return prisma.user.findMany({
      where: q
        ? {
            OR: [
              { nombres:   { contains: q } },
              { apellidos: { contains: q } },
              { cedula:    { contains: q } },
              { email:     { contains: q } },
            ],
          }
        : {},
      omit: { passwordHash: true },
      orderBy: { apellidos: 'asc' },
      take: limit,
    });
  },

  /**
   * Crea un nuevo usuario en la base de datos.
   * Usado en: AgricultorController (CU-03.1 — crear ficha)
   */
  async create(input: CreateUserInput): Promise<PublicUser> {
    return prisma.user.create({
      data: input,
      omit: { passwordHash: true },
    });
  },

  /**
   * Actualiza campos modificables del usuario.
   * Usado en: AgricultorController (CU-03.3), PerfilController (CU-02)
   */
  async update(id: string, input: UpdateUserInput): Promise<PublicUser> {
    return prisma.user.update({
      where: { id },
      data: input,
      omit: { passwordHash: true },
    });
  },

  /**
   * Desactiva la cuenta del usuario (soft-delete).
   * La cuenta queda inactiva pero los datos históricos se preservan.
   * Usado en: AgricultorController (CU-03.4)
   */
  async softDelete(id: string): Promise<PublicUser> {
    return prisma.user.update({
      where: { id },
      data: { isActive: false },
      omit: { passwordHash: true },
    });
  },

  /**
   * Verifica si una cédula ya existe en la base de datos.
   * Usado en: AgricultorController (validación de duplicados)
   */
  async existsByCedula(cedula: string): Promise<boolean> {
    const count = await prisma.user.count({ where: { cedula } });
    return count > 0;
  },

  /**
   * Verifica si un email ya está registrado (excluyendo un ID específico).
   * Usado en: AgricultorController (validación de edición)
   */
  async existsByEmail(email: string, excludeId?: string): Promise<boolean> {
    const count = await prisma.user.count({
      where: { email, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    });
    return count > 0;
  },
};
