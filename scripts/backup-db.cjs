const { createClient } = require('@libsql/client');
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  if (fs.existsSync('.env')) process.loadEnvFile('.env');
  const url = process.env.DATABASE_URL ?? `file:${path.join(process.cwd(), 'prisma', 'dev.db')}`;
  if (!url.startsWith('file:')) throw new Error('Este respaldo requiere una base SQLite local (file:).');

  const backupRoot = path.resolve('prisma', 'backups');
  fs.mkdirSync(backupRoot, { recursive: true });
  const backupPath = path.join(backupRoot, `jirah-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`);
  const client = createClient({ url });
  try {
    // VACUUM INTO produce una instantánea consistente, también si SQLite usa WAL.
    await client.execute({ sql: 'VACUUM INTO ?', args: [backupPath] });
    console.log(`Respaldo creado: ${backupPath}`);
  } finally { client.close(); }
}

main().catch(() => {
  console.error('No se pudo crear el respaldo SQLite. Compruebe la configuración, permisos y espacio disponible.');
  process.exitCode = 1;
});
