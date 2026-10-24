module.exports = function ({test, assert, randomUUID, prisma, PesajeService, JornadaService, JornadaRepo, SyncService, getWorker, getLote, mock}) {
  const {ComercialService}=require('../lib/services/comercial.service.ts');
  const {RevisionJornadaService}=require('../lib/services/revision-jornada.service.ts');
  const {AnulacionComercialService}=require('../lib/services/anulacion-comercial.service.ts');
  const {ReporteService}=require('../lib/services/reporte.service.ts');
  const {CampanaService}=require('../lib/services/catalogo.service.ts');
  test('catálogos conservan cultivo y variedad sin aceptar campos arbitrarios ni cambiar el cultivo de una cosecha',async()=>{
    const {LoteService}=require('../lib/services/catalogo.service.ts');
    const camp=await CampanaService.crear({codigo:randomUUID(),nombre:'Cultivo propio',funda:'Violeta',cultivo:'Pitahaya amarilla',isActive:false});
    assert.equal(camp.cultivo,'Pitahaya amarilla');assert.equal(camp.isActive,true);
    const lote=await LoteService.crear({codigo:randomUUID(),nombre:'Variedad propia',variedad:'Amarilla',isActive:false});
    assert.equal(lote.variedad,'Amarilla');assert.equal(lote.isActive,true);
    await PesajeService.registrar({campanaId:camp.id,loteId:lote.id,agricultorId:getWorker().id,numGavetas:1,pesoBrutoKg:11.7});
    await assert.rejects(CampanaService.actualizar(camp.id,{cultivo:'Otro cultivo'}),/CULTIVO_BLOQUEADO/);
    await assert.rejects(LoteService.crear({codigo:randomUUID(),nombre:'Inválido',hectareas:-1}),/DATOS_INVALIDOS/);
    await assert.rejects(CampanaService.crear({codigo:12,nombre:'Inválido',funda:'Azul'}),/DATOS_INVALIDOS/);
  });
  const cats=(g=100)=>['G','P','N1','N2','N3'].map(categoria=>({categoria,numGavetas:categoria==='G'?1:0,pesoBrutoKg:categoria==='G'?g+1.7:0}));
  async function setup() {
    const admin=await prisma.user.create({data:{email:randomUUID()+'@test.invalid',cedula:randomUUID(),nombres:'Admin',apellidos:'Comercial',passwordHash:'fixture',rol:'ADMIN'}});
    const comprador=await prisma.comprador.create({data:{nombre:'Exportador',tipo:'EXPORTADOR'}});
    const nacional=await prisma.comprador.create({data:{nombre:'Mayorista',tipo:'MAYORISTA'}});
    const camp=await prisma.campana.create({data:{codigo:randomUUID(),nombre:'Comercial',funda:'ROJA'}});
    const pesaje=await PesajeService.registrar({campanaId:camp.id,loteId:getLote().id,agricultorId:getWorker().id,fechaRegistro:new Date('2026-01-12T15:00:00Z'),numGavetas:1,pesoBrutoKg:101.7});
    const j=await JornadaRepo.findById(pesaje.jornadaId);
    const clasificacion=await JornadaService.clasificar({id:randomUUID(),jornadaId:j.id,version:j.version,pesajeIds:[pesaje.id],timestamp:'2026-01-12T15:00:00Z',detalles:cats()},getWorker().id);
    return {admin,comprador,nacional,camp,pesaje,jornada:await JornadaRepo.findById(j.id),clasificacion};
  }
  const entrega=(f,neto=100)=>({id:randomUUID(),compradorId:f.comprador.id,fecha:'2026-01-13',taraKg:2,detalles:[{clasificacionId:f.clasificacion.id,categoria:'G',numGavetas:1,pesoBrutoKg:neto+2}]});
  const devolucion=(e,neto=10)=>({id:randomUUID(),entregaId:e.id,fecha:'2026-01-14',taraKg:1.7,numGavetas:1,pesoBrutoKg:neto+1.7,motivo:'Rechazo reportado por comprador'});
  const anular=(movimientoId,tipo='ENTREGA')=>({id:randomUUID(),movimientoId,tipo,motivo:'Error de captura comprobado por administrador'});
  test('anulación exige administrador y motivo, conserva original, restaura saldo y es idempotente',async()=>{
    const f=await setup(),e=await ComercialService.entregar(entrega(f,60),f.admin.id),body=anular(e.id);
    await assert.rejects(AnulacionComercialService.anular(body,getWorker().id),/NO_AUTORIZADO/);
    await assert.rejects(AnulacionComercialService.anular({...body,motivo:''},f.admin.id),/MOTIVO_REQUERIDO/);
    await Promise.all([AnulacionComercialService.anular(body,f.admin.id),AnulacionComercialService.anular(body,f.admin.id)]);
    const audit=await prisma.anulacionComercial.findUnique({where:{id:body.id}});
    assert.equal(audit.responsableId,f.admin.id);assert.equal(JSON.parse(audit.antes).detalles[0].pesoNetoKg,60);
    assert.equal(await prisma.entrega.count({where:{id:e.id}}),1);assert.equal(await prisma.anulacionComercial.count({where:{entregaId:e.id}}),1);
    const context=await ComercialService.listar();assert.equal(context.disponibles.find(d=>d.clasificacionId===f.clasificacion.id).disponibleKg,100);
    await assert.rejects(AnulacionComercialService.anular({...body,motivo:'Otro motivo distinto'},f.admin.id),/IDENTIDAD_CONFLICTIVA/);
    await assert.rejects(ComercialService.devolver(devolucion(e),f.admin.id),/ENTREGA_INVALIDA/);
    await ComercialService.entregar(entrega(f,100),f.admin.id);
  });
  test('conciliación anula reventa, devolución y entrega en orden; reportes conservan historial sin afectar producción',async()=>{
    const f=await setup(),e=await ComercialService.entregar(entrega(f),f.admin.id),r=await ComercialService.devolver(devolucion(e,15),f.admin.id);
    const venta={id:randomUUID(),compradorId:f.nacional.id,fecha:'2026-01-15',taraKg:1.7,detalles:[{devolucionId:r.id,categoria:'N2',numGavetas:1,pesoBrutoKg:16.7}]};
    const reventa=await ComercialService.entregar(venta,f.admin.id);
    await assert.rejects(AnulacionComercialService.anular(anular(e.id),f.admin.id),/DEPENDENCIAS_ACTIVAS/);
    await assert.rejects(AnulacionComercialService.anular(anular(r.id,'DEVOLUCION'),f.admin.id),/DEPENDENCIAS_ACTIVAS/);
    await AnulacionComercialService.anular(anular(reventa.id),f.admin.id);
    assert.equal((await ComercialService.listar()).devoluciones.find(d=>d.id===r.id).disponibleKg,15);
    await AnulacionComercialService.anular(anular(r.id,'DEVOLUCION'),f.admin.id);
    await assert.rejects(ComercialService.entregar({...venta,id:randomUUID()},f.admin.id),/ORIGEN_INVALIDO/);
    let report=await ReporteService.obtener({campanaId:f.camp.id});assert.equal(report.comercial.exportacionAjustada,100);assert.equal(report.comercial.nacionalAjustada,0);
    await AnulacionComercialService.anular(anular(e.id),f.admin.id);
    report=await ReporteService.obtener({campanaId:f.camp.id});assert.equal(report.entregas.length,2);assert.equal(report.totales.cosechado,100);
    const {filasReporte}=require('../lib/reportes/filas.ts');const rows=filasReporte(report);assert.equal(rows.Anulaciones.length,4);assert.equal(rows.Entregas[1][16],'ANULADA: excluir de saldos');
    const current=await JornadaRepo.findById(f.jornada.id);
    await RevisionJornadaService.corregir({id:randomUUID(),jornadaId:current.id,version:current.version,motivo:'Corrección tras conciliar movimientos',pesajes:[{id:f.pesaje.id,numGavetas:1,pesoBrutoKg:101.7}],detalles:cats()},f.admin.id);
    assert.equal(await prisma.revisionJornada.count({where:{jornadaId:current.id}}),1);
  });
  test('anular una entrega mientras llega una devolución no deja una dependencia vigente sobre un movimiento anulado',async()=>{
    const f=await setup(),e=await ComercialService.entregar(entrega(f),f.admin.id);
    const result=await Promise.allSettled([AnulacionComercialService.anular(anular(e.id),f.admin.id),ComercialService.devolver(devolucion(e),f.admin.id)]);
    assert.equal(result.filter(r=>r.status==='fulfilled').length,1);
    const stored=await prisma.entrega.findUnique({where:{id:e.id},include:{anulacion:true,devoluciones:{include:{anulacion:true}}}});
    assert.ok(!stored.anulacion||stored.devoluciones.every(d=>d.anulacion));
  });
  test('anular una devolución y revenderla simultáneamente conserva el saldo y las dependencias',async()=>{
    const f=await setup(),e=await ComercialService.entregar(entrega(f),f.admin.id),r=await ComercialService.devolver(devolucion(e),f.admin.id);
    const result=await Promise.allSettled([AnulacionComercialService.anular(anular(r.id,'DEVOLUCION'),f.admin.id),ComercialService.entregar({id:randomUUID(),compradorId:f.nacional.id,fecha:'2026-01-15',taraKg:1.7,detalles:[{devolucionId:r.id,categoria:'N1',numGavetas:1,pesoBrutoKg:11.7}]},f.admin.id)]);
    assert.equal(result.filter(r=>r.status==='fulfilled').length,1);
    const stored=await prisma.devolucion.findUnique({where:{id:r.id},include:{anulacion:true,reventas:{include:{entrega:{include:{anulacion:true}}}}}});
    assert.ok(!stored.anulacion||stored.reventas.every(d=>d.entrega.anulacion));
  });
  test('entrega exige administrador, categoría compatible, neto positivo y saldo real; reintento no duplica',async()=>{
    const f=await setup(),body=entrega(f,60);
    await assert.rejects(ComercialService.entregar(body,getWorker().id),/NO_AUTORIZADO/);
    await assert.rejects(ComercialService.entregar({...body,compradorId:f.nacional.id},f.admin.id),/COMPRADOR_INVALIDO/);
    await assert.rejects(ComercialService.entregar(entrega(f,101),f.admin.id),/STOCK_INSUFICIENTE/);
    const e=await ComercialService.entregar(body,f.admin.id);
    assert.equal(e.detalles[0].pesoNetoKg,60); assert.equal(e.taraKg,2);
    await ComercialService.entregar(body,f.admin.id); assert.equal(await prisma.entrega.count({where:{id:e.id}}),1);
    await assert.rejects(ComercialService.entregar({...body,fecha:'2026-01-14'},f.admin.id),/IDENTIDAD_CONFLICTIVA/);
    assert.equal((await ComercialService.listar()).disponibles.find(d=>d.clasificacionId===f.clasificacion.id).disponibleKg,40);
  });
  test('dos entregas concurrentes no pueden consumir el mismo saldo',async()=>{
    const f=await setup(); const r=await Promise.allSettled([ComercialService.entregar(entrega(f,70),f.admin.id),ComercialService.entregar(entrega(f,70),f.admin.id)]);
    assert.equal(r.filter(v=>v.status==='fulfilled').length,1);
    const rows=await prisma.detalleEntrega.findMany({where:{clasificacionId:f.clasificacion.id}}); assert.equal(rows.reduce((s,v)=>s+v.pesoNetoKg,0),70);
  });
  test('varias devoluciones conservan exportación original y pasan a nacional; reventa no crea producción',async()=>{
    const f=await setup(),e=await ComercialService.entregar(entrega(f),f.admin.id);
    const a=devolucion(e,10);a.detalleOrigenId=e.detalles[0].id;
    const r=await ComercialService.devolver(a,f.admin.id);await ComercialService.devolver(a,f.admin.id);
    await ComercialService.devolver(devolucion(e,5),f.admin.id);
    await assert.rejects(ComercialService.devolver(devolucion(e,86),f.admin.id),/RECHAZO_EXCESIVO/);
    let report=await ReporteService.obtener({campanaId:f.camp.id});
    assert.equal(report.totales.exportacion,100);assert.equal(report.comercial.exportacionAjustada,85);assert.equal(report.comercial.nacionalAjustada,15);
    assert.equal(report.comercial.rechazoAtribuidoKg,10);assert.equal(report.comercial.rechazoSinAtribuirKg,5);
    const resale={id:randomUUID(),compradorId:f.nacional.id,fecha:'2026-01-15',taraKg:1.7,detalles:[{devolucionId:r.id,categoria:'N2',numGavetas:1,pesoBrutoKg:11.7}]};
    await ComercialService.entregar(resale,f.admin.id);
    await assert.rejects(ComercialService.entregar({...resale,id:randomUUID()},f.admin.id),/STOCK_INSUFICIENTE/);
    report=await ReporteService.obtener({campanaId:f.camp.id});assert.equal(report.totales.cosechado,100);assert.equal(report.comercial.nacionalAjustada,15);assert.equal(report.entregas.length,2);
    await prisma.comprador.update({where:{id:f.comprador.id},data:{tipo:'MAYORISTA',nombre:'Nombre posterior'}});
    assert.equal((await ComercialService.listar()).entregas.find(v=>v.id===e.id).nombreComprador,'Exportador');
    await ComercialService.devolver(devolucion(e,2),f.admin.id);
  });
  test('entrega reúne campañas y lotes; rechazo sin atribuir nunca se reparte al filtrar un origen',async()=>{
    const a=await setup(),b=await setup();
    const body=entrega(a);body.detalles.push({...entrega(b).detalles[0]});
    const e=await ComercialService.entregar(body,a.admin.id);
    await ComercialService.devolver(devolucion(e,20),a.admin.id);
    const r=await ReporteService.obtener({campanaId:a.camp.id});assert.equal(r.comercial.ajusteIncompleto,true);assert.equal(r.comercial.exportacionAjustada,null);assert.equal(r.comercial.rechazoSinAtribuirKg,20);
    const full=await ReporteService.obtener();assert.equal(full.comercial.ajusteIncompleto,false);assert.equal((await prisma.devolucion.findFirst({where:{entregaId:e.id}})).detalleOrigenId,null);
    await assert.rejects(ComercialService.devolver({...devolucion(e),detalleOrigenId:randomUUID()},a.admin.id),/ORIGEN_INVALIDO/);
  });
  test('devoluciones simultáneas no superan la entrega',async()=>{
    const f=await setup(),e=await ComercialService.entregar(entrega(f),f.admin.id);
    const r=await Promise.allSettled([ComercialService.devolver(devolucion(e,60),f.admin.id),ComercialService.devolver(devolucion(e,60),f.admin.id)]);
    assert.equal(r.filter(v=>v.status==='fulfilled').length,1);
    assert.equal((await prisma.devolucion.findMany({where:{entregaId:e.id}})).reduce((s,r)=>s+r.pesoNetoKg,0),60);
  });
  test('corrección exclusiva del administrador conserva antes/después, responsables y recalcula aprobación',async()=>{
    const f=await setup(); const body={id:randomUUID(),jornadaId:f.jornada.id,version:f.jornada.version,motivo:'Corrección de digitación verificada',pesajes:[{id:f.pesaje.id,numGavetas:1,pesoBrutoKg:121.7}],detalles:cats()};
    await assert.rejects(RevisionJornadaService.corregir(body,getWorker().id),/NO_AUTORIZADO/);
    await assert.rejects(RevisionJornadaService.corregir({...body,motivo:''},f.admin.id),/MOTIVO_REQUERIDO/);
    await RevisionJornadaService.corregir(body,f.admin.id);await RevisionJornadaService.corregir(body,f.admin.id);
    const j=await JornadaRepo.findById(f.jornada.id);assert.equal(j.estado,'PENDIENTE_APROBACION');assert.equal(j.clasificacion.pesoCosechadoKg,120);assert.equal(j.clasificacion.diferenciaKg,20);
    assert.equal(j.pesajes[0].agricultor.id,getWorker().id);
    const [revision]=await prisma.revisionJornada.findMany({where:{jornadaId:j.id}});assert.equal(JSON.parse(revision.antes).pesajes[0].pesoBrutoKg,101.7);assert.equal(JSON.parse(revision.despues).pesajes[0].pesoBrutoKg,121.7);
    assert.equal(revision.responsableId,f.admin.id);assert.equal((await ReporteService.obtener({campanaId:f.camp.id})).revisiones.length,1);
    await assert.rejects(RevisionJornadaService.corregir({...body,id:randomUUID()},f.admin.id),/JORNADA_MODIFICADA/);
    await JornadaService.aprobar(j.id,j.version,'Pesaje confirmado por administrador',f.admin.id);
    await ComercialService.entregar(entrega(f),f.admin.id);
    const current=await JornadaRepo.findById(j.id);await assert.rejects(RevisionJornadaService.corregir({...body,id:randomUUID(),version:current.version},f.admin.id),/CORRECCION_NO_PERMITIDA/);
  });
  test('captura offline conserva parámetros históricos aunque cambien antes de recibirla',async()=>{
    const f=await setup(); await CampanaService.actualizar(f.camp.id,{minimoPGr:190,minimoGGr:290});
    const p={localId:randomUUID(),timestamp:'2026-01-15T15:00:00Z',agricultor_id:getWorker().id,campana_codigo:f.camp.id,lote_codigo:getLote().id,peso_bruto:11.7,num_gavetas:1,tara_base:1.7,version_parametros:1,minimo_p_gr:180,minimo_g_gr:280};
    await SyncService.registrarPesaje(p,getWorker().id);const stored=await prisma.pesajeBruto.findUnique({where:{id:p.localId},include:{jornada:true}});
    assert.equal(stored.pesoNetoKg,10);assert.equal(stored.jornada.minimoPGr,180);
    await assert.rejects(SyncService.registrarPesaje({...p,localId:randomUUID(),minimo_p_gr:155},getWorker().id),/versión conocida/);
  });
  test('pesaje tardío se incorpora solo mediante corrección auditada; sincronizar originales no deshace correcciones',async()=>{
    const f=await setup();const p={localId:randomUUID(),timestamp:'2026-01-12T16:00:00Z',agricultor_id:getWorker().id,campana_codigo:f.camp.id,lote_codigo:getLote().id,num_gavetas:1,peso_bruto:11.7,tara_base:1.7};
    await assert.rejects(SyncService.registrarPesaje(p,getWorker().id),/JORNADA_CERRADA/);
    const body={id:randomUUID(),jornadaId:f.jornada.id,version:f.jornada.version,motivo:'Incorporación de pesaje tardío verificado',pesajes:[{id:f.pesaje.id,numGavetas:1,pesoBrutoKg:106.7}],pendientes:[p],detalles:cats(115)};
    await RevisionJornadaService.corregir(body,f.admin.id);
    await SyncService.registrarPesaje(p,getWorker().id);
    await SyncService.registrarPesaje({localId:f.pesaje.id,timestamp:f.pesaje.fechaRegistro.toISOString(),agricultor_id:getWorker().id,campana_codigo:f.camp.id,lote_codigo:getLote().id,num_gavetas:1,peso_bruto:101.7,tara_base:1.7},getWorker().id);
    const j=await JornadaRepo.findById(f.jornada.id);assert.equal(j.pesajes.length,2);assert.equal(j.clasificacion.pesoCosechadoKg,115);
    assert.equal(j.pesajes.find(v=>v.id===f.pesaje.id).pesoBrutoKg,106.7);assert.equal(j.pesajes.find(v=>v.id===p.localId).fechaRegistro.toISOString(),p.timestamp.replace('Z','.000Z'));
    const revision=await prisma.revisionJornada.findFirst({where:{jornadaId:j.id}});assert.equal(JSON.parse(revision.antes).pesajes.length,1);assert.equal(JSON.parse(revision.despues).pesajes.length,2);
  });
  test('recuperación SMTP entrega solo al correo registrado, guarda hash y revoca tokens si falla',async()=>{
    const {CorreoService}=require('../lib/services/correo.service.ts'),{AuthService}=require('../lib/services/auth.service.ts');
    const user=await prisma.user.create({data:{email:randomUUID()+'@example.test',cedula:randomUUID(),nombres:'Correo',apellidos:'Prueba',passwordHash:'fixture'}});
    let token,email;
    mock.method(CorreoService,'configuracion',()=>({}));mock.method(CorreoService,'recuperacion',async(e,t)=>{email=e;token=t;});
    try {
      assert.equal(await AuthService.generarTokenRecuperacion(user.email),null);assert.equal(email,user.email);assert.match(token,/^[a-f0-9]{64}$/);
      const stored=await prisma.passwordResetToken.findFirst({where:{userId:user.id}});assert.notEqual(stored.token,token);
      await AuthService.resetearPassword(token,'NuevaPrueba-Larga-2026');await assert.rejects(AuthService.resetearPassword(token,'OtraPrueba-Larga-2026'),/TOKEN_INVALIDO/);
      const other=await prisma.user.create({data:{email:randomUUID()+'@example.test',cedula:randomUUID(),nombres:'Falla',apellidos:'Correo',passwordHash:'fixture'}});
      CorreoService.recuperacion.mock.mockImplementation(async()=>{throw new Error('proveedor');});
      await assert.rejects(AuthService.generarTokenRecuperacion(other.email),/CORREO_NO_ENTREGADO/);assert.ok((await prisma.passwordResetToken.findFirst({where:{userId:other.id}})).usedAt);
    } finally {mock.restoreAll();}
  });
  test('límite de acceso se conserva entre llamadas y libera una ventana vencida',async()=>{
    const {LimiteAccesoRepo}=require('../lib/repositories/LimiteAccesoRepository.ts');
    const identity=randomUUID();
    assert.equal(await LimiteAccesoRepo.consumir('prueba',identity,2,60_000),true);
    assert.equal(await LimiteAccesoRepo.consumir('prueba',identity,2,60_000),true);
    assert.equal(await LimiteAccesoRepo.consumir('prueba',identity,2,60_000),false);
    const {createHash}=require('node:crypto');const clave='prueba:'+createHash('sha256').update(identity).digest('hex');
    await prisma.limiteAcceso.update({where:{clave},data:{vence:new Date(Date.now()-1000)}});
    assert.equal(await LimiteAccesoRepo.consumir('prueba',identity,2,60_000),true);
    assert.equal((await prisma.limiteAcceso.findUnique({where:{clave}})).intentos,1);
  });
};
