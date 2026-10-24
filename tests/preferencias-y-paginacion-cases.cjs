module.exports=({test,assert,prisma,randomUUID,mock})=>{
  const {guardarTema,temaLocal,temaPendiente,sincronizarTema,consultarTema}=require('../lib/tema.ts');
  test('preferencia diferida conserva último cambio y propietario; respuestas antiguas no la reemplazan',async()=>{
    const names=['localStorage','document','window'],previous=names.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]);
    const values=new Map();
    Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}});
    Object.defineProperty(globalThis,'document',{configurable:true,value:{documentElement:{classList:{toggle(){}},setAttribute(){}}}});
    Object.defineProperty(globalThis,'window',{configurable:true,value:new EventTarget()});
    const send=mock.method(globalThis,'fetch',async()=>{throw new Error('Sin red');});
    try{
      guardarTema('persona-a','OSCURO');await sincronizarTema('persona-b');assert.equal(send.mock.callCount(),0);
      await assert.rejects(sincronizarTema('persona-a'),/Sin red/);assert.equal(temaPendiente('persona-a').tema,'OSCURO');
      await consultarTema('persona-a');assert.equal(temaLocal('persona-a'),'OSCURO');
      let release;const gate=new Promise(resolve=>{release=resolve;});const enviados=[];
      send.mock.mockImplementation(async(_,options)=>{assert.equal(options.headers['X-Jirah-User'],'persona-a');enviados.push(JSON.parse(options.body).tema);if(enviados.length===1)await gate;return new Response('{}');});
      const sending=sincronizarTema('persona-a');await new Promise(r=>setImmediate(r));guardarTema('persona-a','CLARO');release();await sending;
      assert.deepEqual(enviados,['OSCURO','CLARO']);assert.equal(temaPendiente('persona-a'),undefined);
      let releaseRead;const reading=new Promise(resolve=>{releaseRead=resolve;});
      send.mock.mockImplementation(async(_,options)=>{if(options.method==='PATCH')return new Response('{}');await reading;return Response.json({user:{id:'persona-a',tema:'CLARO'}});});
      const oldRead=consultarTema('persona-a');guardarTema('persona-a','OSCURO');await sincronizarTema('persona-a');releaseRead();await oldRead;
      assert.equal(temaLocal('persona-a'),'OSCURO');
    }finally{send.mock.restore();for(const [k,d] of previous){if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}}
  });
  test('preferencia en vuelo no modifica el perfil de otra cuenta tras cambiar sesión',async()=>{
    const sessions=require('../lib/auth/session.ts'),{PerfilController}=require('../lib/controllers/PerfilController.ts'),{NextRequest}=require('next/server');
    const actor=mock.method(sessions,'getAuthenticatedSession',async()=>({user:{id:'persona-b',rol:'AGRICULTOR_CLASIFICADOR'}}));
    try{const result=await PerfilController.actualizar(new NextRequest('http://localhost/api/perfil',{method:'PATCH',headers:{'Content-Type':'application/json','X-Jirah-User':'persona-a'},body:JSON.stringify({tema:'OSCURO'})}));assert.equal(result.status,409);}finally{actor.mock.restore();}
  });
  test('cuadre conserva ±4 fijo y no permite prometer una tolerancia diferente por comprador',async()=>{
    const {CompradorService}=require('../lib/services/catalogo.service.ts');
    await assert.rejects(CompradorService.crear({nombre:'Comprador de margen',tipo:'EXPORTADOR',toleranciaPct:8}),/TOLERANCIA_INVALIDA/);
    const buyer=await CompradorService.crear({nombre:'Comprador de margen',tipo:'EXPORTADOR'});assert.equal(buyer.toleranciaPct,4);
    await assert.rejects(CompradorService.actualizar(buyer.id,{toleranciaPct:10}),/TOLERANCIA_INVALIDA/);
  });
  test('históricos paginados no omiten jornadas ni sus pesajes; resolución por ID encuentra una jornada antigua',async()=>{
    const {JornadaService}=require('../lib/services/jornada.service.ts'),{PesajeService}=require('../lib/services/pesaje.service.ts');
    const actor=await prisma.user.create({data:{email:randomUUID()+'@example.test',cedula:randomUUID(),nombres:'Volumen',apellidos:'Ensayo',rol:'ADMIN',passwordHash:'fixture'}});
    const camp=await prisma.campana.create({data:{codigo:randomUUID(),nombre:'Volumen aislado',funda:'ROJA'}}),lote=await prisma.lote.create({data:{codigo:randomUUID(),nombre:'Lote volumen'}});
    const groups=Array.from({length:64},(_,i)=>({id:randomUUID(),fecha:new Date(Date.UTC(2018,0,i+1)).toISOString().slice(0,10),campanaId:camp.id,loteId:lote.id,taraBase:1.7,minimoPGr:180,minimoGGr:280}));
    await prisma.jornadaCosecha.createMany({data:groups});
    await prisma.pesajeBruto.createMany({data:groups.flatMap(g=>[0,1].map(()=>({id:randomUUID(),jornadaId:g.id,fechaRegistro:new Date(g.fecha+'T12:00:00Z'),campanaId:camp.id,loteId:lote.id,agricultorId:actor.id,numGavetas:1,pesoBrutoKg:11.7,taraTotal:1.7,pesoNetoKg:10})))});
    const ids=[];
    for(let pagina=1;pagina<=3;pagina++){
      const data=await JornadaService.listar({campanaId:camp.id,pagina});assert.equal(data.total,64);assert.equal(data.paginas,3);assert.ok(data.jornadas.length<=25);
      data.jornadas.forEach(j=>{assert.equal(j.pesajes.length,2);assert.equal(j.pesoNetoKg,20);ids.push(j.id);});
    }
    assert.equal(ids.length,64);assert.equal(new Set(ids).size,64);
    // EXPLAIN usa su propia conexión de diagnóstico; no comparte el ciclo transaccional del adaptador Prisma.
    const inspector=require('@libsql/client').createClient({url:process.env.DATABASE_URL});
    try{const plan=await inspector.execute('EXPLAIN QUERY PLAN SELECT id FROM jornadas_cosecha ORDER BY fecha DESC, id ASC LIMIT 25 OFFSET 25');
      assert.ok(plan.rows.every(row=>!row.detail.includes('USE TEMP B-TREE')),'La paginación ordenada usa el índice sin ordenar todo el histórico');
    }finally{inspector.close();}
    assert.equal((await JornadaService.listar({id:groups[0].id})).jornadas[0].id,groups[0].id);
    const page1=await PesajeService.listar({campanaId:camp.id},1,10),page2=await PesajeService.listar({campanaId:camp.id},2,10);
    assert.equal(page1.length,10);assert.equal(page2.length,10);assert.ok(page2.every(p=>!page1.some(v=>v.id===p.id)));
    await assert.rejects(JornadaService.listar({pagina:0}),/PAGINACION_INVALIDA/);await assert.rejects(PesajeService.listar({},1,10000),/PAGINACION_INVALIDA/);
    const {ComercialRepo}=require('../lib/repositories/ComercialRepository.ts'),{ComercialService}=require('../lib/services/comercial.service.ts');
    const buyer=await prisma.comprador.create({data:{nombre:'Volumen',tipo:'EXPORTADOR'}});
    await prisma.entrega.createMany({data:groups.slice(0,31).map(g=>({id:randomUUID(),fecha:g.fecha,compradorId:buyer.id,tipoComprador:'EXPORTADOR',nombreComprador:'Volumen',taraKg:1.7,responsableId:actor.id,huella:randomUUID()}))});
    const first=await ComercialService.listar(1),second=await ComercialService.listar(2);assert.equal(first.entregas.length,25);assert.ok(second.entregas.length>0);assert.ok(second.entregas.every(e=>!first.entregas.some(v=>v.id===e.id)));
    const operation=await ComercialRepo.contexto({incluirHistorial:false,clasificacionIds:[],devolucionIds:[],compradorId:buyer.id});assert.equal(operation[1].length,0);assert.equal(operation[2].length,0);assert.equal(operation[3].length,0);
  });
};
