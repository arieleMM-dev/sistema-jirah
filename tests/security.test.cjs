require('./register.cjs');
const { test, before, after, mock } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawn } = require('node:child_process');
const net = require('node:net');
const { once } = require('node:events');
const { setTimeout: delay } = require('node:timers/promises');
const { randomUUID, randomBytes, createHash } = require('node:crypto');
const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');

const testDirectory = process.env.JIRAH_TEST_DIRECTORY;
if (!testDirectory) throw new Error('Ejecute npm test para crear una base aislada');
process.env.DATABASE_URL = `file:${path.join(testDirectory, 'test.db')}`;
process.env.NEXTAUTH_SECRET = randomUUID();
process.env.NEXTAUTH_URL = 'http://localhost:3000';

const { prisma } = require('../lib/prisma.ts');
const { UserRepository } = require('../lib/repositories/UserRepository.ts');
const { AuthService } = require('../lib/services/auth.service.ts');
const { AgricultorService } = require('../lib/services/agricultor.service.ts');
const { PesajeService, ClasificacionService } = require('../lib/services/pesaje.service.ts');
const { PesajeRepo } = require('../lib/repositories/PesajeRepository.ts');
const { JornadaService } = require('../lib/services/jornada.service.ts');
const { JornadaRepo } = require('../lib/repositories/JornadaRepository.ts');
const { JornadaController } = require('../lib/controllers/JornadaController.ts');
const { calcularClasificacion, fechaFinca, jornadaId } = require('../lib/cosecha.ts');
const { jornadasLocales } = require('../lib/local-jornadas.ts');
const { CampanaService, CompradorService } = require('../lib/services/catalogo.service.ts');
const { AjusteService } = require('../lib/services/ajuste.service.ts');
const { SyncService } = require('../lib/services/sync.service.ts');
const { readSyncConfirmation } = require('../lib/sync-confirmation.ts');
const vm = require('node:vm');
const { authOptions, AuthController } = require('../lib/controllers/AuthController.ts');
const sessionModule = require('../lib/auth/session.ts');
const { PesajeController } = require('../lib/controllers/PesajeController.ts');
const { CampanaController, LoteController } = require('../lib/controllers/CatalogoController.ts');
const { POST: syncPesajes } = require('../app/api/sync/pesajes/route.ts');
const { POST: syncClasificaciones } = require('../app/api/sync/clasificaciones/route.ts');
const { getServerSession } = require('next-auth');
const { encode } = require('next-auth/jwt');
const { NextRequest } = require('next/server');
const { contentSecurityPolicy } = require('../lib/http-security.ts');

test('el prototipo 3D solo habilita lectura de texturas blob con activación explícita', () => {
  const previous = process.env.JIRAH_AUTH_3D_PROTOTYPE;
  const connections = () => contentSecurityPolicy('nonce-prueba').split('; ').find(value => value.startsWith('connect-src'));
  try {
    delete process.env.JIRAH_AUTH_3D_PROTOTYPE;
    assert.equal(connections().includes('blob:'), false);
    process.env.JIRAH_AUTH_3D_PROTOTYPE = 'false';
    assert.equal(connections().includes('blob:'), false);
    process.env.JIRAH_AUTH_3D_PROTOTYPE = 'true';
    assert.equal(connections().includes('blob:'), true);
  } finally {
    if (previous === undefined) delete process.env.JIRAH_AUTH_3D_PROTOTYPE;
    else process.env.JIRAH_AUTH_3D_PROTOTYPE = previous;
  }
});
let worker;
let campana;
let lote;

