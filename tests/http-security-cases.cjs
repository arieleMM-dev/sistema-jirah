const { randomUUID, createHash } = require('node:crypto');
const { encode } = require('next-auth/jwt');

module.exports = async ({ base, prisma, assert, adminCookie }) => {
  const administrative = [
    ['GET', '/api/agricultores'], ['POST', '/api/agricultores'],
    ...['GET', 'PUT', 'PATCH', 'DELETE'].map(method => [method, '/api/agricultores/fixture']),
    ['POST', '/api/agricultores/fixture/invitacion'],
    ...['campanias', 'lotes', 'compradores'].flatMap(name => [
      ['POST', '/api/catalogos/' + name], ['PATCH', '/api/catalogos/' + name + '/fixture'], ['DELETE', '/api/catalogos/' + name + '/fixture'],
      ...(name === 'compradores' ? [['GET', '/api/catalogos/' + name]] : []),
    ]),
    ['GET', '/api/comercial/entregas'], ['POST', '/api/comercial/entregas'], ['POST', '/api/comercial/devoluciones'], ['POST', '/api/comercial/anulaciones'],
    ['GET', '/api/reportes/cosecha'], ['GET', '/api/dashboard/stats'], ['GET', '/api/campo/ajustes'], ['POST', '/api/campo/ajustes'],
    ['POST', '/api/campo/jornadas/aprobaciones'], ['GET', '/api/campo/jornadas/correcciones'], ['POST', '/api/campo/jornadas/correcciones'],
  ];
  const field = [
    ['GET', '/api/campo/pesajes'], ['POST', '/api/campo/pesajes'], ['GET', '/api/campo/pesajes/fixture'],
    ['GET', '/api/campo/clasificaciones'], ['POST', '/api/campo/clasificaciones'],
    ['GET', '/api/campo/jornadas'], ['POST', '/api/campo/jornadas'],
    ['GET', '/api/catalogos/campanias'], ['GET', '/api/catalogos/lotes'],
    ['POST', '/api/sync/pesajes'], ['POST', '/api/sync/clasificaciones'],
    ['GET', '/api/perfil'], ['PATCH', '/api/perfil'], ['POST', '/api/perfil'],
  ];
  const call = (method, route, cookie, extra = {}) => fetch(base + route, {
    method, redirect: 'manual', headers: { ...(cookie ? { Cookie: cookie } : {}), 'Content-Type': 'application/json', ...extra },
    ...(['GET', 'HEAD'].includes(method) ? {} : { body: '{}' }),
  });
  for (const [method, route] of [...administrative, ...field]) {
    assert.equal((await call(method, route)).status, 401, 'Anónimo: ' + method + route);
  }
  for (const rol of ['AGRICULTOR', 'CLASIFICADOR', 'AGRICULTOR_CLASIFICADOR']) {
    const u = await prisma.user.create({ data: { email: randomUUID() + '@example.test', cedula: randomUUID(), nombres: 'Matriz', apellidos: 'Seguridad', rol, passwordHash: 'fixture' } });
    const token = await encode({ secret: process.env.NEXTAUTH_SECRET, token: { id: u.id, sessionVersion: 0, rol: 'ADMIN' } });
    const cookie = 'next-auth.session-token=' + token;
    for (const [method, route] of administrative) {
      assert.equal((await call(method, route, cookie, { 'x-middleware-subrequest': 'proxy:proxy:proxy:proxy:proxy' })).status, 403, rol + method + route);
    }
    for (const route of ['/api/campo/pesajes', '/api/campo/jornadas', '/api/perfil', '/api/catalogos/campanias', '/api/catalogos/lotes']) {
      assert.equal((await call('GET', route, cookie)).status, 200, rol + route);
    }
    const page = await call('GET', '/dashboard/personal', cookie);
    assert.equal(page.status, 307);
    assert.equal(new URL(page.headers.get('location'), base).pathname, '/dashboard/campo/pesaje');
    await prisma.user.update({ where: { id: u.id }, data: { isActive: false, sessionVersion: { increment: 1 } } });
    assert.equal((await call('GET', '/api/perfil', cookie)).status, 401);
    await prisma.user.update({ where: { id: u.id }, data: { isActive: true } });
    assert.equal((await call('GET', '/api/perfil', cookie)).status, 401);
  }
  assert.equal((await call('GET', '/api/perfil', 'next-auth.session-token=forged')).status, 401);
  assert.equal((await call('POST', '/api/perfil', adminCookie, { Origin: 'https://externo.invalid' })).status, 403);
  const oversized = await fetch(base + '/api/auth/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: 'x'.repeat(70 * 1024) }) });
  assert.equal(oversized.status, 413);
  for (const route of ['/api/agricultores', '/api/catalogos/compradores', '/api/reportes/cosecha', '/api/dashboard/stats', '/api/comercial/entregas']) {
    const response = await call('GET', route, adminCookie);
    assert.equal(response.status, 200, 'Administrador: ' + route);
    assert.match(response.headers.get('cache-control'), /no-store/);
  }
  const document = () => fetch(base + '/login', { headers: { Accept: 'text/html' } });
  const first = await document(), second = await document();
  const csp = first.headers.get('content-security-policy');
  assert.match(csp, /nonce-/);
  assert.notEqual(csp, second.headers.get('content-security-policy'));
  assert.ok(!csp.includes('unsafe-eval'));
  assert.match(csp, /frame-ancestors 'none'/);
  assert.equal(first.headers.get('x-frame-options'), 'DENY');
  assert.equal((await fetch(base + '/recuperar/reset?token=example')).headers.get('referrer-policy'), 'no-referrer');

  const clave = 'auth-network:' + createHash('sha256').update('shared').digest('hex');
  await prisma.limiteAcceso.upsert({ where: { clave }, create: { clave, intentos: 30, vence: new Date(Date.now() + 60_000) }, update: { intentos: 30, vence: new Date(Date.now() + 60_000) } });
  try {
    const limited = await call('POST', '/api/auth/reset', undefined, { 'x-forwarded-for': '1.2.3.4' });
    assert.equal(limited.status, 429);
    assert.equal(limited.headers.get('retry-after'), '60');
  } finally { await prisma.limiteAcceso.delete({ where: { clave } }); }
};
