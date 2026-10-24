const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium, expect } = require('@playwright/test');

module.exports = async function verifyAuthUI(base, suppliedBrowser) {
  const browser = suppliedBrowser || await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  const page = await context.newPage();
  const errors = [];
  const modelRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.url().endsWith('/brand/pitahaya-amarilla-20261014.glb')) modelRequests.push(request.url()); });
  const qa = path.join(__dirname, '../prisma/backups/browser-qa');
  const review = path.join(__dirname, '../.impeccable/review');
  fs.mkdirSync(qa, { recursive: true });
  fs.mkdirSync(review, { recursive: true });

  async function capture(name) {
    if (await page.getByTestId('pitahaya-model').count()) await expect(page.getByTestId('pitahaya-model')).toHaveAttribute('data-state', 'ready', { timeout: 30000 });
    await expect(page.locator('html')).toHaveAttribute('data-theme', /^(light|dark)$/);
    await page.evaluate(() => document.fonts.ready);
    await expect.poll(() => page.locator('img').evaluateAll(images => images
      .filter(image => image.getBoundingClientRect().width > 0)
      .filter(image => !image.complete || image.naturalWidth === 0)
      .map(image => image.getAttribute('alt') || image.getAttribute('src')))).toEqual([]);
    await page.locator('img').evaluateAll(images => Promise.all(images
      .filter(image => image.getBoundingClientRect().width > 0)
      .map(image => image.decode())));
    await page.evaluate(() => Promise.all(document.getAnimations()
      .filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity)
      .map(animation => animation.finished.catch(() => {}))));
    const fruit = page.getByTestId('pitahaya-photo');
    if (await fruit.isVisible()) await expect(fruit).toHaveCSS('opacity', '1');
    await page.locator('h1').click();
    await page.screenshot({ path: path.join(qa, name + '.png'), fullPage: true, animations: 'disabled', caret: 'initial' });
  }
  async function noOverflow() {
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'Sin desbordamiento horizontal');
    assert.equal(await page.locator('h1').count(), 1, 'Un encabezado principal por pantalla');
  }

  try {
    await page.clock.install();
    await page.goto(base + '/login');
    await expect(page.getByRole('heading', { name: 'Iniciar Sesión' })).toBeVisible();
    const fruit = page.getByTestId('pitahaya-photo');
    const model = page.getByTestId('pitahaya-model');
    const prototype3D = await page.getByRole('complementary').getAttribute('data-scene-mode') === 'prototype-3d';
    const expectMotion = state => prototype3D ? expect(model).toHaveAttribute('data-motion', state) : expect(fruit).toHaveCSS('animation-play-state', state);
    if (prototype3D) {
      await expect(model).toHaveAttribute('data-state', 'ready', { timeout: 30000 });
      await expectMotion('running');
      const firstRotation = await model.getAttribute('data-rotation');
      await expect.poll(() => model.getAttribute('data-rotation')).not.toBe(firstRotation);
      await expect(fruit).not.toBeVisible();
    } else {
      await expect(fruit).toBeVisible();
      await expect(page.locator('canvas')).toHaveCount(0);
      const firstTransform = await fruit.evaluate(image => getComputedStyle(image).transform);
      await expect.poll(() => fruit.evaluate(image => getComputedStyle(image).transform)).not.toBe(firstTransform);
    }
    const facts = page.getByTestId('pitahaya-facts');
    const activeFact = facts.locator('[data-active="true"]');
    await expect(page.getByRole('button', { name: /Mensaje anterior|Mensaje siguiente|Pausar animación|Reanudar animación/ })).toHaveCount(0);
    for (const surface of [facts, page.locator('#acceso')]) {
      await expect(surface).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
      await expect(surface).toHaveCSS('border-top-width', '0px');
    }
    await expect(page.getByLabel('Correo electrónico')).toHaveCSS('backdrop-filter', 'blur(12px)');
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
    let previousFact = await activeFact.textContent();
    for (let change = 0; change < 5; change++) {
      await page.clock.fastForward(10000);
      await expect(activeFact).not.toHaveText(previousFact);
      previousFact = await activeFact.textContent();
    }
    await page.getByLabel('Correo electrónico').focus();
    await expectMotion('paused');
    const pausedRotation = prototype3D ? await model.getAttribute('data-rotation') : null;
    const pausedTransform = await fruit.evaluate(image => getComputedStyle(image).transform);
    await page.clock.fastForward(20000);
    await expect(activeFact).toHaveText(previousFact);
    if (prototype3D) await expect(model).toHaveAttribute('data-rotation', pausedRotation);
    else await expect(fruit).toHaveCSS('transform', pausedTransform);
    await page.getByRole('button', { name: 'Usar tema oscuro' }).focus();
    await expectMotion('running');
    await facts.hover();
    await expectMotion('paused');
    await page.clock.fastForward(20000);
    await expect(activeFact).toHaveText(previousFact);
    await page.mouse.move(0, 0);
    await expectMotion('running');
    await page.clock.resume();
    await noOverflow();
    await capture('acceso-escritorio');
    fs.copyFileSync(path.join(qa, 'acceso-escritorio.png'), path.join(review, 'desktop.png'));
    await page.getByRole('button', { name: 'Usar tema oscuro' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByRole('button', { name: 'Ingresar al Sistema' })).toHaveCSS('background-color', 'rgb(242, 206, 53)');
    await capture('acceso-oscuro');
    fs.copyFileSync(path.join(qa, 'acceso-oscuro.png'), path.join(review, 'desktop-dark.png'));
    await page.getByRole('button', { name: 'Usar tema claro' }).click();
    await expect(page.getByRole('button', { name: 'Ingresar al Sistema' })).toHaveCSS('background-color', 'rgb(38, 82, 59)');

    await page.getByLabel('Contraseña', { exact: true }).fill('ClavePrueba9');
    await page.getByRole('button', { name: 'Mostrar contraseña', exact: true }).click();
    await expect(page.getByLabel('Contraseña', { exact: true })).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Ocultar contraseña', exact: true }).click();
    await expect(page.getByLabel('Contraseña', { exact: true })).toHaveAttribute('type', 'password');
    await page.getByLabel('Contraseña', { exact: true }).clear();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(fruit).not.toBeVisible();
    await noOverflow();
    await capture('acceso-movil');
    fs.copyFileSync(path.join(qa, 'acceso-movil.png'), path.join(review, 'mobile.png'));
    await page.getByRole('button', { name: 'Usar tema oscuro' }).click();
    await capture('acceso-movil-oscuro');
    fs.copyFileSync(path.join(qa, 'acceso-movil-oscuro.png'), path.join(review, 'mobile-dark.png'));
    await page.getByRole('button', { name: 'Usar tema claro' }).click();
    await page.setViewportSize({ width: 375, height: 812 });
    await noOverflow();
    await page.setViewportSize({ width: 844, height: 390 });
    await noOverflow();
    await expect(page.getByRole('button', { name: 'Ingresar al Sistema' })).toBeVisible();
    await page.setViewportSize({ width: 768, height: 1024 });
    await noOverflow();
    await capture('acceso-tablet');
    await page.setViewportSize({ width: 390, height: 844 });

    await context.route('**/api/auth/providers', route => route.fulfill({ json: { credentials: { id: 'credentials', name: 'Credentials', type: 'credentials', signinUrl: base + '/api/auth/signin/credentials', callbackUrl: base + '/api/auth/callback/credentials' } } }));
    await context.route('**/api/auth/csrf', route => route.fulfill({ json: { csrfToken: 'interface-test' } }));
    await context.route('**/api/auth/callback/credentials', route => route.fulfill({ status: 401, json: { url: base + '/login?error=CredentialsSignin' } }));
    await page.getByLabel('Correo electrónico').fill('prueba-interfaz@example.test');
    await page.getByLabel('Contraseña', { exact: true }).fill('ErrorPrueba9');
    await page.getByRole('button', { name: 'Ingresar al Sistema' }).click();
    await expect(page.locator('#login-error')).toContainText('Correo o contraseña incorrectos');
    await expect(page.locator('#login-error')).toBeFocused();
    await capture('acceso-error');

    await page.goto(base + '/recuperar');
    await noOverflow();
    await capture('recuperacion-movil');
    await context.route('**/api/auth/recuperar', route => route.fulfill({ status: 503, json: { error: 'No disponible' } }));
    await page.getByLabel('Correo electrónico').fill('prueba-interfaz@example.test');
    await page.getByRole('button', { name: 'Enviar enlace de recuperación' }).click();
    await expect(page.locator('#recovery-error')).toContainText('No se pudo solicitar');
    await expect(page.getByRole('heading', { name: 'Revisa tu correo' })).toHaveCount(0);
    await context.unroute('**/api/auth/recuperar');
    await context.route('**/api/auth/recuperar', route => route.fulfill({ status: 200, json: { ok: true } }));
    await page.getByRole('button', { name: 'Enviar enlace de recuperación' }).click();
    await expect(page.getByRole('heading', { name: 'Revisa tu correo' })).toBeVisible();
    await expect(page.getByRole('status')).toBeFocused();
    await capture('recuperacion-confirmacion');

    await page.goto(base + '/recuperar/reset');
    await expect(page.getByRole('heading', { name: 'Necesitas un nuevo enlace' })).toBeVisible();
    await page.goto(base + '/recuperar/reset#token=solo-prueba-de-interfaz');
    await noOverflow();
    await capture('nueva-clave-movil');
    let resetRequests = 0;
    await context.route('**/api/auth/reset', route => {
      resetRequests++;
      return route.fulfill({ status: 400, json: { error: 'El enlace ha expirado. Solicita uno nuevo.' } });
    });
    await page.getByLabel('Nueva contraseña', { exact: true }).fill('NuevaClave-Prueba-2026');
    await page.getByLabel('Confirmar contraseña', { exact: true }).fill('OtraClave-Prueba-2026');
    await page.getByRole('button', { name: 'Guardar contraseña' }).click();
    await expect(page.locator('#reset-error')).toContainText('no coinciden');
    assert.equal(resetRequests, 0, 'No enviar contraseñas distintas al servidor');
    await page.getByLabel('Confirmar contraseña', { exact: true }).fill('NuevaClave-Prueba-2026');
    await page.getByRole('button', { name: 'Guardar contraseña' }).click();
    await expect(page.locator('#reset-error')).toContainText('ha expirado');
    assert.equal(resetRequests, 1);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(base + '/login');
    await expect(activeFact).toContainText('El amarillo de la madurez.');
    const reducedFact = await activeFact.textContent();
    await page.clock.fastForward(20000);
    await expect(activeFact).toHaveText(reducedFact);
    assert.equal(await page.locator('img[src*="pitahaya"]').evaluate(el => getComputedStyle(el).animationName), 'none');
    await capture('acceso-movimiento-reducido');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 821, height: 790 });
    await page.goto(base + '/login');
    await noOverflow();
    await capture('acceso-navegador-integrado');
    if (prototype3D) await expect(model).toHaveAttribute('data-state', 'ready', { timeout: 30000 });
    await expect(page.locator('canvas')).toHaveCount(prototype3D ? 1 : 0);
    if (prototype3D) await expect(fruit).not.toBeVisible();
    else await expect(fruit).toBeVisible();
    assert.ok(await page.locator('img[src*="pitahaya"]').evaluate(image => image.naturalWidth >= 380), 'La imagen compacta debe recibir resolución suficiente');
    await expect(page.getByRole('button', { name: 'Ingresar al Sistema' })).toBeVisible();
    await page.setViewportSize({ width: 857, height: 790 });
    await page.getByRole('button', { name: 'Usar tema oscuro' }).click();
    await noOverflow();
    await capture('acceso-usuario-857');
    fs.copyFileSync(path.join(qa, 'acceso-usuario-857.png'), path.join(review, 'user-857.png'));
    if (prototype3D) await page.getByTestId('pitahaya-canvas').evaluate(canvas => canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect(fruit).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ingresar al Sistema' })).toBeVisible();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await capture('acceso-alternativa-estatica');
    if (prototype3D) {
      let missingModelRequests = 0;
      await context.route('**/brand/pitahaya-amarilla-20261014.glb', route => {
        missingModelRequests++;
        return route.fulfill({ status: 404, body: 'Recurso no disponible' });
      });
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.goto(base + '/login');
      await expect.poll(() => missingModelRequests).toBeGreaterThan(0);
      await expect(page.locator('canvas')).toHaveCount(0);
      await expect(fruit).toBeVisible();
      await expect(page.getByRole('button', { name: 'Ingresar al Sistema' })).toBeVisible();
    } else assert.equal(modelRequests.length, 0, 'El acceso fotorealista no descarga el GLB experimental');
    assert.deepEqual(errors, [], 'Sin errores de ejecución en las pantallas de acceso');
    console.log('Acceso verificado: temas, vistas, contraseña, errores, recuperación, suspensión y movimiento reducido. Escena: ' + (prototype3D ? '3D experimental con giro y alternativas ante fallos.' : 'imagen fotorealista sin descarga del GLB.'));
  } finally {
    await context.close();
    if (!suppliedBrowser) await browser.close();
  }
};

if (require.main === module) {
  module.exports(process.argv[2] || 'http://127.0.0.1:3101').catch(error => { console.error(error); process.exitCode = 1; });
}
