const { createClient } = require('@libsql/client');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  const backup = path.resolve(process.argv[2] ?? '');
  if (!process.argv[2] || !fs.existsSync(backup)) throw new Error('Indique el respaldo anterior a la migración.');
  if (fs.existsSync('.env')) process.loadEnvFile('.env');
  const actual = createClient({ url: process.env.DATABASE_URL ?? `file:${path.resolve('prisma/dev.db')}` });
  const anterior = createClient({ url: `file:${backup}` });
  const quote = name => '"' + name.replaceAll('"', '""') + '"';
  const hash = result => createHash('sha256').update(JSON.stringify(result.rows.map(row => JSON.stringify(result.columns.map(column => row[column]))).sort())).digest('hex');
  try {
    const tables = await anterior.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_prisma_migrations'");
    const counts = {};
    for (const { name } of tables.rows) {
      const info = await anterior.execute(`PRAGMA table_info(${quote(name)})`);
      const columns = info.rows.map(column => quote(column.name)).join(',');
      const query = `SELECT ${columns} FROM ${quote(name)}`;
      const before = await anterior.execute(query), after = await actual.execute(query);
      if (hash(before) !== hash(after)) throw new Error(`Cambió el contenido previo de ${name}.`);
      counts[name] = after.rows.length;
    }
    const integrity = await actual.execute('PRAGMA integrity_check');
    const foreignKeys = await actual.execute('PRAGMA foreign_key_check');
    if (integrity.rows[0].integrity_check !== 'ok' || foreignKeys.rows.length) throw new Error('La integridad de la base requiere revisión.');
    console.log(JSON.stringify({ datosPreviosConservados: true, integridad: 'ok', registrosPrevios: counts }, null, 2));
  } finally { anterior.close(); actual.close(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
