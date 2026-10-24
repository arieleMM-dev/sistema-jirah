module.exports = ({test,assert,prisma,randomUUID,mock}) => {
  test('iconos instalables son PNG cuadrados del tamaño declarado',()=>{
    const fs=require('node:fs'),path=require('node:path');
    for(const size of [180,192,512]){
      const file=size===180?'apple-touch-icon.png':`icon-${size}.png`,data=fs.readFileSync(path.join(__dirname,'../public',file));
      assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(data.readUInt32BE(16),size);assert.equal(data.readUInt32BE(20),size);
    }
  });
  const {AccesoService}=require('../lib/services/acceso.service.ts');
  const {AccesoRepo}=require('../lib/repositories/AccesoRepository.ts');
  const {CorreoService}=require('../lib/services/correo.service.ts');
  const {AuthService}=require('../lib/services/auth.service.ts');
  const {UserRepository}=require('../lib/repositories/UserRepository.ts');
  const {SyncController}=require('../lib/controllers/SyncController.ts');
  const {SyncService}=require('../lib/services/sync.service.ts');
  const {CampanaService}=require('../lib/services/catalogo.service.ts');
  const {readSyncConfirmation}=require('../lib/sync-confirmation.ts');
  const sessions=require('../lib/auth/session.ts');
  const {createHash}=require('node:crypto');
  const hash=t=>createHash('sha256').update(t).digest('hex');
  function solicitud() {
    const b='17'+String(Math.floor(Math.random()*10000000)).padStart(7,'0');
    let sum=0;for(let i=0;i<9;i++){let v=Number(b[i])*(i%2?1:2);sum+=v>9?v-9:v;}
    return {nombres:'Prueba',apellidos:'Registro',email:randomUUID()+'@example.test',cedula:b+((10-sum%10)%10),password:'Frase segura para pruebas 2026'};
  }
  async function admin() {return prisma.user.create({data:{email:randomUUID()+'@example.test',cedula:randomUUID(),nombres:'Admin',apellidos:'Acceso',rol:'ADMIN',passwordHash:'fixture'}});}
  function correo() {let token;const config=mock.method(CorreoService,'configuracion',()=>({}));const send=mock.method(CorreoService,'verificacion',async(_,t)=>{token=t;});return {token:()=>token,restore:()=>{config.mock.restore();send.mock.restore();}};}
  const localMail={NODE_ENV:'development',NEXTAUTH_URL:'http://localhost:3000',SMTP_HOST:'127.0.0.1',SMTP_PORT:'1025',SMTP_SECURE:'false',SMTP_FROM:'Pruebas JIRAH <no-reply@fincajirah.test>',SMTP_LOCAL_TEST:'true',SMTP_USER:'',SMTP_PASSWORD:''};
  async function withMailEnvironment(run){
    const previous=Object.fromEntries(Object.keys(localMail).map(k=>[k,process.env[k]]));
    try{Object.assign(process.env,localMail);await run();}
    finally{for(const [key,value] of Object.entries(previous)){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
  }
  test('SMTP de pruebas solo admite localhost en desarrollo; producción conserva la exigencia de TLS',async()=>{
    await withMailEnvironment(async()=>{
      assert.equal(CorreoService.configuracion().localTest,true);
      process.env.SMTP_HOST='smtp.example.test';assert.throws(()=>CorreoService.configuracion(),/RECUPERACION_NO_CONFIGURADA/);
      process.env.SMTP_HOST='127.0.0.1';process.env.NODE_ENV='production';process.env.NEXTAUTH_URL='https://finca.example.test';assert.throws(()=>CorreoService.configuracion(),/RECUPERACION_NO_CONFIGURADA/);
      process.env.SMTP_LOCAL_TEST='false';assert.equal(CorreoService.configuracion().localTest,false);
    });
  });
  if(process.env.JIRAH_MAIL_TEST==='1')test('correo SMTP local real completa verificación y recuperación sin modificar la base de desarrollo',async()=>{
    await withMailEnvironment(async()=>{
      const input=solicitud();await AccesoService.registrar(input);
      const user=await prisma.user.findUnique({where:{email:input.email}});
      async function receivedLink(subject,pathname){
        const listing=await fetch('http://127.0.0.1:8025/api/v1/messages');assert.equal(listing.ok,true,'El buzón Mailpit debe estar iniciado con npm run mail:dev');
        const messages=(await listing.json()).messages;
        const summary=messages.find(m=>m.Subject===subject&&m.To?.some(to=>to.Address===input.email));
        assert.ok(summary,'El mensaje SMTP real debe llegar al buzón local');
        const response=await fetch('http://127.0.0.1:8025/api/v1/message/'+encodeURIComponent(summary.ID));assert.equal(response.ok,true);
        const message=await response.json();const match=message.Text.match(/http:\/\/localhost:3000\/[^\s]+/);
        assert.ok(match,'El correo debe contener el enlace esperado');const url=new URL(match[0]);assert.equal(url.pathname,pathname);
        const token=new URLSearchParams(url.hash.slice(1)).get('token');assert.ok(/^[a-f0-9]{64}$/.test(token));return token;
      }
      const verification=await receivedLink('Finca JIRAH: confirma tu correo','/verificar');
      await AccesoService.verificar(user.id,{token:verification});assert.equal((await prisma.user.findUnique({where:{id:user.id}})).estadoAcceso,'PENDIENTE');
      const a=await admin();await AccesoService.decidir(a.id,{id:user.id,version:0,accion:'APROBAR',motivo:'Aprobado para prueba aislada de correo'});
      assert.ok(await AuthService.login(input.email,input.password));
      await AuthService.generarTokenRecuperacion(input.email);
      const reset=await receivedLink('Finca JIRAH: establecer contraseña','/recuperar/reset');
      const password='Otra frase segura de correo 2026';await AuthService.resetearPassword(reset,password);
      assert.ok(await AuthService.login(input.email,password));assert.equal(await AuthService.validarSesion(user.id,1),null);
      await assert.rejects(AuthService.resetearPassword(reset,password),/TOKEN_INVALIDO/);
    });
  });
  test('registro público conserva permisos pendientes, normaliza correo y rechaza escalamiento',async()=>{
    const c=correo(),input=solicitud();
    try {
      await assert.rejects(AccesoService.registrar({...input,rol:'ADMIN'}),/REGISTRO_INVALIDO/);
      await AccesoService.registrar({...input,email:input.email.toUpperCase()});
      const u=await prisma.user.findUnique({where:{email:input.email}});
      assert.equal(u.rol,'SIN_ASIGNAR');assert.equal(u.estadoAcceso,'PENDIENTE');assert.equal(u.emailVerificadoAt,null);
      const stored=await prisma.verificacionCorreo.findFirst({where:{userId:u.id}});
      assert.equal(stored.token,hash(c.token()));assert.notEqual(stored.token,c.token());
      await AccesoService.registrar({...input,password:'Otra frase que no debe reemplazar'});
      assert.equal((await prisma.user.findUnique({where:{id:u.id}})).passwordHash,u.passwordHash);
      assert.equal((await AuthService.login(input.email,input.password)).estadoAcceso,'PENDIENTE');
      assert.equal(sessions.isAuthenticatedSession({user:u}),false);
      assert.equal((await UserRepository.search(input.email)).length,0);
    }finally{c.restore();}
  });
  test('verificación exige la misma identidad, caduca y se consume una sola vez sin aprobar permisos',async()=>{
    const c=correo(),input=solicitud();
    try {
      await AccesoService.registrar(input);const u=await prisma.user.findUnique({where:{email:input.email}}),token=c.token();
      await assert.rejects(AccesoService.verificar((await admin()).id,{token}),/VERIFICACION_INVALIDA/);
      await AccesoService.verificar(u.id,{token});
      await assert.rejects(AccesoService.verificar(u.id,{token}),/VERIFICACION_INVALIDA/);
      const current=await prisma.user.findUnique({where:{id:u.id}});assert.ok(current.emailVerificadoAt);assert.equal(current.estadoAcceso,'PENDIENTE');assert.equal(current.rol,'SIN_ASIGNAR');
      const expired='b'.repeat(64);await prisma.verificacionCorreo.create({data:{userId:u.id,token:hash(expired),expiresAt:new Date(0)}});
      await assert.rejects(AccesoService.verificar(u.id,{token:expired}),/VERIFICACION_INVALIDA/);
    }finally{c.restore();}
  });
  test('solo admin aprueba correo confirmado; decisiones concurrentes conservan una decisión e invalidan sesión vieja',async()=>{
    const c=correo(),input=solicitud();
    try {
      await AccesoService.registrar(input);const u=await prisma.user.findUnique({where:{email:input.email}}),a=await admin();
      const decision={id:u.id,version:0,accion:'APROBAR',motivo:'Confirmado como miembro del equipo'};
      await assert.rejects(AccesoService.decidir(a.id,decision),/CORREO_NO_VERIFICADO/);
      await AccesoService.verificar(u.id,{token:c.token()});
      await assert.rejects(AccesoService.decidir(u.id,decision),/ACCESO_NO_AUTORIZADO/);
      const results=await Promise.allSettled([AccesoService.decidir(a.id,decision),AccesoService.decidir(a.id,decision)]);
      assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
      assert.equal(await prisma.decisionAcceso.count({where:{solicitanteId:u.id}}),1);
      const current=await prisma.user.findUnique({where:{id:u.id}});assert.equal(current.estadoAcceso,'APROBADO');assert.equal(current.rol,'AGRICULTOR_CLASIFICADOR');
      assert.equal(await AuthService.validarSesion(u.id,0),null);assert.ok(await AuthService.validarSesion(u.id,1));
    }finally{c.restore();}
  });
  test('rechazo conserva historial; un fallo de correo no habilita la cuenta ni deja un enlace válido',async()=>{
    const c=correo(),input=solicitud();
    try {
      CorreoService.verificacion.mock.mockImplementation(async()=>{throw new Error('SMTP no disponible');});
      await assert.rejects(AccesoService.registrar(input),/VERIFICACION_NO_ENVIADA/);
      const u=await prisma.user.findUnique({where:{email:input.email}});assert.equal(u.estadoAcceso,'PENDIENTE');assert.equal(u.rol,'SIN_ASIGNAR');
      assert.ok((await prisma.verificacionCorreo.findFirst({where:{userId:u.id}})).usedAt);
      const a=await admin();await AccesoService.decidir(a.id,{id:u.id,version:0,accion:'RECHAZAR',motivo:'Persona ajena al equipo de la finca'});
      const rejected=await prisma.user.findUnique({where:{id:u.id}});assert.equal(rejected.estadoAcceso,'RECHAZADO');assert.equal(rejected.isActive,true);assert.equal(rejected.rol,'SIN_ASIGNAR');
      assert.equal((await AccesoRepo.listar('RECHAZADO',1)).solicitudes.some(s=>s.id===u.id),true);
    }finally{c.restore();}
  });
  test('API de sincronización diferencia fallo transitorio de conflicto y conserva confirmaciones individuales',async()=>{
    const id=randomUUID();const auth=mock.method(sessions,'getAuthenticatedSession',async()=>({user:{id:'test',rol:'AGRICULTOR',estadoAcceso:'APROBADO'}}));
    const save=mock.method(SyncService,'registrarPesaje',async()=>{throw new Error('SQLITE_BUSY');});
    const req=()=>new Request('http://localhost/api/sync/pesajes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pesajes:[{localId:id}]})});
    try {
      const result=await (await SyncController.sync(req(),'pesajes')).json();assert.equal(result.errors[0].retryable,true);assert.equal(readSyncConfirmation(result,[id]).retryable,true);assert.deepEqual(result.savedIds,[]);
      save.mock.mockImplementation(async()=>{throw new Error('CAMPANA_CERRADA');});
      const conflict=await (await SyncController.sync(req(),'pesajes')).json();assert.equal(readSyncConfirmation(conflict,[id]).retryable,false);
    }finally{auth.mock.restore();save.mock.restore();}
  });
  test('cierre admite captura previa diferida con fecha original y rechaza nuevas capturas; inactivar lote conserva ese criterio',async()=>{
    const a=await admin(),l=await prisma.lote.create({data:{codigo:randomUUID(),nombre:'Lote de prueba'}});
    const c=await CampanaService.crear({codigo:randomUUID(),nombre:'Campaña tardía',funda:'ROJA'});
    const timestamp=new Date(Date.now()-10000).toISOString();await CampanaService.cerrar(c.id);
    const payload={localId:randomUUID(),timestamp,agricultor_id:a.id,campana_codigo:c.id,lote_codigo:l.id,num_gavetas:1,peso_bruto:21.7,tara_base:1.7,version_parametros:1,minimo_p_gr:180,minimo_g_gr:280};
    await SyncService.registrarPesaje(payload,a.id);assert.equal((await prisma.pesajeBruto.findUnique({where:{id:payload.localId}})).fechaRegistro.toISOString(),timestamp);
    await assert.rejects(SyncService.registrarPesaje({...payload,localId:randomUUID(),timestamp:new Date(Date.now()+1000).toISOString()},a.id),/CAMPANA_CERRADA/);
    await prisma.lote.update({where:{id:l.id},data:{isActive:false,inactivadoAt:new Date()}});
    await SyncService.registrarPesaje({...payload,localId:randomUUID()},a.id);
    const {PesajeService}=require('../lib/services/pesaje.service.ts');
    await assert.rejects(PesajeService.registrar({campanaId:c.id,loteId:l.id,agricultorId:a.id,numGavetas:1,pesoBrutoKg:21.7}),/CAMPANA_CERRADA/);
  });
};
