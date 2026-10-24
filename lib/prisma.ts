/**
 * CAPA DE DATOS — Singleton de Prisma Client (Prisma 7 + libsql adapter)
 *
 * La URL de la base de datos se lee de DATABASE_URL en .env.
 * Si no está definida, usa la ruta por defecto de desarrollo.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import path from 'path';

if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) throw new Error('Configure DATABASE_URL antes de publicar.');

// Prioridad: variable de entorno → ruta fija de desarrollo
const DB_URL =
  process.env.DATABASE_URL ??
  `file:${path.join(process.cwd(), 'prisma', 'dev.db')}`;

function createPrismaClient(): PrismaClient {
  // libsql acepta URLs tipo "file:./prisma/dev.db" o absolutas "file:/path/..."
  const url = DB_URL.startsWith('file:')
    ? DB_URL
    : `file:${DB_URL}`;

  const adapter = new PrismaLibSql({ url, timeout: 5000 });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
