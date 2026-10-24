const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');

const root = path.resolve(__dirname, '..');
const testDirectory = process.env.JIRAH_TEST_DIRECTORY;
if (!testDirectory) throw new Error('Ejecute npm test para usar una base temporal aislada');
const password = 'Inicial-SoloPruebas-2026';

async function withDatabase(run) {
  const url = `file:${path.join(testDirectory, `bootstrap-${randomUUID()}.db`)}`;
  const client = createClient({ url });
  try {
    const directory = path.join(root, 'prisma/migrations');
    for (const name of fs.readdirSync(directory).sort()) {
      const migration = path.join(directory, name, 'migration.sql');
      if (fs.existsSync(migration)) await client.executeMultiple(fs.readFileSync(migration, 'utf8'));
    }
    await run(client, url);
  } finally { client.close(); }
}

function seed(url, overrides = {}) {
  const result = spawnSync(process.execPath, [path.join(root, 'node_modules/ts-node/dist/bin.js'), '--project', 'tsconfig.seed.json', 'prisma/seed.ts'], {
    cwd: root, encoding: 'utf8', timeout: 30_000,
    env: { ...process.env, DATABASE_URL: url, SEED_ADMIN_EMAIL: 'owner@example.test', SEED_ADMIN_CEDULA: '0000000001', SEED_ADMIN_PASSWORD: password, ...overrides },
  });
  if (result.error) throw result.error;
  return result;
}

test('la inicialización crea solo un administrador y no altera su contraseña al repetirse', async () => {
  await withDatabase(async (client, url) => {
    assert.equal(seed(url).status, 0);
    const first = (await client.execute('SELECT * FROM users')).rows;
    assert.equal(first.length, 1);
    assert.equal(first[0].rol, 'ADMIN');
    assert.equal(first[0].isActive, 1);
    assert.equal(first[0].email, 'owner@example.test');
    assert.ok(await bcrypt.compare(password, first[0].passwordHash));
    const tables = (await client.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name <> 'users'")).rows;
    for (const { name } of tables) {
      assert.match(name, /^[a-z_]+$/);
      assert.equal((await client.execute(`SELECT COUNT(*) AS total FROM "${name}"`)).rows[0].total, 0, name);
    }
    assert.equal(seed(url, { SEED_ADMIN_PASSWORD: 'Otra-Contraseña-2026' }).status, 0);
    const second = (await client.execute('SELECT * FROM users')).rows;
    assert.deepEqual(second, first);
    assert.equal((await client.execute('PRAGMA foreign_key_check')).rows.length, 0);
  });
});

test('la inicialización rechaza credenciales insuficientes sin crear usuarios', async () => {
  await withDatabase(async (client, url) => {
    assert.notEqual(seed(url, { SEED_ADMIN_PASSWORD: 'corta' }).status, 0);
    assert.notEqual(seed(url, { SEED_ADMIN_EMAIL: '' }).status, 0);
    assert.equal((await client.execute('SELECT COUNT(*) AS total FROM users')).rows[0].total, 0);
  });
});

test('la inicialización no crea un segundo administrador ni promueve una cuenta de campo', async () => {
  await withDatabase(async (client, url) => {
    assert.equal(seed(url).status, 0);
    assert.notEqual(seed(url, { SEED_ADMIN_EMAIL: 'another@example.test', SEED_ADMIN_CEDULA: '0000000002' }).status, 0);
    await client.execute("UPDATE users SET rol = 'AGRICULTOR' WHERE email = 'owner@example.test'");
    assert.notEqual(seed(url).status, 0);
    const rows = (await client.execute('SELECT rol FROM users')).rows;
    assert.equal(rows.length, 1);
    assert.equal(rows[0].rol, 'AGRICULTOR');
    await client.execute("UPDATE users SET rol = 'ADMIN', isActive = 0 WHERE email = 'owner@example.test'");
    assert.notEqual(seed(url).status, 0);
    assert.equal((await client.execute('SELECT isActive FROM users')).rows[0].isActive, 0);
  });
});
