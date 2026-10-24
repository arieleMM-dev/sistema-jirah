const path=require('node:path');
const fs=require('node:fs');
const {chromium,expect}=require('@playwright/test');
const {randomUUID}=require('node:crypto');
const bcrypt=require('bcryptjs');
const {encode}=require('next-auth/jwt');

module.exports=async function({base,prisma,assert,admin}) {
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    // Repetir en sesiones nuevas detecta la carrera entre navegar y refrescar tras el login.
    for(let attempt=0;attempt<3;attempt++) {
      const loginContext=await browser.newContext();
      try {
        const loginPage=await loginContext.newPage();
        await loginPage.goto(base+'/login');
        await loginPage.getByLabel('Correo electrónico').fill(admin.email);
        await loginPage.getByLabel('Contraseña',{exact:true}).fill('PruebaAdmin9');
        await loginPage.getByRole('button',{name:'Ingresar al Sistema'}).click();
        await expect(loginPage).toHaveURL(base+'/dashboard');
        await expect(loginPage.getByRole('heading',{name:/Bienvenido/})).toBeVisible();
      } finally { await loginContext.close(); }
    }
    await require('./auth-ui-cases.cjs')(base,browser);
    await require('./registro-browser-cases.cjs')({base,prisma,browser,admin,assert});
  } catch (error) {
    await browser.close();
    throw error;
  }
  const context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
  let page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const worker=await prisma.user.create({data:{email:randomUUID()+'@example.test',cedula:randomUUID(),nombres:'Campo',apellidos:'Navegador',rol:'AGRICULTOR_CLASIFICADOR',passwordHash:await bcrypt.hash('PruebaCampo9',4)}});
  const camp=await prisma.campana.create({data:{codigo:'BROWSER-'+randomUUID().slice(0,8),nombre:'Prueba navegador',funda:'ROJA'}});
  const lote=await prisma.lote.create({data:{codigo:'BROWSER-'+randomUUID().slice(0,8),nombre:'Lote navegador'}});
  const comprador=await prisma.comprador.create({data:{nombre:'BROWSER Exportador',tipo:'EXPORTADOR'}});
  const mayorista=await prisma.comprador.create({data:{nombre:'BROWSER Mayorista',tipo:'MAYORISTA'}});
  const qa=path.join(__dirname,'../prisma/backups/browser-qa');fs.mkdirSync(qa,{recursive:true});
  try {
    await page.goto(base+'/login');
    await page.getByLabel('Correo electrónico').fill(worker.email);await page.getByLabel('Contraseña',{exact:true}).fill('PruebaCampo9');
    await page.getByRole('button',{name:'Ingresar al Sistema'}).click();
    await expect(page.getByRole('heading',{name:'Registrar Cosecha'})).toBeVisible();
    await expect(page.getByLabel('Campaña')).toContainText(camp.codigo);
    await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
    await expect.poll(()=>page.evaluate(()=>navigator.serviceWorker.controller!==null)).toBe(true);
    await expect(page.getByText('Listo para trabajar sin conexión',{exact:true})).toBeVisible({timeout:45000});
    const initialTheme=(await prisma.user.findUnique({where:{id:worker.id}})).tema;
    await expect.poll(()=>page.evaluate(id=>localStorage.getItem('jirah-tema-cuenta:'+id),worker.id)).toBe(initialTheme);
    // Preparación automática: no hace falta visitar manualmente las otras pantallas.
    await context.setOffline(true);
    await page.getByRole('button',{name:'Abrir menú'}).click();
    await page.getByTitle('Alternar Tema',{exact:true}).click();
    assert.equal((await prisma.user.findUnique({where:{id:worker.id}})).tema,initialTheme,'El cambio sin señal todavía no modifica el servidor');
    assert.notEqual(await page.evaluate(id=>localStorage.getItem('jirah-tema-pendiente:'+id),worker.id),null);
    await page.getByRole('link',{name:'Clasificación',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Clasificación por jornada y lote'})).toBeVisible();
    await context.setOffline(false);await page.goto(base+'/dashboard/campo/pesaje');
    await expect.poll(async()=>(await prisma.user.findUnique({where:{id:worker.id}})).tema).toBe(initialTheme==='OSCURO'?'CLARO':'OSCURO');
    await expect.poll(()=>page.evaluate(id=>localStorage.getItem('jirah-tema-pendiente:'+id),worker.id)).toBe(null);
    await page.getByRole('button',{name:'Abrir menú'}).click();
    await page.getByRole('link',{name:'Clasificación',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Clasificación por jornada y lote'})).toBeVisible();
    await page.getByRole('button',{name:'Abrir menú'}).click();await page.getByRole('link',{name:'Pendientes',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Registros pendientes de confirmación'})).toBeVisible();
    await page.getByRole('button',{name:'Abrir menú'}).click();await page.getByRole('link',{name:'Pesaje Bruto',exact:true}).click();
    await expect(page.getByLabel('Campaña')).toContainText(camp.codigo);
    await expect.poll(()=>page.evaluate(()=>localStorage.getItem('jirah-sesion-campo'))).not.toBeNull();
    // La PWA guarda páginas visitadas en segundo plano; esperar esa preparación antes de cortar la red.
    await expect.poll(()=>page.evaluate(async()=>{
      const cache=await caches.open('jirah-campo-pages-v1');
      const ready=await Promise.all(['pesaje','clasificacion','pendientes'].map(async route=>{
        const response=await cache.match('/dashboard/campo/'+route);
        return !!response?.ok;
      }));
      return ready.every(Boolean);
    })).toBe(true);
    // Wi-Fi aparente sin servidor de sesiones: la identidad local no se pierde ni se renueva.
    const state=await context.storageState();
    const cachedIdentity=await page.evaluate(()=>localStorage.getItem('jirah-sesion-campo'));
    const validatedAt=JSON.parse(cachedIdentity).validatedAt;
    const intermittent=await browser.newContext({storageState:state,serviceWorkers:'block'});
    try {
      await intermittent.route('**/api/auth/session',route=>route.fulfill({status:503,contentType:'application/json',body:'{}'}));
      const fallback=await intermittent.newPage();
      await fallback.clock.install({time:new Date(validatedAt+9*3600_000)});
      await fallback.goto(base+'/dashboard/campo/pesaje');
      assert.equal(await fallback.evaluate(()=>navigator.onLine),true);
      await expect(fallback.getByRole('heading',{name:'Registrar Cosecha'})).toBeVisible();
      assert.equal(await fallback.evaluate(()=>localStorage.getItem('jirah-sesion-campo')),cachedIdentity);
      await fallback.clock.setSystemTime(new Date(validatedAt+7*24*3600_000+1));
      await fallback.reload();
      await expect(fallback.getByRole('heading',{name:'Iniciar Sesión'})).toBeVisible();
    } finally { await intermittent.close(); }
    // Reabrir con respuestas de seis días reproduce la regresión de la caché de 24 horas.
    await page.evaluate(async()=>{
      const cache=await caches.open('jirah-campo-pages-v1');
      for(const req of await cache.keys()){
        const response=await cache.match(req),headers=new Headers(response.headers);
        headers.set('Date',new Date(Date.now()-6*24*3600_000).toUTCString());
        await cache.put(req,new Response(await response.arrayBuffer(),{status:response.status,statusText:response.statusText,headers}));
      }
    });
    await context.setOffline(true);await page.reload();
    await expect(page.getByRole('heading',{name:'Registrar Cosecha'})).toBeVisible();
    await page.getByLabel('Campaña').selectOption(camp.id);await page.getByLabel('Lote',{exact:true}).selectOption(lote.id);
    await page.getByLabel('Número de gavetas').fill('2');await page.getByLabel('Peso bruto total').fill('23.4');
    await page.getByRole('button',{name:'Confirmar Cosecha'}).click();
    await expect(page.getByText('Pesaje guardado en este dispositivo.',{exact:false})).toBeVisible();
    await page.getByRole('button',{name:'Abrir menú'}).click();await page.getByRole('link',{name:'Clasificación',exact:true}).click();
    await page.getByRole('button').filter({hasText:lote.codigo}).click();
    await page.getByLabel('Gavetas G',{exact:true}).fill('1');await page.getByLabel('Peso bruto G',{exact:true}).fill('21.7');
    await page.getByRole('button',{name:'Guardar clasificación de la jornada'}).click();
    await expect(page.getByRole('button').filter({hasText:lote.codigo})).toContainText('pendiente de sincronizar');
    await page.getByRole('button',{name:'Abrir menú'}).click();await page.getByRole('link',{name:'Pendientes',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Pesajes (1)',exact:true})).toBeVisible();
    await expect(page.getByRole('heading',{name:'Clasificaciones (1)',exact:true})).toBeVisible();
    const sessionCookie=(await context.cookies()).find(c=>c.name==='next-auth.session-token');
    assert.ok(sessionCookie);
    const expired=await encode({secret:process.env.NEXTAUTH_SECRET,maxAge:-60,token:{id:worker.id,sessionVersion:0}});
    await context.addCookies([{...sessionCookie,value:expired}]);
    // Reabrir desde el inicio instalado, sin pestaña previa y sin red, conserva identidad y cola.
    await page.close();
    page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../public/manifest.json'),'utf8'));
    await page.goto(base+manifest.start_url);
    await expect(page.getByRole('heading',{name:'Registrar Cosecha'})).toBeVisible();
    await page.getByRole('button',{name:'Abrir menú'}).click();await page.getByRole('link',{name:'Pendientes',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Pesajes (1)',exact:true})).toBeVisible();
    await expect(page.getByRole('heading',{name:'Clasificaciones (1)',exact:true})).toBeVisible();
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);assert.equal(overflow,false,'La captura móvil no debe desbordar la pantalla');
    await page.screenshot({path:path.join(qa,'pendientes-movil.png'),fullPage:true});
    await context.setOffline(false);
    await expect(page.getByRole('heading',{name:'Iniciar Sesión'})).toBeVisible({timeout:20000});
    const retained=await page.evaluate(async()=>{
      const db=await new Promise((resolve,reject)=>{const req=indexedDB.open('finca-jirah-db');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
      try { return await Promise.all(['pesajes','clasificaciones'].map(store=>new Promise((resolve,reject)=>{const req=db.transaction(store).objectStore(store).count();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);}))); }
      finally { db.close(); }
    });
    assert.deepEqual(retained,[1,1],'Vencer la sesión no elimina pendientes');
    assert.equal(await prisma.pesajeBruto.count({where:{campanaId:camp.id}}),0,'JWT vencido no envía la cola');
    await page.getByLabel('Correo electrónico').fill(worker.email);await page.getByLabel('Contraseña',{exact:true}).fill('PruebaCampo9');
    await page.getByRole('button',{name:'Ingresar al Sistema'}).click();
    await expect(page.getByRole('heading',{name:'Registrar Cosecha'})).toBeVisible();
    await page.getByRole('button',{name:'Abrir menú'}).click();await page.getByRole('link',{name:'Pendientes',exact:true}).click();
    await expect(page.getByText('No tiene registros pendientes en este dispositivo.')).toBeVisible({timeout:20000});
    const stored=await prisma.jornadaCosecha.findFirst({where:{campanaId:camp.id,loteId:lote.id},include:{pesajes:true,clasificacion:{include:{detalles:true}}}});
    assert.equal(stored.pesajes.length,1);assert.equal(stored.clasificacion.totalClasificado,20);assert.equal(stored.estado,'CLASIFICADA');
    await page.goto(base+'/dashboard/reportes');
    await expect(page).toHaveURL(base+'/dashboard/campo/pesaje');
    await page.getByRole('button',{name:'Abrir menú'}).click();await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Iniciar Sesión'})).toBeVisible();
    await page.getByLabel('Correo electrónico').fill(admin.email);await page.getByLabel('Contraseña',{exact:true}).fill('PruebaAdmin9');await page.getByRole('button',{name:'Ingresar al Sistema'}).click();
    await expect(page.getByRole('heading',{name:/Bienvenido/}).first()).toBeVisible();
    await page.goto(base+`/dashboard/reportes?campanaId=${camp.id}`);
    await expect(page.getByText('Categorías originales',{exact:true})).toBeVisible();
    const fueraDePantalla=()=>page.locator('input,select,textarea').evaluateAll(elements=>elements.filter(el=>{const r=el.getBoundingClientRect();return r.height>0&&(r.right>innerWidth+1||r.left<0);}).map(el=>el.outerHTML.slice(0,180)));
    assert.deepEqual(await fueraDePantalla(),[],'Los filtros deben caber en la pantalla móvil');
    const saved={};
    for(const format of ['CSV','XLSX','PDF']) {
      const download=page.waitForEvent('download');await page.getByRole('button',{name:`Descargar ${format}`,exact:true}).click();
      const file=await download;const destination=path.join(process.env.JIRAH_TEST_DIRECTORY,'reporte.'+format.toLowerCase());await file.saveAs(destination);saved[format]=destination;
      assert.ok(fs.statSync(destination).size>100);
    }
    assert.match(fs.readFileSync(saved.CSV,'utf8'),new RegExp(camp.codigo));
    const {Workbook}=require('exceljs');const workbook=new Workbook();await workbook.xlsx.readFile(saved.XLSX);
    assert.equal(workbook.getWorksheet('Pesajes').rowCount,2);assert.ok(workbook.getWorksheet('Cuadre con formulas'));
    assert.match(fs.readFileSync(saved.PDF).subarray(0,5).toString(),/^%PDF/);
    await page.screenshot({path:path.join(qa,'reporte-movil.png'),fullPage:true});
    await page.goto(base+'/dashboard/comercial');await expect(page.getByRole('heading',{name:'Nueva entrega'})).toBeVisible();
    await page.getByLabel('Comprador',{exact:true}).selectOption(comprador.id);
    await page.getByLabel('Tara de entrega (kg/gaveta)',{exact:true}).fill('2');
    await page.getByLabel('Origen 1',{exact:true}).selectOption('c:'+stored.clasificacion.id+':G');
    await page.getByLabel('Gavetas entrega 1',{exact:true}).fill('2');await page.getByLabel('Bruto entrega 1',{exact:true}).fill('24');
    await page.getByRole('button',{name:'Registrar entrega',exact:true}).click();
    await expect(page.getByText('Operación confirmada por el servidor.',{exact:true})).toBeVisible();
    const delivery=await prisma.entrega.findFirst({where:{compradorId:comprador.id},include:{detalles:true}});assert.equal(delivery.detalles[0].pesoNetoKg,20);
    await page.getByLabel('Entrega',{exact:true}).selectOption(delivery.id);
    await page.getByLabel('Gavetas devueltas',{exact:true}).fill('1');await page.getByLabel('Bruto devuelto (kg)',{exact:true}).fill('6.7');
    await page.getByLabel('Motivo',{exact:true}).fill('Rechazo pesado al volver a finca');await page.getByRole('button',{name:'Registrar devolución',exact:true}).click();
    await expect.poll(async()=>prisma.devolucion.count({where:{entregaId:delivery.id}})).toBe(1);
    const returned=await prisma.devolucion.findFirst({where:{entregaId:delivery.id}});assert.equal(returned.pesoNetoKg,5);assert.equal(returned.detalleOrigenId,null);
    await page.getByLabel('Comprador',{exact:true}).selectOption(mayorista.id);
    await expect(page.getByLabel('Origen 1',{exact:true})).toContainText(returned.id.slice(0,8));
    await page.getByLabel('Origen 1',{exact:true}).selectOption('r:'+returned.id+':N2');
    await page.getByLabel('Tara de entrega (kg/gaveta)',{exact:true}).fill('1.7');
    await page.getByLabel('Gavetas entrega 1',{exact:true}).fill('1');await page.getByLabel('Bruto entrega 1',{exact:true}).fill('6.7');
    await page.getByRole('button',{name:'Registrar entrega',exact:true}).click();
    await expect.poll(async()=>prisma.detalleEntrega.count({where:{devolucionId:returned.id}})).toBe(1);
    const resale=await prisma.detalleEntrega.findFirst({where:{devolucionId:returned.id}});
    const originalHistory=page.locator(`[data-entrega-id="${delivery.id}"]`);
    await originalHistory.locator(':scope > summary').click();await originalHistory.getByText('Anular entrega',{exact:true}).click();
    const originalForm=originalHistory.locator('form').first();
    await originalForm.getByLabel('Motivo de anulación',{exact:true}).fill('Conciliación comprobada del movimiento original');
    await originalForm.getByLabel('Confirmo la anulación de este movimiento',{exact:true}).check();
    await originalForm.getByRole('button',{name:'Confirmar anulación',exact:true}).click();
    await expect(originalForm.getByRole('alert')).toContainText('Primero anule');
    const resaleHistory=page.locator(`[data-entrega-id="${resale.entregaId}"]`);
    await resaleHistory.locator(':scope > summary').click();await resaleHistory.getByText('Anular entrega',{exact:true}).click();
    const resaleForm=resaleHistory.locator('form').first();
    await resaleForm.getByLabel('Motivo de anulación',{exact:true}).fill('Anulación de reventa para conciliar origen');
    await resaleForm.getByLabel('Confirmo la anulación de este movimiento',{exact:true}).check();await resaleForm.getByRole('button',{name:'Confirmar anulación',exact:true}).click();
    await expect(resaleHistory.locator(':scope > summary')).toContainText('ANULADA');
    const returnedHistory=originalHistory.locator(`[data-devolucion-id="${returned.id}"]`);
    await returnedHistory.getByText('Anular devolución',{exact:true}).click();
    await returnedHistory.getByLabel('Motivo de anulación',{exact:true}).fill('Anulación del retorno para conciliar entrega');
    await returnedHistory.getByLabel('Confirmo la anulación de este movimiento',{exact:true}).check();await returnedHistory.getByRole('button',{name:'Confirmar anulación',exact:true}).click();
    await expect.poll(async()=>prisma.anulacionComercial.count({where:{devolucionId:returned.id}})).toBe(1);
    await originalForm.getByRole('button',{name:'Confirmar anulación',exact:true}).click();
    await expect(originalHistory.locator(':scope > summary')).toContainText('ANULADA');
    const reportResponse=await page.request.get(base+`/api/reportes/cosecha?campanaId=${camp.id}`);const report=await reportResponse.json();
    assert.equal(report.comercial.exportacionAjustada,20);assert.equal(report.comercial.nacionalAjustada,0);
    assert.ok(report.entregas.every(e=>e.anulacion));
    const {PesajeService}=require('../lib/services/pesaje.service.ts'),{JornadaService}=require('../lib/services/jornada.service.ts'),{JornadaRepo}=require('../lib/repositories/JornadaRepository.ts');
    const correctionCamp=await prisma.campana.create({data:{codigo:'CORR-'+randomUUID().slice(0,8),nombre:'Corrección navegador',funda:'AZUL'}});
    const correctionPesaje=await PesajeService.registrar({campanaId:correctionCamp.id,loteId:lote.id,agricultorId:worker.id,numGavetas:1,pesoBrutoKg:21.7});
    let correctionJornada=await JornadaRepo.findById(correctionPesaje.jornadaId);
    await JornadaService.clasificar({id:randomUUID(),jornadaId:correctionJornada.id,version:correctionJornada.version,pesajeIds:[correctionPesaje.id],timestamp:correctionPesaje.fechaRegistro.toISOString(),detalles:['G','P','N1','N2','N3'].map(categoria=>({categoria,numGavetas:categoria==='G'?1:0,pesoBrutoKg:categoria==='G'?21.7:0}))},worker.id);
    await page.goto(base+'/dashboard/campo/clasificacion');
    await expect(page.getByRole('heading',{name:/Jornadas registradas/})).toBeVisible();
    for(let p=2;p<=5&&await page.getByRole('button').filter({hasText:correctionCamp.codigo}).count()===0;p++){
      await expect(page.getByRole('navigation',{name:'Paginación de jornadas'})).toBeVisible();
      await page.getByRole('navigation',{name:'Paginación de jornadas'}).getByRole('button',{name:'Siguiente',exact:true}).click();
      await expect(page.getByRole('heading',{name:/Jornadas registradas/})).toBeVisible();
      await expect(page.getByRole('navigation',{name:'Paginación de jornadas'}).getByText(new RegExp(`Página ${p} de`))).toBeVisible();
    }
    await page.getByRole('button').filter({hasText:correctionCamp.codigo}).click();
    await page.getByText('Corregir jornada cerrada',{exact:true}).click();
    await page.getByLabel('Bruto pesaje 1 (kg)',{exact:true}).fill('23.7');
    await page.getByLabel('Motivo obligatorio',{exact:true}).fill('Corrección comprobada en finca');
    await page.getByRole('button',{name:'Guardar corrección con historial',exact:true}).click();
    await expect(page.getByText('Historial de correcciones (1)',{exact:true})).toBeVisible();
    await page.getByLabel('Motivo de aprobación',{exact:true}).fill('Pesaje corregido y diferencia revisada');
    const approvalResponse=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/campo/jornadas/aprobaciones'&&response.request().method()==='POST');
    await page.getByRole('button',{name:'Aprobar descuadre',exact:true}).click();
    const approved=await approvalResponse;
    assert.equal(approved.ok(),true,'La aprobación debe confirmarse antes de consultar la base de pruebas: '+await approved.text());
    assert.equal((await prisma.jornadaCosecha.findUnique({where:{id:correctionJornada.id}})).estado,'APROBADA');
    assert.equal(await prisma.revisionJornada.count({where:{jornadaId:correctionJornada.id}}),1);
    const operationQA=path.join(qa,'operacion-20261022');fs.mkdirSync(operationQA,{recursive:true});
    const captureOperation=async name=>{await page.evaluate(()=>document.fonts.ready);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:path.join(operationQA,name+'.png'),fullPage:true,animations:'disabled'});};
    await captureOperation('clasificacion-mobile');await page.setViewportSize({width:1440,height:1000});await captureOperation('clasificacion-desktop');await page.setViewportSize({width:390,height:844});
    await page.goto(base+'/dashboard/comercial');await expect(page.getByRole('heading',{name:'Nueva entrega'})).toBeVisible();
    await page.screenshot({path:path.join(qa,'comercial-movil.png'),fullPage:true});
    assert.deepEqual(await fueraDePantalla(),[],'Los formularios comerciales deben caber en móvil');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1),false,'El flujo comercial debe caber en móvil');
    await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:path.join(qa,'comercial-escritorio.png'),fullPage:true});
    await page.goto(base+'/dashboard/perfil');await page.getByRole('button',{name:'Preferencias',exact:true}).click();
    await captureOperation('preferencias-desktop');await page.setViewportSize({width:390,height:844});await captureOperation('preferencias-mobile');
    await page.goto(base+'/dashboard/catalogos/compradores');await page.getByRole('cell',{name:'BROWSER Exportador',exact:true}).click();
    await expect(page.getByText('Cuadre de cosecha: ±4 %',{exact:true})).toBeVisible();await captureOperation('comprador-mobile');await page.setViewportSize({width:1440,height:1000});await captureOperation('comprador-desktop');
    assert.deepEqual(errors,[],'No debe haber excepciones de ejecución en el navegador');
  } catch(error) {
    await page.screenshot({path:path.join(qa,'fallo.png'),fullPage:true}).catch(()=>{});
    throw new Error(`${error.message}\nURL: ${page.url()}\nErrores: ${errors.join('; ')}\nVista: ${(await page.locator('body').innerText().catch(()=>'' )).slice(0,2500)}`,{cause:error});
  } finally {await context.close();await browser.close();}
};
