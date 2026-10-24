// Casos integrados en la misma base aislada que las pruebas de seguridad.
module.exports = function register({ test, assert, randomUUID, prisma, worker: getWorker, lote: getLote, PesajeService,
  JornadaService, JornadaRepo, JornadaController, SyncService, sessionModule, mock, request, authenticated,
  calcularClasificacion, fechaFinca, jornadaId, jornadasLocales }) {
  const categories = (g = { numGavetas: 1, pesoBrutoKg: 101.7 }) => ['G','P','N1','N2','N3'].map(categoria => ({ categoria,
    numGavetas: categoria === 'G' ? g.numGavetas : 0, pesoBrutoKg: categoria === 'G' ? g.pesoBrutoKg : 0 }));
  async function campaign() {
    return prisma.campana.create({ data: { codigo: randomUUID(), nombre: 'Jornada', funda: 'ROJA', taraBase: 1.7 } });
  }
  const timestamp = '2026-01-12T15:00:00.000Z';
  async function weigh(camp, overrides = {}) {
    return PesajeService.registrar({ campanaId: camp.id, loteId: getLote().id, agricultorId: getWorker().id,
      fechaRegistro: new Date(timestamp), pesoBrutoKg: 117, numGavetas: 10, ...overrides });
  }
  function input(j, detalles = categories()) {
    return { id: randomUUID(), jornadaId: j.id, version: j.version, pesajeIds: j.pesajes.map(p => p.id),
      timestamp, detalles };
  }

  test('migración aditiva conserva pesaje y clasificación históricos sin inventar jornadas', async () => {
    const p = await prisma.pesajeBruto.findUnique({ where: { id: 'legacy-pesaje' }, include: { clasificacion: true } });
    assert.equal(p.jornadaId, null); assert.equal(p.pesoNetoKg, 100);
    assert.equal(p.clasificacion.pesoExportacionKg, 80); assert.equal(p.clasificacion.pesoNacionalKg, 20);
    assert.equal((await prisma.campana.findUnique({ where: { id: 'legacy-camp' } })).minimoPGr, 180);
  });

  test('jornada agrupa varios responsables y gavetas; separa campaña, lote y fecha local', async () => {
    const camp = await campaign();
    const otherWorker = await prisma.user.create({ data: { email: randomUUID()+'@test.invalid', cedula: randomUUID(),
      nombres: 'Otra', apellidos: 'Persona', passwordHash: 'fixture', rol: 'AGRICULTOR' } });
    const a = await weigh(camp, { numGavetas: 1, pesoBrutoKg: 11.7 });
    const b = await weigh(camp, { numGavetas: 5, pesoBrutoKg: 58.5, agricultorId: otherWorker.id });
    assert.equal(a.jornadaId, b.jornadaId);
    const other = await weigh(camp, { fechaRegistro: new Date('2026-01-13T05:00:00Z') });
    assert.notEqual(a.jornadaId, other.jornadaId);
    assert.equal(fechaFinca(new Date('2026-01-13T04:59:59Z')), '2026-01-12');
    const anotherLot = await prisma.lote.create({ data: { codigo: randomUUID(), nombre: 'Otro' } });
    assert.notEqual((await weigh(camp, { loteId: anotherLot.id })).jornadaId, a.jornadaId);
    const j = (await JornadaService.listar()).jornadas.find(j => j.id === a.jornadaId);
    assert.equal(j.numGavetas, 6); assert.equal(j.pesoNetoKg, 60); assert.equal(j.pesajes.length, 2);
    const details = categories({ numGavetas: 2, pesoBrutoKg: 43.4 });
    details[1] = { categoria: 'P', numGavetas: 1, pesoBrutoKg: 21.7 };
    const result = await JornadaService.clasificar(input(j, details), getWorker().id);
    assert.equal(result.totalClasificado, 60); assert.equal(result.pesoExportacionKg, 60);
    assert.equal(result.detalles.length, 5);
    await assert.rejects(weigh(camp), /JORNADA_CERRADA/);
    assert.equal((await JornadaRepo.findById(j.id)).pesajes.length, 2);
    await assert.rejects(require('../lib/services/pesaje.service.ts').ClasificacionService.registrar({
      pesajeBrutoId: a.id, clasificadorId: getWorker().id, gavetasExportacion: 1, pesoExportacionBruto: 11.7,
      gavetasNacional: 0, pesoNacionalBruto: 0, pesoDescarte: 0, forzar: true }), /PESAJE_AGRUPADO/);
  });

  test('fórmula Excel conserva signo, divide por clasificado y decide antes del redondeo visual', () => {
    const d = categories({ numGavetas: 1, pesoBrutoKg: 1001.7 });
    assert.equal(calcularClasificacion(1040, 1.7, d).dentroDelMargen, true);
    assert.equal(calcularClasificacion(960, 1.7, d).dentroDelMargen, true);
    assert.equal(calcularClasificacion(1040.01, 1.7, d).dentroDelMargen, false);
    assert.equal(calcularClasificacion(959.99, 1.7, d).dentroDelMargen, false);
    const signed = calcularClasificacion(960, 1.7, d);
    assert.equal(signed.diferenciaKg, -40); assert.equal(signed.margenErrorPct, -4);
    const zero = categories({ numGavetas: 0, pesoBrutoKg: 0 });
    assert.throws(() => calcularClasificacion(0, 1.7, zero), /TOTAL_CLASIFICADO_CERO/);
    assert.throws(() => calcularClasificacion(100, 1.7, [...d.slice(0,4),d[0]]), /CATEGORIAS_INVALIDAS/);
    for (const invalid of [{numGavetas: 1.5,pesoBrutoKg: 12}, {numGavetas: 0,pesoBrutoKg: 10},
      {numGavetas: 1,pesoBrutoKg: NaN}, {numGavetas: 1,pesoBrutoKg: '12'}, {numGavetas: 1,pesoBrutoKg: 1}]) {
      assert.throws(() => calcularClasificacion(100,1.7,categories(invalid)));
    }
  });

  test('cinco categorías reproducen netos y porcentajes originales del Excel recibido', () => {
    const details = [ ['G',41,797.2],['P',56,971.1],['N1',15,280.8],['N2',14,248.8],['N3',9,166.3] ]
      .map(([categoria,numGavetas,pesoBrutoKg]) => ({categoria,numGavetas,pesoBrutoKg}));
    const result = calcularClasificacion(2245.5,1.7,details);
    assert.equal(result.totalClasificado,2234.7); assert.equal(result.pesoExportacionKg,1603.4);
    assert.equal(result.pesoNacionalKg,631.3); assert.equal(result.diferenciaKg,10.8);
    assert.equal(result.margenErrorPct.toFixed(2),'0.48');
    assert.equal((result.pesoExportacionKg/result.totalClasificado*100).toFixed(2),'71.75');
    assert.deepEqual(result.detalles.map(d=>d.pesoNetoKg),[727.5,875.9,255.3,225,151]);
    assert.equal(calcularClasificacion(311,1.7,categories({numGavetas:1,pesoBrutoKg:295.1})).dentroDelMargen,false);
  });

  test('snapshot incompleto o modificado no cierra una jornada; un ID confirmado no duplica', async () => {
    const camp = await campaign(); const p = await weigh(camp); const first = await JornadaRepo.findById(p.jornadaId);
    const payload = input(first);
    await weigh(camp);
    await assert.rejects(JornadaService.clasificar(payload,getWorker().id),/JORNADA_MODIFICADA/);
    assert.equal((await JornadaRepo.findById(p.jornadaId)).estado,'ABIERTA');
    const latest = await JornadaRepo.findById(p.jornadaId);
    const valid = input(latest,categories({numGavetas:2,pesoBrutoKg:203.4}));
    await assert.rejects(JornadaService.clasificar({...valid,pesajeIds:valid.pesajeIds.slice(1)},getWorker().id),/JORNADA_MODIFICADA/);
    await Promise.all([JornadaService.clasificar(valid,getWorker().id),JornadaService.clasificar(valid,getWorker().id)]);
    await JornadaService.clasificar(valid,getWorker().id);
    assert.equal(await prisma.clasificacionJornada.count({where:{jornadaId:latest.id}}),1);
    await assert.rejects(JornadaService.clasificar({...valid,observaciones:'Contenido distinto'},getWorker().id),/IDENTIDAD_CONFLICTIVA/);
    await assert.rejects(JornadaService.clasificar({...valid,id:randomUUID()},getWorker().id),/CLASIFICACION_EXISTENTE/);
  });

  test('dos responsables clasificando el mismo snapshot conservan solo la primera operación válida, sin sobrescritura', async () => {
    const camp = await campaign(); const p = await weigh(camp); const j = await JornadaRepo.findById(p.jornadaId);
    const other = await prisma.user.create({ data: { email: randomUUID()+'@test.invalid', cedula: randomUUID(), nombres: 'Segundo', apellidos: 'Dispositivo', passwordHash: 'fixture', rol: 'AGRICULTOR' } });
    const a = input(j), b = input(j, categories({ numGavetas: 1, pesoBrutoKg: 96.7 }));
    const attempts = await Promise.allSettled([JornadaService.clasificar(a, getWorker().id), JornadaService.clasificar(b, other.id)]);
    assert.equal(attempts.filter(r => r.status === 'fulfilled').length, 1);
    const rejected = attempts.find(r => r.status === 'rejected');
    assert.match(rejected.reason.message, /JORNADA_MODIFICADA|CLASIFICACION_EXISTENTE/);
    const winner = attempts[0].status === 'fulfilled' ? a : b;
    const loser = winner === a ? b : a;
    const stored = await JornadaRepo.findById(j.id);
    assert.equal(stored.clasificacion.id, winner.id);
    assert.equal(await prisma.clasificacionJornada.count({ where: { jornadaId: j.id } }), 1);
    await assert.rejects(JornadaService.clasificar(loser, winner === a ? other.id : getWorker().id), /CLASIFICACION_EXISTENTE/);
    assert.equal((await JornadaRepo.findById(j.id)).clasificacion.id, winner.id);
  });

  test('descuadre queda pendiente: solo administrador activo aprueba con motivo y sin sobrescribir evidencia', async () => {
    const camp = await campaign(); const p = await weigh(camp);
    const j = await JornadaRepo.findById(p.jornadaId);
    const result = await JornadaService.clasificar(input(j,categories({numGavetas:1,pesoBrutoKg:91.7})),getWorker().id);
    assert.equal(result.dentroDelMargen,false);
    const pending = await JornadaRepo.findById(j.id);
    assert.equal(pending.estado,'PENDIENTE_APROBACION');
    await assert.rejects(JornadaService.aprobar(j.id,pending.version,'Revisado en finca',getWorker().id),/APROBACION_NO_AUTORIZADA/);
    const actor = await prisma.user.create({data:{email:randomUUID()+'@test.invalid',cedula:randomUUID(),nombres:'Admin',apellidos:'Prueba',passwordHash:'fixture',rol:'ADMIN'}});
    assert.throws(()=>JornadaService.aprobar(j.id,pending.version,'',actor.id),/MOTIVO_REQUERIDO/);
    await prisma.user.update({where:{id:actor.id},data:{isActive:false}});
    await assert.rejects(JornadaService.aprobar(j.id,pending.version,'No debe aprobar',actor.id),/APROBACION_NO_AUTORIZADA/);
    await prisma.user.update({where:{id:actor.id},data:{isActive:true}});
    const approved = await JornadaService.aprobar(j.id,pending.version,'Diferencia revisada con el responsable',actor.id);
    assert.equal(approved.aprobadorId,actor.id); assert.ok(approved.fechaAprobacion);
    assert.equal(approved.dentroDelMargen,false); assert.equal(approved.totalClasificado,90);
    assert.equal((await JornadaRepo.findById(j.id)).estado,'APROBADA');
    await assert.rejects(JornadaService.aprobar(j.id,pending.version,'Otro motivo',actor.id),/NO_REQUIERE_APROBACION/);
    const sessionMock=mock.method(sessionModule,'getAuthenticatedSession',async()=>authenticated());
    try { assert.equal((await JornadaController.approve(request({jornadaId:j.id,version:pending.version,motivo:'Sin permiso'}))).status,403); }
    finally {sessionMock.mock.restore();}
  });

  test('sincronización v2 conserva fecha original, agrupación, cinco categorías e idempotencia', async () => {
    const camp = await campaign(); const actor=getWorker();
    const a={localId:randomUUID(),timestamp,agricultor_id:actor.id,campana_codigo:camp.id,lote_codigo:getLote().id,peso_bruto:11.7,num_gavetas:1,tara_base:1.7};
    const b={...a,localId:randomUUID(),peso_bruto:58.5,num_gavetas:5};
    await SyncService.registrarPesaje(a,actor.id); await SyncService.registrarPesaje(b,actor.id); await SyncService.registrarPesaje(a,actor.id);
    const j=await JornadaRepo.findById(jornadaId(camp.id,getLote().id,'2026-01-12'));
    assert.equal(j.version,2); assert.equal(j.pesajes.length,2);
    const payload={...input(j,categories({numGavetas:1,pesoBrutoKg:61.7})),localId:randomUUID(),clasificador_id:actor.id,versionFormato:2};
    await SyncService.registrarClasificacion(payload,actor.id); await SyncService.registrarClasificacion(payload,actor.id);
    const saved=await prisma.clasificacionJornada.findUnique({where:{id:payload.localId},include:{detalles:true}});
    assert.equal(saved.fechaRegistro.toISOString(),timestamp); assert.equal(saved.totalClasificado,60); assert.equal(saved.detalles.length,5);
    await assert.rejects(SyncService.registrarClasificacion({...payload,clasificador_id:'otra-cuenta'},actor.id),/otra cuenta/);
    const retained={...a,localId:randomUUID()};
    await assert.rejects(SyncService.registrarPesaje(retained,actor.id),/JORNADA_CERRADA/);
    assert.equal(await prisma.pesajeBruto.findUnique({where:{id:retained.localId}}),null);
  });

  test('captura de clasificación de otro día se rechaza; recepción tardía del mismo día se admite', async () => {
    const camp=await campaign(); const p=await weigh(camp); const j=await JornadaRepo.findById(p.jornadaId);
    await assert.rejects(JornadaService.clasificar({...input(j),timestamp:'2026-01-13T15:00:00Z'},getWorker().id),/MISMA_JORNADA/);
    await JornadaService.clasificar(input(j),getWorker().id);
  });

  test('captura y clasificación concurrentes no dejan pesajes fuera del total aprobado', async () => {
    const camp=await campaign(); const p=await weigh(camp); const j=await JornadaRepo.findById(p.jornadaId);
    await Promise.allSettled([weigh(camp),JornadaService.clasificar(input(j),getWorker().id)]);
    const stored=await JornadaRepo.findById(j.id);
    if (stored.clasificacion) {
      assert.equal(stored.pesajes.length,1); assert.equal(stored.clasificacion.pesoCosechadoKg,100);
      assert.equal(stored.estado,'CLASIFICADA');
    } else {
      assert.equal(stored.estado,'ABIERTA'); assert.equal(stored.pesajes.length,2);
    }
  });

  test('parámetros nuevos no reescriben los límites de una jornada ya iniciada', async () => {
    const camp=await campaign(); const a=await weigh(camp);
    const { CampanaService }=require('../lib/services/catalogo.service.ts');
    await CampanaService.actualizar(camp.id,{minimoPGr:190,minimoGGr:290,fechaNacimiento:'2025-09-01'});
    await weigh(camp);
    const b=await weigh(camp,{fechaRegistro:new Date('2026-01-13T15:00:00Z')});
    assert.equal((await JornadaRepo.findById(a.jornadaId)).minimoPGr,180);
    assert.equal((await JornadaRepo.findById(b.jornadaId)).minimoPGr,190);
    await assert.rejects(CampanaService.actualizar(camp.id,{minimoPGr:300,minimoGGr:290}),/PARAMETROS_INVALIDOS/);
    await assert.rejects(CampanaService.actualizar(camp.id,{fechaNacimiento:'2025-02-31'}),/FECHA_NACIMIENTO_INVALIDA/);
  });

  test('vista local agrupa pendientes propios, conserva snapshots y no duplica IDs ya confirmados', () => {
    const actor={id:'actor',nombres:'Campo',apellidos:'Prueba'};
    const context={userId:actor.id,campanas:[{id:'c',codigo:'C',nombre:'Campaña',taraBase:1.7,minimoPGr:180,minimoGGr:280}],lotes:[{id:'l',codigo:'L',nombre:'Lote'}]};
    const a={localId:'a',timestamp,agricultor_id:actor.id,campana_codigo:'c',lote_codigo:'l',peso_bruto:11.7,num_gavetas:1,tara_base:1.7};
    const list=jornadasLocales(context,[a,{...a,localId:'b',peso_bruto:58.5,num_gavetas:5},{...a,localId:'other',agricultor_id:'other'}],[],actor);
    assert.equal(list.length,1);assert.equal(list[0].pesoNetoKg,60);assert.equal(list[0].numGavetas,6);assert.equal(list[0].version,2);
    const again=jornadasLocales({...context,jornadas:list},[a],[],actor);
    assert.equal(again[0].version,2);assert.equal(again[0].pesajes.length,2);
    const pending=jornadasLocales({...context,jornadas:list},[],[{versionFormato:2,jornadaId:list[0].id,clasificador_id:actor.id}],actor);
    assert.equal(pending[0].pendienteLocal,true);
  });

  test('tablero cuenta un descuadre por jornada y respeta los filtros al aprobarlo', async () => {
    const camp=await campaign(); const p=await weigh(camp); await weigh(camp);
    const j=await JornadaRepo.findById(p.jornadaId);
    await JornadaService.clasificar(input(j,categories({numGavetas:1,pesoBrutoKg:181.7})),getWorker().id);
    const { DashboardRepo }=require('../lib/repositories/DashboardRepository.ts');
    let stats=await DashboardRepo.getStats({campanaId:camp.id});
    assert.equal(stats.kgTotal,200); assert.equal(stats.totalPesajes,2);
    assert.equal(stats.alertasMargen,1); assert.equal(stats.kgPorLote[0].alertas,1);
    assert.equal(stats.actividadReciente.every(p=>p.clasificacion.auditFlag),true);
    assert.equal((await DashboardRepo.getStats({campanaId:'otra-campana'})).alertasMargen,0);
    const admin=await prisma.user.create({data:{email:randomUUID()+'@test.invalid',cedula:randomUUID(),nombres:'Admin',apellidos:'Tablero',passwordHash:'fixture',rol:'ADMIN'}});
    const pending=await JornadaRepo.findById(j.id);
    await JornadaService.aprobar(j.id,pending.version,'Revisión del responsable en finca',admin.id);
    stats=await DashboardRepo.getStats({campanaId:camp.id});
    assert.equal(stats.alertasMargen,0); assert.equal(stats.kgPorLote[0].alertas,0);
    assert.equal(stats.actividadReciente.every(p=>p.clasificacion.auditFlag===false && p.clasificacion.dentroDelMargen===false),true);
  });

  test('reporte completo conserva más de ocho pesajes, categorías, históricos y pendientes sin falsear el cuadre', async () => {
    const { ReporteService }=require('../lib/services/reporte.service.ts');
    const { PesajeRepo }=require('../lib/repositories/PesajeRepository.ts');
    const camp=await campaign(); let first;
    for(let i=0;i<12;i++) first=await weigh(camp);
    const j=await JornadaRepo.findById(first.jornadaId);
    await JornadaService.clasificar(input(j,categories({numGavetas:1,pesoBrutoKg:1201.7})),getWorker().id);
    await weigh(camp,{fechaRegistro:new Date('2026-01-13T15:00:00Z')});
    await PesajeRepo.create({campanaId:camp.id,loteId:getLote().id,agricultorId:getWorker().id,fechaRegistro:new Date(timestamp),pesoBrutoKg:11.7,numGavetas:1,taraTotal:1.7,pesoNetoKg:10});
    const r=await ReporteService.obtener({campanaId:camp.id,fechaDesde:'2026-01-12',fechaHasta:'2026-01-13'});
    assert.equal(r.jornadas.length,2); assert.equal(r.jornadas.flatMap(j=>j.pesajes).length,13);
    assert.equal(r.totales.cosechado,1300); assert.equal(r.totales.cosechadoClasificado,1200);
    assert.equal(r.totales.totalClasificado,1200); assert.equal(r.totales.margenErrorPct,0);
    assert.equal(r.totales.jornadasPendientes,1); assert.equal(r.categorias[0].pesoNetoKg,1200);
    assert.equal(r.historicos.length,1); assert.equal(r.historicos[0].pesoNetoKg,10);
    assert.equal((await ReporteService.obtener({campanaId:camp.id,fechaHasta:'2026-01-12'})).jornadas.length,1);
    assert.equal((await ReporteService.obtener({campanaId:'sin-datos'})).totales.margenErrorPct,null);
    await assert.rejects(ReporteService.obtener({fechaDesde:'2026-02-31'}),/FILTROS_INVALIDOS/);
    await assert.rejects(ReporteService.obtener({fechaDesde:'2026-02-10',fechaHasta:'2026-01-10'}),/FILTROS_INVALIDOS/);
    const { filasReporte, csvSeguro }=require('../lib/reportes/filas.ts');
    const hojas=filasReporte(r);
    assert.equal(hojas.Pesajes.length,14); assert.equal(hojas.Categorias.length,6);
    assert.match(csvSeguro([['=1+1','a,"b"\nc',-4,null]]),/"'=1\+1","a,""b""\nc","-4",""/);
    const {Workbook}=require('exceljs'); const libro=new Workbook(); const hoja=libro.addWorksheet('Prueba'); hoja.addRow(['=1+1',42]);
    const bytes=await libro.xlsx.writeBuffer(); const leido=new Workbook(); await leido.xlsx.load(bytes);
    assert.equal(leido.worksheets[0].getCell('A1').value,'=1+1'); assert.equal(leido.worksheets[0].getCell('A1').formula,undefined); assert.equal(leido.worksheets[0].getCell('B1').value,42);
  });

  test('filtros temporales del tablero respetan la jornada de Ecuador hasta el último milisegundo', async () => {
    const { DashboardService }=require('../lib/services/dashboard.service.ts');
    const camp=await campaign();
    await weigh(camp,{fechaRegistro:new Date('2026-01-13T04:59:59.999Z')});
    await weigh(camp,{fechaRegistro:new Date('2026-01-13T05:00:00.000Z')});
    const stats=await DashboardService.getDashboardStats({campanaId:camp.id,fechaDesde:'2026-01-12',fechaHasta:'2026-01-12'});
    assert.equal(stats.totalPesajes,1); assert.equal(stats.kgTotal,100);
  });
};
