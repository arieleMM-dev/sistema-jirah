module.exports=function({test,assert,randomUUID}) {
  test('IndexedDB actualiza versión sin perder colas anteriores, aísla cuentas y conserva originales al revisar',async()=>{
    require('fake-indexeddb/auto');
    const {openDB,deleteDB}=require('idb');const {offlineService}=require('../lib/services/offline.service.ts');
    const previousWindow=global.window;global.window={};
    await offlineService.close();await deleteDB('finca-jirah-db');
    const actor='offline-actor',other='offline-other';
    const p={localId:randomUUID(),timestamp:'2026-01-12T15:00:00Z',agricultor_id:actor,campana_codigo:'c',lote_codigo:'l',peso_bruto:11.7,num_gavetas:1,tara_base:1.7,syncStatus:'PENDING'};
    const c={localId:randomUUID(),timestamp:p.timestamp,clasificador_id:actor,pesaje_local_id:p.localId,exportacion_kg:10,nacional_kg:0,descarte_kg:0};
    const old=await openDB('finca-jirah-db',1,{upgrade(db){db.createObjectStore('pesajes',{keyPath:'localId'});db.createObjectStore('clasificaciones',{keyPath:'localId'});}});
    await old.put('pesajes',p);await old.put('pesajes',{...p,localId:randomUUID(),agricultor_id:other});await old.put('clasificaciones',c);old.close();
    try {
      assert.equal((await offlineService.cola(actor)).pesajes.length,1);assert.equal((await offlineService.getPendingClasificaciones(actor))[0].localId,c.localId);
      await offlineService.saveContext(actor,{campanas:[]});assert.equal((await offlineService.getContext(actor)).userId,actor);
      await offlineService.errores(actor,'pesajes',[{localId:p.localId,error:'Revisar peso'}]);assert.equal((await offlineService.cola(actor)).pesajes[0]._sync.error,'Revisar peso');
      await assert.rejects(offlineService.pausar(other,'pesajes',p.localId,true),/otra cuenta/);
      await offlineService.pausar(actor,'pesajes',p.localId,true);assert.equal((await offlineService.getPendingPesajes(actor)).length,0);assert.equal((await offlineService.cola(actor)).pesajes.length,1);
      await offlineService.pausar(actor,'pesajes',p.localId,false);assert.equal((await offlineService.getPendingPesajes(actor)).length,1);
      await assert.rejects(offlineService.savePesaje({...p,peso_bruto:99}),/key|constraint/i);assert.equal((await offlineService.cola(actor)).pesajes[0].peso_bruto,11.7);
      const reemplazo={localId:randomUUID(),timestamp:p.timestamp,versionFormato:2,jornadaId:'j',version:2,pesajeIds:[p.localId],detalles:[],clasificador_id:actor};
      await offlineService.reemplazarClasificacion(actor,c.localId,reemplazo,'Revisión de categorías con responsable');
      const cola=await offlineService.cola(actor);assert.equal(cola.clasificaciones.length,2);assert.equal(cola.revisiones.length,1);assert.equal(cola.revisiones[0].anterior.localId,c.localId);
      assert.equal((await offlineService.getPendingClasificaciones(actor)).length,1);assert.equal((await offlineService.getPendingClasificaciones(other)).length,0);
      await offlineService.close();assert.equal((await offlineService.cola(actor)).revisiones[0].reemplazoId,reemplazo.localId);
      await offlineService.removePesajes([p.localId]);assert.equal((await offlineService.cola(actor)).pesajes.length,0);assert.equal((await offlineService.cola(other)).pesajes.length,1);
    } finally {await offlineService.close();await deleteDB('finca-jirah-db');if(previousWindow===undefined)delete global.window;else global.window=previousWindow;}
  });
};
