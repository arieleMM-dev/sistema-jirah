module.exports = ({ test, assert, prisma, randomUUID, mock }) => {
  test('identidad offline permite siete días sin extender el JWT ni renovar por leer o fallar la red', async () => {
    const { OFFLINE_CAPTURE_MS, readOfflineSession, rememberServerSession, validateServerSession } = require('../lib/auth/offline-session.ts');
    const now = Date.now();
    const session = { expires: new Date(now + 8 * 3600_000).toISOString(), user: { id: 'campo', rol: 'AGRICULTOR', nombres: 'Campo', apellidos: 'Prueba' } };
    const stored = rememberServerSession(session, now);
    assert.equal(JSON.parse(stored).serverExpires, session.expires);
    assert.equal(JSON.parse(stored).offlineExpires, new Date(now + OFFLINE_CAPTURE_MS).toISOString());
    assert.equal(readOfflineSession(stored, now + 9 * 3600_000).user.id, 'campo');
    assert.equal(readOfflineSession(stored, now + OFFLINE_CAPTURE_MS - 1).user.id, 'campo');
    assert.equal(readOfflineSession(stored, now + OFFLINE_CAPTURE_MS), undefined);
    assert.equal(rememberServerSession(session, now + 9 * 3600_000), undefined);
    assert.equal(readOfflineSession(JSON.stringify(session), now + 9 * 3600_000), undefined);
    assert.equal(readOfflineSession('{malformado'), undefined);
    assert.equal(readOfflineSession(JSON.stringify({ ...JSON.parse(stored), offlineExpires: new Date(now + OFFLINE_CAPTURE_MS * 2).toISOString() }), now), undefined);
    const transport = mock.method(global, 'fetch', async () => new Response('{}', { status: 503 }));
    try {
      await assert.rejects(validateServerSession(), /contactar/);
      assert.equal(readOfflineSession(stored, now + 9 * 3600_000).user.id, 'campo');
      transport.mock.mockImplementation(async () => new Response('{}', { status: 401 }));
      assert.equal(await validateServerSession(), undefined);
      transport.mock.mockImplementation(async () => Response.json(session));
      assert.equal((await validateServerSession()).user.id, 'campo');
    } finally { transport.mock.restore(); }
  });
  const { encode } = require('next-auth/jwt');
  const { NextRequest } = require('next/server');
  const { proxy } = require('../proxy.ts');
  const { validatePassword } = require('../lib/password-policy.ts');
  const { bodyWithinLimit, networkIdentity } = require('../lib/http-security.ts');
  const { UserRepository } = require('../lib/repositories/UserRepository.ts');
  const { PerfilController } = require('../lib/controllers/PerfilController.ts');
  const { AuthService } = require('../lib/services/auth.service.ts');
  const { authOptions } = require('../lib/controllers/AuthController.ts');
  const sessions = require('../lib/auth/session.ts');
  const bcrypt = require('bcryptjs');
  const user = (rol = 'AGRICULTOR') => prisma.user.create({ data: {
    email: randomUUID() + '@example.test', cedula: randomUUID(), nombres: 'Acceso', apellidos: 'Prueba', rol, passwordHash: 'fixture',
  } });
  const cookie = async (u, extra = {}, maxAge = 3600) => 'next-auth.session-token=' + await encode({
    secret: process.env.NEXTAUTH_SECRET, maxAge, token: { id: u.id, sessionVersion: u.sessionVersion, ...extra },
  });
  const request = (route, headers = {}, body) => new NextRequest('http://localhost:3000' + route, {
    headers, ...(body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) }),
  });

  test('URL directa, cookie inventada, JWT vencido y cuenta eliminada no conceden acceso', async () => {
    assert.equal((await proxy(request('/api/agricultores', { cookie: 'next-auth.session-token=fake' }))).status, 401);
    assert.equal((await proxy(request('/dashboard/personal/registro.fake', { cookie: 'next-auth.session-token=fake' }))).status, 307);
    const u = await user();
    assert.equal((await proxy(request('/api/perfil', { cookie: await cookie(u, {}, -60) }))).status, 401);
    const valid = await cookie(u);
    const encoded = valid.slice(valid.indexOf('=') + 1);
    const chunked = 'next-auth.session-token.0=' + encoded.slice(0, 70) + '; next-auth.session-token.1=' + encoded.slice(70);
    assert.equal((await proxy(request('/api/perfil', { cookie: chunked }))).status, 200);
    await prisma.user.delete({ where: { id: u.id } });
    assert.equal((await proxy(request('/api/perfil', { cookie: valid }))).status, 401);
  });

  test('el rol firmado o las cabeceras de middleware no sustituyen el permiso actual de la base', async () => {
    for (const rol of ['AGRICULTOR', 'CLASIFICADOR', 'AGRICULTOR_CLASIFICADOR']) {
      const u = await user(rol);
      const headers = { cookie: await cookie(u, { rol: 'ADMIN' }), 'x-middleware-subrequest': 'proxy:proxy:proxy:proxy:proxy' };
      for (const route of ['/api/agricultores', '/api/catalogos/compradores', '/api/campo/ajustes', '/api/reportes/cosecha', '/api/dashboard/stats']) {
        assert.equal((await proxy(request(route, headers))).status, 403, rol + route);
      }
      assert.equal((await proxy(request('/api/campo/pesajes', headers))).status, 200);
      assert.equal((await proxy(request('/api/campo/jornadas', headers))).status, 200);
      assert.equal((await proxy(request('/dashboard/personal', headers))).headers.get('location'), 'http://localhost:3000/dashboard/campo/pesaje');
      await prisma.user.update({ where: { id: u.id }, data: { sessionVersion: { increment: 1 } } });
      assert.equal((await proxy(request('/api/campo/pesajes', headers))).status, 401);
    }
  });

  test('origen externo y cuerpos grandes se rechazan antes de llegar al controlador', async () => {
    assert.equal((await proxy(request('/api/auth/reset', { origin: 'https://externo.invalid' }, {}))).status, 403);
    assert.equal((await proxy(request('/api/auth/reset', { 'sec-fetch-site': 'cross-site' }, {}))).status, 403);
    assert.equal((await proxy(request('/api/auth/reset', { origin: 'null' }, {}))).status, 403);
    assert.equal((await proxy(request('/api/auth/reset', { 'content-length': '1' }, { payload: 'a'.repeat(65 * 1024) }))).status, 413);
    assert.equal(await bodyWithinLimit(new Request('http://localhost', { method: 'POST', body: 'abcdef' }), 5), false);
    assert.equal(await bodyWithinLimit(new Request('http://localhost', { method: 'POST', body: 'abc' }), 5), true);
  });

  test('las IP declaradas por el cliente no eluden el límite sin un proxy confiable configurado', () => {
    const previous = process.env.TRUST_PROXY_HEADERS;
    try {
      process.env.TRUST_PROXY_HEADERS = 'false';
      assert.equal(networkIdentity(new Headers({ 'x-forwarded-for': '1.2.3.4' })), 'shared');
      process.env.TRUST_PROXY_HEADERS = 'true';
      assert.equal(networkIdentity(new Headers({ 'x-forwarded-for': '1.2.3.4' })), '1.2.3.4');
      assert.equal(networkIdentity(new Headers({ 'x-forwarded-for': 'invalid' })), 'shared');
    } finally {
      if (previous === undefined) delete process.env.TRUST_PROXY_HEADERS;
      else process.env.TRUST_PROXY_HEADERS = previous;
    }
  });

  test('contraseñas nuevas no se truncan y las temporales tienen longitud y política válidas', async () => {
    assert.equal(validatePassword('frase larga para la finca').ok, true);
    assert.equal(validatePassword('Corta9').ok, false);
    assert.equal(validatePassword('a'.repeat(73)).ok, false);
    assert.equal(validatePassword('🌵'.repeat(19)).ok, false);
    assert.equal(validatePassword('passwordpassword').ok, false);
    assert.equal(validatePassword(null).ok, false);
    for (let i = 0; i < 20; i++) assert.equal(validatePassword(AuthService.generarPasswordTemporal()).ok, true);
    await assert.rejects(AuthService.hashPassword('a'.repeat(73)));
    const u = await user();
    await prisma.user.update({ where: { id: u.id }, data: { passwordHash: await bcrypt.hash('a'.repeat(72), 4) } });
    assert.equal(await AuthService.login(u.email, 'a'.repeat(72) + 'different'), null);
  });

  test('el perfil no acepta cambio de rol, identidad, sesión ni contenido HTML como imagen', async () => {
    const u = await user();
    mock.method(sessions, 'getAuthenticatedSession', async () => ({ user: u }));
    try {
      const change = await PerfilController.actualizar(request('/api/perfil', {}, { rol: 'ADMIN', id: 'other', email: 'otro@example.test', sessionVersion: 0, passwordHash: 'forged', isActive: false, tema: 'CLARO' }));
      assert.equal(change.status, 200);
      const stored = await prisma.user.findUnique({ where: { id: u.id } });
      assert.equal(stored.rol, 'AGRICULTOR'); assert.equal(stored.email, u.email); assert.equal(stored.passwordHash, 'fixture'); assert.equal(stored.isActive, true);
      assert.equal((await PerfilController.actualizar(request('/api/perfil', {}, { avatar: 'data:image/png;base64,' + Buffer.from('<script>alert(1)</script>').toString('base64') }))).status, 422);
      assert.equal((await PerfilController.actualizar(request('/api/perfil', {}, null))).status, 400);
    } finally { mock.restoreAll(); }
  });

  test('el cambio de contraseña limita intentos y una operación vieja no sobrescribe un restablecimiento', async () => {
    const u = await user();
    const hash = await bcrypt.hash('Contraseña-Original-2026', 4);
    await prisma.user.update({ where: { id: u.id }, data: { passwordHash: hash } });
    mock.method(sessions, 'getAuthenticatedSession', async () => ({ user: u }));
    try {
      for (let i = 0; i < 10; i++) assert.equal((await PerfilController.cambiarPassword(request('/api/perfil', {}, { currentPassword: 'incorrecta', newPassword: 'Contraseña-Nueva-2026' }))).status, 401);
      assert.equal((await PerfilController.cambiarPassword(request('/api/perfil', {}, { currentPassword: 'incorrecta', newPassword: 'Contraseña-Nueva-2026' }))).status, 429);
    } finally { mock.restoreAll(); }
    const results = await Promise.all([
      UserRepository.changePassword(u.id, hash, 0, await bcrypt.hash('Primera-Contraseña-2026', 4)),
      UserRepository.changePassword(u.id, hash, 0, await bcrypt.hash('Segunda-Contraseña-2026', 4)),
    ]);
    assert.equal(results.filter(Boolean).length, 1);
    assert.equal((await prisma.user.findUnique({ where: { id: u.id } })).sessionVersion, 1);
  });

  test('la redirección de autenticación nunca abandona el dominio de la aplicación', async () => {
    const redirect = authOptions.callbacks.redirect;
    const baseUrl = 'https://finca.example';
    for (const url of ['https://externo.invalid/', '//externo.invalid/', 'javascript:alert(1)', 'https://finca.example@externo.invalid/']) {
      assert.equal(await redirect({ url, baseUrl }), baseUrl);
    }
    assert.equal(await redirect({ url: '/dashboard', baseUrl }), baseUrl + '/dashboard');
  });

  test('los límites persistentes no se eluden mediante intentos simultáneos', async () => {
    const { LimiteAccesoRepo } = require('../lib/repositories/LimiteAccesoRepository.ts');
    const identity = randomUUID();
    const outcomes = await Promise.all(Array.from({ length: 12 }, () => LimiteAccesoRepo.consumir('concurrente', identity, 3, 60_000)));
    assert.equal(outcomes.filter(Boolean).length, 3);
  });

  test('la mitigación de braces rechaza patrones profundos y conserva los patrones normales', () => {
    const { execFileSync } = require('node:child_process');
    const path = require('node:path');
    execFileSync(process.execPath, [path.join(__dirname, '../scripts/harden-braces.cjs'), '--check']);
    const braces = require('braces');
    const deep = '{'.repeat(2000) + 'a,b' + '}'.repeat(2000);
    for (const operation of [braces, braces.parse, braces.compile, braces.expand, braces.stringify]) {
      assert.throws(() => operation(deep), /nesting exceeds/);
    }
    assert.deepEqual(braces.expand('L-{01..03}'), ['L-01', 'L-02', 'L-03']);
  });

  test('el enlace de recuperación conserva el token solo en el fragmento del navegador', async () => {
    const { CorreoService } = require('../lib/services/correo.service.ts');
    const mailer = require('smtp-mailer');
    let message;
    mock.method(CorreoService, 'configuracion', () => ({ origin: 'https://finca.example', host: 'smtp.example', from: 'finca@example.test', port: 465, secure: true }));
    mock.method(mailer, 'createTransport', () => ({ sendMail: async m => { message = m; return { accepted: [m.to], rejected: [] }; }, close() {} }));
    try {
      const token = 'a'.repeat(64);
      await CorreoService.recuperacion('trabajador@example.test', token);
      const link = new URL(message.text.match(/https:\/\/\S+/)[0]);
      assert.equal(link.search, '');
      assert.equal(new URLSearchParams(link.hash.slice(1)).get('token'), token);
      assert.equal(message.to, 'trabajador@example.test');
    } finally { mock.restoreAll(); }
  });
};
