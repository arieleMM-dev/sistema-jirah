module.exports=async({base,prisma,assert,adminCookie})=>{
  const {randomUUID,randomBytes,createHash}=require('node:crypto');const bcrypt=require('bcryptjs');
  const pending=await prisma.user.create({data:{email:randomUUID()+'@example.test',cedula:randomUUID(),nombres:'Solicitud',apellidos:'HTTP',rol:'SIN_ASIGNAR',estadoAcceso:'PENDIENTE',passwordHash:await bcrypt.hash('Prueba de registro segura 2026',4)}});
  async function login(user) {
    const cookies=new Map();const remember=r=>{for(const c of r.headers.getSetCookie()){const pair=c.split(';')[0],i=pair.indexOf('=');cookies.set(pair.slice(0,i),pair.slice(i+1));}};
    const csrf=await fetch(base+'/api/auth/csrf');remember(csrf);const {csrfToken}=await csrf.json();
    const r=await fetch(base+'/api/auth/callback/credentials',{method:'POST',redirect:'manual',headers:{Cookie:[...cookies].map(([k,v])=>k+'='+v).join('; '),'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({csrfToken,email:user.email,password:'Prueba de registro segura 2026',json:'true'})});remember(r);
    return [...cookies].map(([k,v])=>k+'='+v).join('; ');
  }
  const cookie=await login(pending);
  const get=route=>fetch(base+route,{redirect:'manual',headers:{Cookie:cookie}});
  const post=(route,body,session=cookie)=>fetch(base+route,{method:'POST',headers:{Cookie:session,'Content-Type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await get('/api/auth/estado')).status,200);
  for(const route of ['/api/perfil','/api/campo/pesajes','/api/campo/jornadas','/api/reportes/cosecha','/api/agricultores/solicitudes'])assert.equal((await get(route)).status,403,route);
  assert.equal((await post('/api/sync/pesajes',{pesajes:[]})).status,403);
  const redirect=await get('/dashboard/campo/pesaje');assert.equal(redirect.status,307);assert.match(redirect.headers.get('location'),/\/bienvenida$/);
  assert.equal((await post('/api/agricultores/solicitudes',{id:pending.id,version:0,accion:'APROBAR',motivo:'No autorizado'})).status,403);
  const token=randomBytes(32).toString('hex');await prisma.verificacionCorreo.create({data:{userId:pending.id,token:createHash('sha256').update(token).digest('hex'),expiresAt:new Date(Date.now()+60000)}});
  assert.equal((await post('/api/agricultores/solicitudes',{id:pending.id,version:0,accion:'APROBAR',motivo:'Equipo confirmado por administrador'},adminCookie)).status,422);
  assert.equal((await post('/api/auth/verificar',{token},'')).status,401);
  assert.equal((await post('/api/auth/verificar',{token})).status,200);
  assert.equal((await post('/api/auth/verificar',{token})).status,410);
  assert.equal((await get('/api/campo/pesajes')).status,403,'Confirmar correo no asigna permisos');
  assert.equal((await post('/api/agricultores/solicitudes',{id:pending.id,version:0,accion:'APROBAR',motivo:'Equipo confirmado por administrador'},adminCookie)).status,200);
  assert.equal((await get('/api/campo/pesajes')).status,401,'La sesión anterior a la aprobación debe renovarse');
  const approvedCookie=await login(pending);
  assert.equal((await fetch(base+'/api/campo/pesajes',{headers:{Cookie:approvedCookie}})).status,200);
  assert.equal((await fetch(base+'/api/agricultores/solicitudes',{headers:{Cookie:approvedCookie}})).status,403);
};
