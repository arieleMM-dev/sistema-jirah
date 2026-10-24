import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import bcrypt from 'bcryptjs';
import path from 'path';
import { existsSync } from 'node:fs';
import { validatePassword } from '../lib/password-policy';

if (existsSync('.env')) process.loadEnvFile('.env');
const DB_URL = process.env.DATABASE_URL ?? `file:${path.join(process.cwd(), 'prisma', 'dev.db')}`;
const adapter = new PrismaLibSql({ url: DB_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Configure SEED_ADMIN_EMAIL con el correo del administrador inicial.');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.rol !== 'ADMIN' || !existing.isActive) {
      throw new Error('El correo indicado pertenece a una cuenta que no es un administrador activo. No se modificó.');
    }
    console.log('El administrador inicial ya existe. Su contraseña y sus datos se conservan.');
    return;
  }

  const password = process.env.SEED_ADMIN_PASSWORD;
  const cedula = process.env.SEED_ADMIN_CEDULA?.trim();
  const policy = validatePassword(password);
  if (!password || !policy.ok) {
    throw new Error(`Configure SEED_ADMIN_PASSWORD: ${policy.mensaje}`);
  }
  if (!cedula || !/^\d{10}$/.test(cedula)) {
    throw new Error('Configure SEED_ADMIN_CEDULA con 10 dígitos.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction(async tx => {
    if (await tx.user.count({ where: { rol: 'ADMIN' } })) {
      throw new Error('Ya existe un administrador con otro correo. La inicialización no crea otro ni cambia sus accesos.');
    }
    await tx.user.create({
      data: { email, passwordHash, cedula, nombres: 'Administrador', apellidos: 'Finca JIRAH', rol: 'ADMIN' },
    });
  });
  console.log('Administrador inicial creado. No se cargaron trabajadores, catálogos ni datos de demostración.');
}

main()
  .catch(e => { console.error(e instanceof Error ? e.message : 'No se pudo inicializar la base.'); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
