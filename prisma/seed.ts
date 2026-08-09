import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import bcrypt from 'bcryptjs';
import path from 'path';

const DB_URL = `file:${path.join(process.cwd(), 'prisma', 'dev.db')}`;
const adapter = new PrismaLibSql({ url: DB_URL });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log('🌱 Inicializando base de datos de Finca Jirah...');

  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'PasswordGenericaAdmin!';
  const adminHash = await bcrypt.hash(adminPassword, 12);
  await prisma.user.upsert({
    where: { cedula: '1723456789' },
    update: { email: 'arieljsc@gmail.com' },
    create: {
      email: 'arieljsc@gmail.com',
      passwordHash: adminHash,
      nombres: 'Ariel',
      apellidos: 'Morillo',
      cedula: '1723456789',
      rol: 'ADMIN',
      telefono: '0987654321',
    },
  });

  const userPassword = process.env.SEED_USER_PASSWORD || 'PasswordGenericaUser!';
  const agHash = await bcrypt.hash(userPassword, 12);
  await prisma.user.upsert({
    where: { email: 'carlos@fincajirah.com' },
    update: {},
    create: {
      email: 'carlos@fincajirah.com',
      passwordHash: agHash,
      nombres: 'Carlos',
      apellidos: 'Moreno',
      cedula: '1704567891',
      rol: 'AGRICULTOR',
    },
  });

  await prisma.user.upsert({
    where: { email: 'maria@fincajirah.com' },
    update: {},
    create: {
      email: 'maria@fincajirah.com',
      passwordHash: agHash,
      nombres: 'María',
      apellidos: 'Tipán',
      cedula: '1756789012',
      rol: 'CLASIFICADOR',
    },
  });

  await prisma.campana.upsert({
    where: { codigo: '2026-A' },
    update: {},
    create: { codigo: '2026-A', nombre: 'Campaña Junio 2026', funda: 'F-07', taraBase: 1.70 },
  });

  const lotes = [
    { codigo: 'L-01', nombre: 'Lote Noreste', hectareas: 2.5 },
    { codigo: 'L-02', nombre: 'Lote Centro', hectareas: 1.8 },
    { codigo: 'L-03', nombre: 'Lote Sur', hectareas: 3.1 },
    { codigo: 'L-04', nombre: 'Lote Este', hectareas: 1.2 },
  ];
  for (const lote of lotes) {
    await prisma.lote.upsert({ where: { codigo: lote.codigo }, update: {}, create: lote });
  }

  await prisma.comprador.upsert({
    where: { id: 'comp-001' },
    update: {},
    create: { id: 'comp-001', nombre: 'Pitahaya Export S.A.', tipo: 'EXPORTADOR', contacto: '02-2345678' },
  });

  console.log('');
  console.log('✅ Seed completado exitosamente.');
  console.log('');
  console.log('👤 Credenciales de acceso:');
  console.log(`   Admin:      admin@fincajirah.com  / ${adminPassword}`);
  console.log(`   Agricultor: carlos@fincajirah.com / ${userPassword}`);
  console.log(`   Clasific.:  maria@fincajirah.com  / ${userPassword}`);
  console.log('');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