const request = (body, url = '/api/campo/pesajes') => new NextRequest(`http://localhost:3000${url}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
const authenticated = (user = worker) => ({
  user, expires: new Date(Date.now() + 60_000).toISOString(),
});
const createWorker = () => UserRepository.create({
  email: `${randomUUID()}@example.test`, cedula: randomUUID(), passwordHash: 'test-only-hash',
  nombres: 'Prueba', apellidos: 'Seguridad', rol: 'AGRICULTOR',
});
// Fixture del contrato anterior: nunca se crea por la API nueva.
const createPesaje = () => PesajeRepo.create({
  pesoBrutoKg: 117, numGavetas: 10, taraTotal: 17, pesoNetoKg: 100, campanaId: campana.id, loteId: lote.id, agricultorId: worker.id,
});
const classificationInput = (pesajeBrutoId) => ({
  pesajeBrutoId, clasificadorId: worker.id, gavetasExportacion: 4, pesoExportacionBruto: 86.8,
  gavetasNacional: 2, pesoNacionalBruto: 23.4, pesoDescarte: 0,
});

before(async () => {
  const client = createClient({ url: process.env.DATABASE_URL });
  try {
    const migrations = fs.readdirSync(path.join(__dirname, '../prisma/migrations'))
      .filter(name => fs.existsSync(path.join(__dirname, '../prisma/migrations', name, 'migration.sql'))).sort();
    for (const migration of migrations) {
      if (migration === '20261009000000_persistent_session_revocation') {
        await client.execute(`INSERT INTO users (id, email, passwordHash, nombres, apellidos, cedula, rol, updatedAt)
          VALUES ('legacy-user', 'legacy@example.test', 'legacy-test-hash', 'Legado', 'Prueba', 'legacy-id', 'AGRICULTOR', CURRENT_TIMESTAMP)`);
      }
      if (migration === '20261009010000_jornadas_y_categorias') {
        await client.executeMultiple(`
          INSERT INTO campanas (id,codigo,nombre,funda,updatedAt) VALUES ('legacy-camp','LEGACY','Anterior','ROJA',CURRENT_TIMESTAMP);
          INSERT INTO lotes (id,codigo,nombre,updatedAt) VALUES ('legacy-lote','LEGACY','Anterior',CURRENT_TIMESTAMP);
          INSERT INTO pesajes_brutos (id,pesoBrutoKg,numGavetas,taraTotal,pesoNetoKg,agricultorId,campanaId,loteId)
            VALUES ('legacy-pesaje',117,10,17,100,'legacy-user','legacy-camp','legacy-lote');
          INSERT INTO clasificaciones (id,pesajeBrutoId,clasificadorId,pesoExportacionKg,pesoNacionalKg,totalClasificado,margenErrorPct,dentroDelMargen)
            VALUES ('legacy-class','legacy-pesaje','legacy-user',80,20,100,0,1);
        `);
      }
      await client.executeMultiple(fs.readFileSync(path.join(__dirname, '../prisma/migrations', migration, 'migration.sql'), 'utf8'));
    }
  } finally { client.close(); }
  worker = await createWorker();
  campana = await prisma.campana.create({ data: { codigo: 'TEST', nombre: 'Prueba', funda: 'ROJA', taraBase: 1.7 } });
  lote = await prisma.lote.create({ data: { codigo: 'TEST', nombre: 'Prueba' } });
});

after(async () => {
  mock.restoreAll();
  await prisma.$disconnect();
});

test('la migración conserva usuarios previos y asigna una versión inicial', async () => {
  const legacy = await UserRepository.findById('legacy-user');
  assert.equal(legacy.email, 'legacy@example.test');
  assert.equal(legacy.sessionVersion, 0);
});

test('sesiones inválidas no pasan la guarda; App Router puede omitir expires', () => {
  assert.equal(sessionModule.isAuthenticatedSession(null), false);
  assert.equal(sessionModule.isAuthenticatedSession({ user: undefined, expires: new Date(0).toISOString() }), false);
  assert.equal(sessionModule.isAuthenticatedSession({ user: worker, expires: 'inválido' }), false);
  assert.equal(sessionModule.isAuthenticatedSession({ user: worker, expires: new Date(0).toISOString() }), false);
  assert.equal(sessionModule.isAuthenticatedSession({ user: worker }), true);
});

test('NextAuth verifica un JWT real y rechaza la cuenta desactivada', async () => {
  const user = await createWorker();
  const jwt = await encode({ secret: process.env.NEXTAUTH_SECRET, token: { id: user.id, sessionVersion: 0 } });
  const readSession = () => getServerSession(
    { cookies: { 'next-auth.session-token': jwt }, headers: {} },
    { getHeader() {}, setHeader() {} }, authOptions,
  );
  const valid = await readSession();
  assert.equal(valid.user.id, user.id);
  assert.equal(valid.user.sessionVersion, undefined);
  await AgricultorService.desactivar(user.id, worker.id);
  const revoked = await readSession();
  assert.equal(sessionModule.isAuthenticatedSession(revoked), false);
});

test('revocación persiste en otro proceso y reactivar no restaura JWT antiguos', async () => {
  const user = await createWorker();
  await AgricultorService.desactivar(user.id, worker.id);
  await AgricultorService.reactivar(user.id);
  const result = execFileSync(process.execPath, ['-r', path.join(__dirname, 'register.cjs'), '-e',
    `const {AuthService}=require('./lib/services/auth.service.ts');
     const {prisma}=require('./lib/prisma.ts');
     AuthService.validarSesion(process.argv[1],0).then(user=>{
       process.stdout.write(user ? 'active' : 'revoked');
     }).finally(()=>prisma.$disconnect());`, user.id],
    { cwd: path.join(__dirname, '..'), env: process.env, encoding: 'utf8' });
  assert.equal(result, 'revoked');
  assert.equal(await AuthService.validarSesion(user.id, 0), null);
  assert.equal((await AuthService.validarSesion(user.id, 1)).id, user.id);
});

test('JWT sin versión se invalida y los cambios de perfil no revocan la sesión', async () => {
  const callback = authOptions.callbacks.jwt;
  assert.equal((await callback({ token: { id: worker.id } })).revoked, true);
  await UserRepository.update(worker.id, { telefono: '0999999999' });
  const updated = await callback({ token: { id: worker.id, sessionVersion: 0, rol: 'ADMIN' } });
  assert.equal(updated.revoked, false);
  assert.equal(updated.rol, 'AGRICULTOR');
});

test('cambiar contraseña invalida versiones anteriores sin devolver el hash', async () => {
  const user = await createWorker();
  const oldToken = await prisma.passwordResetToken.create({ data: {
    userId: user.id, token: await bcrypt.hash(randomUUID(), 4), expiresAt: new Date(Date.now() + 60_000),
  } });
  const updated = await UserRepository.update(user.id, { passwordHash: await bcrypt.hash('NuevaClave9', 4) });
  assert.equal('passwordHash' in updated, false);
  assert.equal(await AuthService.validarSesion(user.id, 0), null);
  assert.equal(updated.sessionVersion, 1);
  assert.ok((await prisma.passwordResetToken.findUnique({ where: { id: oldToken.id } })).usedAt);
  const loggedIn = await AuthService.login(user.email, 'NuevaClave9');
  assert.equal(loggedIn.sessionVersion, 1);
  assert.equal('passwordHash' in loggedIn, false);
});

test('detalle de pesaje proyecta solamente la identidad pública del trabajador', async () => {
  const pesaje = await createPesaje();
  const detail = await PesajeService.obtener(pesaje.id);
  assert.deepEqual(Object.keys(detail.agricultor).sort(), ['apellidos', 'id', 'nombres']);
});

test('campo puede leer opciones activas sin administrar ni consultar compradores', async () => {
  const sessionMock = mock.method(sessionModule, 'getAuthenticatedSession', async () => authenticated());
  try {
    await prisma.campana.create({ data: { codigo: 'CLOSED', nombre: 'Cerrada', funda: 'AZUL', isActive: false } });
    const campaigns = await (await CampanaController.list(request({}))).json();
    assert.equal(campaigns.campanas.some(c => !c.isActive), false);
    assert.deepEqual(Object.keys(campaigns.campanas[0]).sort(), ['codigo', 'id', 'isActive', 'minimoGGr', 'minimoPGr', 'nombre', 'taraBase', 'versionParametros']);
    assert.equal((await LoteController.list(request({}))).status, 200);
    assert.equal((await CampanaController.create(request({}))).status, 403);
    sessionMock.mock.mockImplementation(async () => null);
    assert.equal((await PesajeController.list(request({}))).status, 401);
    assert.equal((await CampanaController.list(request({}))).status, 401);
  } finally { sessionMock.mock.restore(); }
});

test('sincronización rechaza autor de otra cuenta y conserva los registros sin confirmar', async () => {
  const sessionMock = mock.method(sessionModule, 'getAuthenticatedSession', async () => authenticated());
  try {
    const beforeCount = await prisma.pesajeBruto.count();
    for (const [endpoint, field, actorField] of [[syncPesajes, 'pesajes', 'agricultor_id'], [syncClasificaciones, 'clasificaciones', 'clasificador_id']]) {
      const response = await endpoint(request({ [field]: [{ localId: 'other', [actorField]: 'other-user' }] }));
      const body = await response.json();
      assert.equal(body.success, false);
      assert.deepEqual(body.savedIds, []);
      assert.equal(body.errors.length, 1);
    }
    assert.equal(await prisma.pesajeBruto.count(), beforeCount);
  } finally { sessionMock.mock.restore(); }
});

test('validación rechaza ausencias, strings numéricos, infinitos, negativos y gavetas fraccionarias', async () => {
  const validPesaje = { pesoBrutoKg: 117, numGavetas: 10, campanaId: campana.id, loteId: lote.id, agricultorId: worker.id };
  for (const pesoBrutoKg of [undefined, null, '117', Infinity, NaN, -1]) {
    await assert.rejects(PesajeService.registrar({ ...validPesaje, pesoBrutoKg }), /PESO_BRUTO_INVALIDO/);
  }
  await assert.rejects(PesajeService.registrar({ ...validPesaje, numGavetas: 1.5 }), /GAVETAS_INVALIDAS/);
  const pesaje = await createPesaje();
  const input = classificationInput(pesaje.id);
  for (const pesoDescarte of [undefined, '0', Infinity, NaN, -10]) {
    await assert.rejects(ClasificacionService.registrar({ ...input, pesoDescarte, forzar: true }), /PESOS_CLASIFICACION_INVALIDOS/);
  }
  await assert.rejects(ClasificacionService.registrar({ ...input, gavetasExportacion: 1.5 }), /GAVETAS_CLASIFICACION_INVALIDAS/);
  await assert.rejects(ClasificacionService.registrar({ ...input, forzar: 'true' }), /DATOS_INVALIDOS/);
  await assert.rejects(AjusteService.registrar({ pesoRechazado: '12' }), /PESO_RECHAZADO_INVALIDO/);
  await assert.rejects(CampanaService.actualizar(campana.id, { taraBase: NaN }), /TARA_INVALIDA/);
  await assert.rejects(CompradorService.actualizar('missing', { toleranciaPct: Infinity }), /TOLERANCIA_INVALIDA/);
  assert.equal((await PesajeService.obtener(pesaje.id)).clasificacion, null);
});

test('clasificación con el contrato actual completo persiste brutos, gavetas y netos', async () => {
  const pesaje = await createPesaje();
  const result = await ClasificacionService.registrar(classificationInput(pesaje.id));
  assert.equal(result.totalClasificado, 100);
  assert.equal(result.pesoExportacionKg, 80);
  assert.equal(result.pesoNacionalKg, 20);
  assert.equal(result.gavetasExportacion, 4);
  assert.equal(result.dentroDelMargen, true);
});

test('correo no configurado devuelve indisponibilidad sin crear ni divulgar tokens', async () => {
  const beforeCount = await prisma.passwordResetToken.count();
  const response = await AuthController.recuperar(request({ email: worker.email }));
  assert.equal(response.status, 503);
  assert.equal(await prisma.passwordResetToken.count(), beforeCount);
});

const offlinePesaje = (overrides = {}) => ({
  localId: randomUUID(), timestamp: new Date().toISOString(), agricultor_id: worker.id,
  campana_codigo: campana.id, lote_codigo: lote.id, peso_bruto: 117, num_gavetas: 10, tara_base: 1.7, ...overrides,
});

test('repetir o enviar simultáneamente el mismo pesaje no duplica ni cambia su identidad', async () => {
  const payload = offlinePesaje();
  await Promise.all([SyncService.registrarPesaje(payload, worker.id), SyncService.registrarPesaje(payload, worker.id)]);
  await SyncService.registrarPesaje(payload, worker.id);
  assert.equal(await prisma.pesajeBruto.count({ where: { id: payload.localId } }), 1);
  assert.equal((await PesajeService.obtener(payload.localId)).pesoNetoKg, 100);
  await assert.rejects(SyncService.registrarPesaje({ ...payload, peso_bruto: 118 }, worker.id), /otro contenido/);
  await assert.rejects(SyncService.registrarPesaje(payload, 'other-user'), /otra cuenta/);
});

test('cola anterior conserva origen histórico sin inventar cinco categorías; repetir no duplica', async () => {
  const pesaje = await createPesaje();
  const classification = {
    localId: randomUUID(), timestamp: new Date().toISOString(), clasificador_id: worker.id, pesaje_local_id: pesaje.id,
    gavetas_exportacion: 4, peso_exportacion_bruto: 86.8, gavetas_nacional: 2, peso_nacional_bruto: 23.4, descarte_kg: 0,
  };
  await SyncService.registrarClasificacion(classification, worker.id);
  await SyncService.registrarClasificacion(classification, worker.id);
  const stored = await prisma.clasificacion.findUnique({ where: { id: classification.localId } });
  assert.equal(stored.pesajeBrutoId, pesaje.id);
  assert.equal(stored.totalClasificado, 100);
  assert.equal(stored.gavetasExportacion, 4);
  assert.equal(stored.pesoExportacionBruto, 86.8);
  assert.equal(await prisma.clasificacion.count({ where: { pesajeBrutoId: pesaje.id } }), 1);
});

test('tara variable coincide online/offline y una tara cambiada no se acepta silenciosamente', async () => {
  const variable = await prisma.campana.create({ data: { codigo: 'TARA-2', nombre: 'Variable', funda: 'AZUL', taraBase: 2 } });
  const offline = offlinePesaje({ campana_codigo: variable.id, tara_base: 2, peso_bruto: 100 });
  await SyncService.registrarPesaje(offline, worker.id);
  const online = await PesajeService.registrar({
    pesoBrutoKg: 100, numGavetas: 10, campanaId: variable.id, loteId: lote.id, agricultorId: worker.id,
  });
  assert.equal((await PesajeService.obtener(offline.localId)).pesoNetoKg, online.pesoNetoKg);
  assert.equal(online.pesoNetoKg, 80);
  await assert.rejects(SyncService.registrarPesaje(offlinePesaje({ campana_codigo: variable.id, tara_base: 1.7 }), worker.id), /tara de campaña cambió/);
});

test('lote parcial solo confirma persistidos; registros antiguos incompletos conservan error explícito', async () => {
  const sessionMock = mock.method(sessionModule, 'getAuthenticatedSession', async () => authenticated());
  try {
    const valid = offlinePesaje();
    const old = offlinePesaje({ tara_base: undefined });
    const body = await (await syncPesajes(request({ pesajes: [valid, old] }))).json();
    assert.equal(body.success, false);
    assert.deepEqual(body.savedIds, [valid.localId]);
    assert.match(body.errors[0].error, /sin tara/);
    assert.equal(await prisma.pesajeBruto.findUnique({ where: { id: old.localId } }), null);
    await assert.rejects(SyncService.registrarClasificacion({ localId: randomUUID(), timestamp: new Date().toISOString(), clasificador_id: worker.id }, worker.id), /sin detalle/);
    const confirmation = readSyncConfirmation(body, [valid.localId, old.localId]);
    assert.deepEqual(confirmation.savedIds, [valid.localId]);
    assert.ok(confirmation.error);
    assert.throws(() => readSyncConfirmation({ success: true, savedIds: ['unknown'], errors: [] }, [valid.localId]), /inválida/);
    assert.ok(readSyncConfirmation({ success: true, savedIds: [], errors: [] }, [valid.localId]).error);
  } finally { sessionMock.mock.restore(); }
});

test('sincronización respeta campaña cerrada y no inventa datos para un pesaje pendiente', async () => {
  const closed = await prisma.campana.create({ data: { codigo: 'SYNC-CLOSED', nombre: 'Cerrada', funda: 'ROJA', isActive: false } });
  const payload = offlinePesaje({ campana_codigo: closed.id });
  await assert.rejects(SyncService.registrarPesaje(payload, worker.id), /CAMPANA_CERRADA/);
  assert.equal(await prisma.pesajeBruto.findUnique({ where: { id: payload.localId } }), null);
});

test('activar el worker elimina la caché antigua de APIs sin borrar registros locales', async () => {
  let activate;
  const removed = [];
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../worker/index.js'), 'utf8'), {
    self: { addEventListener(event, handler) { assert.equal(event, 'activate'); activate = handler; } },
    caches: { async delete(name) { removed.push(name); return true; } },
  });
  let cleanup;
  activate({ waitUntil(promise) { cleanup = promise; } });
  await cleanup;
  assert.deepEqual(removed, ['apis', 'jirah-campo-pages-v1', 'jirah-campo-rsc-v1', 'jirah-campo-assets-v1']);
});

test('la cola local solo devuelve registros de la cuenta actual', async () => {
  const { offlineService } = require('../lib/services/offline.service.ts');
  const instance = new offlineService.constructor();
  const storage = mock.method(instance, 'initDB', async () => ({
    getAll: async store => store === 'pesajes'
      ? [{ localId: 'mine', agricultor_id: worker.id }, { localId: 'other', agricultor_id: 'other-user' }]
      : [{ localId: 'mine', clasificador_id: worker.id }, { localId: 'other', clasificador_id: 'other-user' }],
  }));
  try {
    assert.deepEqual((await instance.getPendingPesajes(worker.id)).map(p => p.localId), ['mine']);
    assert.deepEqual((await instance.getPendingClasificaciones(worker.id)).map(p => p.localId), ['mine']);
    assert.deepEqual(await instance.getPendingPesajes(undefined), []);
  } finally { storage.mock.restore(); }
});

test('restablecimiento concurrente consume una vez e invalida otras sesiones y tokens', async () => {
  const user = await createWorker();
  const secret = randomBytes(32).toString('hex');
  const resetToken = await prisma.passwordResetToken.create({ data: {
    userId: user.id, token: createHash('sha256').update(secret).digest('hex'), expiresAt: new Date(Date.now() + 60_000),
  } });
  const other = await prisma.passwordResetToken.create({ data: {
    userId: user.id, token: await bcrypt.hash(randomUUID(), 4), expiresAt: new Date(Date.now() + 60_000),
  } });
  const results = await Promise.allSettled([
    AuthService.resetearPassword(secret, 'NuevaClave-Prueba-2026'), AuthService.resetearPassword(secret, 'OtraClave-Prueba-2026'),
  ]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal((await UserRepository.findById(user.id)).sessionVersion, 1);
  assert.ok((await prisma.passwordResetToken.findUnique({ where: { id: resetToken.id } })).usedAt);
  assert.ok((await prisma.passwordResetToken.findUnique({ where: { id: other.id } })).usedAt);
  await assert.rejects(AuthService.resetearPassword(secret, 'NuevaClave-Prueba-2026'), /TOKEN_INVALIDO/);
});

require('./offline-cases.cjs')({test,assert,randomUUID});
require('./access-cases.cjs')({test,assert,randomUUID,prisma,mock});
require('./registro-cases.cjs')({test,assert,randomUUID,prisma,mock});
require('./preferencias-y-paginacion-cases.cjs')({test,assert,randomUUID,prisma,mock});

require('./comercial-cases.cjs')({test,assert,randomUUID,prisma,PesajeService,JornadaService,JornadaRepo,SyncService,getWorker:()=>worker,getLote:()=>lote,mock});

require('./jornadas-cases.cjs')({ test, assert, randomUUID, prisma, worker: () => worker, lote: () => lote,
  PesajeService, JornadaService, JornadaRepo, JornadaController, SyncService, sessionModule, mock, request, authenticated,
  calcularClasificacion, fechaFinca, jornadaId, jornadasLocales });

if (process.env.JIRAH_HTTP_TEST === '1') test('HTTP real: acceso, sesión, catálogos, captura, clasificación y revocación', { timeout: process.env.JIRAH_BROWSER_TEST === '1' ? 180_000 : 60_000 }, async () => {
  const probe = net.createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const base = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: path.join(__dirname, '..'), env: { ...process.env, NEXTAUTH_URL: base, NODE_ENV: 'production' },
    stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
  });
  let serverError;
  server.on('error', error => { serverError = error; });
  let startupLog = '';
  const collectStartup = chunk => { startupLog = (startupLog + chunk.toString()).slice(-4000); };
  server.stdout.on('data', collectStartup);
  server.stderr.on('data', collectStartup);
  try {
    let ready = false;
    for (let attempt = 0; attempt < 120; attempt++) {
      if (serverError) throw serverError;
      if (server.exitCode !== null) throw new Error('El servidor de pruebas terminó antes de iniciar');
      try {
        const response = await fetch(`${base}/api/auth/csrf`, { signal: AbortSignal.timeout(1000) });
        if (response.ok) { ready = true; break; }
      } catch { /* Esperar al arranque del servidor local. */ }
      await delay(250);
    }
    assert.equal(ready, true, `El servidor de pruebas debe iniciar. ${startupLog.replaceAll(process.env.NEXTAUTH_SECRET, '[redactado]')}`);

    assert.equal((await fetch(`${base}/api/campo/pesajes`)).status, 401);
    const user = await UserRepository.create({
      email: 'http@example.test', cedula: 'http-test', passwordHash: await bcrypt.hash('PruebaClave9', 4),
      nombres: 'HTTP', apellidos: 'Prueba', rol: 'AGRICULTOR',
    });
    const csrfResponse = await fetch(`${base}/api/auth/csrf`);
    const { csrfToken } = await csrfResponse.json();
    const cookies = new Map();
    const rememberCookies = response => {
      for (const cookie of response.headers.getSetCookie()) {
        const pair = cookie.split(';')[0];
        const index = pair.indexOf('=');
        cookies.set(pair.slice(0, index), pair.slice(index + 1));
      }
    };
    const cookieHeader = () => [...cookies].map(([key, value]) => `${key}=${value}`).join('; ');
    rememberCookies(csrfResponse);
    const signedIn = await fetch(`${base}/api/auth/callback/credentials`, {
      method: 'POST', redirect: 'manual', headers: { Cookie: cookieHeader(), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ csrfToken, email: user.email, password: 'PruebaClave9', json: 'true', callbackUrl: `${base}/dashboard` }),
    });
    rememberCookies(signedIn);
    assert.ok(cookies.get('next-auth.session-token'), 'El login debe emitir una sesión');
    const get = route => fetch(`${base}${route}`, { headers: { Cookie: cookieHeader() } });
    const post = (route, body) => fetch(`${base}${route}`, {
      method: 'POST', headers: { Cookie: cookieHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const profile = await get('/api/perfil');
    assert.equal(profile.status, 200);
    assert.match(profile.headers.get('cache-control'), /no-store/);
    assert.equal((await get('/api/catalogos/campanias')).status, 200);
    assert.equal((await get('/api/catalogos/lotes')).status, 200);
    assert.equal((await post('/api/catalogos/campanias', {})).status, 403);
    assert.equal((await get('/api/comercial/entregas')).status, 403);
    assert.equal((await post('/api/comercial/devoluciones', {})).status, 403);
    assert.equal((await post('/api/comercial/anulaciones', {})).status, 403);
    assert.equal((await post('/api/campo/jornadas/correcciones', {})).status, 403);
    assert.equal((await post(`/api/agricultores/${user.id}/invitacion`, {})).status, 403);
    assert.equal((await get('/api/reportes/cosecha?fechaDesde=2026-02-30')).status, 403);
    assert.equal((await get('/api/reportes/cosecha')).status, 403);
    assert.equal((await fetch(`${base}/api/campo/pesajes`, { method: 'POST', headers: {Cookie: cookieHeader(), Origin:'https://example.invalid', 'Content-Type':'application/json'},body:'{}' })).status, 403);
    assert.equal((await post('/api/campo/pesajes', { pesoBrutoKg: '117' })).status, 422);
    const captured = await post('/api/campo/pesajes', {
      pesoBrutoKg: 117, numGavetas: 10, campanaId: campana.id, loteId: lote.id, agricultorId: 'spoofed-user',
    });
    assert.equal(captured.status, 201);
    const { pesaje } = await captured.json();
    assert.equal(pesaje.agricultorId, user.id);
    const detail = await (await get(`/api/campo/pesajes/${pesaje.id}`)).json();
    assert.deepEqual(Object.keys(detail.pesaje.agricultor).sort(), ['apellidos', 'id', 'nombres']);
    assert.equal((await post('/api/campo/clasificaciones', classificationInput(pesaje.id))).status, 409);
    const { jornadas } = await (await get('/api/campo/jornadas')).json();
    const jornada = jornadas.find(j => j.id === pesaje.jornadaId);
    const capture = { id: randomUUID(), jornadaId: jornada.id, version: jornada.version,
      pesajeIds: jornada.pesajes.map(p => p.id), timestamp: new Date().toISOString(),
      detalles: ['G','P','N1','N2','N3'].map(categoria => ({ categoria, numGavetas: categoria === 'G' ? 1 : 0,
        pesoBrutoKg: categoria === 'G' ? jornada.pesoNetoKg * 0.9 + jornada.taraBase : 0 })) };
    const classified = await post('/api/campo/jornadas', capture);
    assert.equal(classified.status, 201, await classified.text());
    assert.equal((await post('/api/campo/jornadas', capture)).status, 201);
    const pendingJornada = (await (await get('/api/campo/jornadas')).json()).jornadas.find(j => j.id === jornada.id);
    assert.equal(pendingJornada.estado, 'PENDIENTE_APROBACION');
    assert.equal((await post('/api/campo/jornadas/aprobaciones', { jornadaId: jornada.id, motivo: 'Intento sin permiso', version: jornada.version })).status, 403);
    const invalidSync = await post('/api/sync/pesajes', { pesajes: [{ localId: 'spoof', agricultor_id: 'another-user' }] });
    assert.equal((await invalidSync.json()).success, false);
    await AgricultorService.desactivar(user.id, worker.id);
    assert.equal((await get('/api/perfil')).status, 401);
    await AgricultorService.reactivar(user.id);
    assert.equal((await get('/api/perfil')).status, 401);

    const admin = await UserRepository.create({ email: 'http-admin@example.test', cedula: 'http-admin',
      passwordHash: await bcrypt.hash('PruebaAdmin9', 4), nombres: 'Admin', apellidos: 'HTTP', rol: 'ADMIN' });
    cookies.clear();
    const adminCsrfResponse = await fetch(`${base}/api/auth/csrf`);
    const adminCsrf = await adminCsrfResponse.json();
    rememberCookies(adminCsrfResponse);
    const adminLogin = await fetch(`${base}/api/auth/callback/credentials`, {
      method: 'POST', redirect: 'manual', headers: { Cookie: cookieHeader(), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ csrfToken: adminCsrf.csrfToken, email: admin.email, password: 'PruebaAdmin9', json: 'true', callbackUrl: `${base}/dashboard` }),
    });
    rememberCookies(adminLogin);
    assert.equal((await get('/api/reportes/cosecha?fechaDesde=2026-02-30')).status, 422);
    await require('./http-security-cases.cjs')({ base, prisma, assert, admin, adminCookie: cookieHeader() });
    await require('./registro-http-cases.cjs')({ base, prisma, assert, adminCookie: cookieHeader() });
    assert.equal((await post('/api/catalogos/campanias', {nombre:12})).status, 422);
    assert.equal((await post('/api/catalogos/lotes', null)).status, 422);
    assert.equal((await post('/api/catalogos/compradores', {nombre:12})).status, 422);
    const approval = { jornadaId: jornada.id, version: pendingJornada.version, motivo: 'Revisado con el responsable en finca' };
    assert.equal((await post('/api/campo/jornadas/aprobaciones', {...approval,motivo:''})).status, 422);
    const approvedResponse = await post('/api/campo/jornadas/aprobaciones', approval);
    assert.equal(approvedResponse.status, 200);
    const approved = (await approvedResponse.json()).clasificacion;
    assert.equal(approved.aprobadorId, admin.id); assert.equal(approved.dentroDelMargen, false);
    assert.equal((await post('/api/campo/jornadas/aprobaciones', approval)).status, 409);
    assert.equal((await (await get('/api/campo/jornadas')).json()).jornadas.find(j => j.id === jornada.id).estado, 'APROBADA');
    if (process.env.JIRAH_BROWSER_TEST === '1') await require('./browser-cases.cjs')({base,prisma,assert,admin});
  } finally {
    if (server.exitCode === null) {
      server.kill();
      await once(server, 'exit');
    }
  }
});
