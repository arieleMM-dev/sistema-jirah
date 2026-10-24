// Buzón de pruebas restringido a este equipo. Nunca envía correos a Internet.
const {spawnSync}=require('node:child_process');
const fs=require('node:fs');const path=require('node:path');
const name='finca-jirah-correo-local',label='com.fincajirah.service',image='axllent/mailpit:v1.31.6';
function docker(args,quiet=false){const r=spawnSync('docker',args,{encoding:'utf8',windowsHide:true,stdio:quiet?'pipe':'inherit'});if(r.error)throw new Error('Docker no está disponible. Inicie Docker Desktop antes de preparar el correo local.');return r;}
try{
  const current=docker(['inspect','--type','container','--format','{{ index .Config.Labels "'+label+'" }}',name],true);
  if(current.status===0&&current.stdout.trim()!=='correo-local')throw new Error('Existe un contenedor con ese nombre que no pertenece al correo local de JIRAH. No se modificó.');
  if(process.argv.includes('--stop')){
    if(current.status===0&&docker(['stop',name]).status!==0)throw new Error('No se pudo detener el buzón.');
    console.log('Buzón local detenido.');
  }else{
    if(current.status!==0&&docker(['run','--detach','--rm','--name',name,'--label',label+'=correo-local','--publish','127.0.0.1:8025:8025','--publish','127.0.0.1:1025:1025','--env','MP_MAX_MESSAGES=250',image]).status!==0)throw new Error('No se pudo iniciar Mailpit. Revise Docker y los puertos 8025/1025.');
    const envPath=path.resolve('.env');let source=fs.existsSync(envPath)?fs.readFileSync(envPath,'utf8'):'';
    const existing=source.match(/^SMTP_HOST\s*=\s*["']?([^"'\r\n]*)/m)?.[1]?.trim();
    if(!existing||['localhost','127.0.0.1'].includes(existing)){
      const backup=path.resolve('prisma/backups/env-antes-correo-local.env');fs.mkdirSync(path.dirname(backup),{recursive:true});if(fs.existsSync(envPath)&&!fs.existsSync(backup))fs.copyFileSync(envPath,backup);
      const values={SMTP_HOST:'127.0.0.1',SMTP_PORT:'1025',SMTP_SECURE:'false',SMTP_USER:'',SMTP_PASSWORD:'',SMTP_FROM:'Finca JIRAH pruebas <no-reply@fincajirah.test>',SMTP_LOCAL_TEST:'true'};
      for(const [key,value] of Object.entries(values)){const line=key+'='+JSON.stringify(value),pattern=new RegExp('^'+key+'\\s*=.*$','m');source=pattern.test(source)?source.replace(pattern,line):source.trimEnd()+'\n'+line+'\n';}
      fs.writeFileSync(envPath,source);
      console.log('Correo de desarrollo configurado. Reinicie npm run dev si ya estaba abierto.');
    }else console.log('Se conservó el proveedor SMTP existente. El buzón local está disponible sin cambiar sus credenciales.');
    console.log('Buzón de pruebas: http://127.0.0.1:8025 — los mensajes se quedan en este equipo. No usar esta configuración en producción.');
  }
}catch(error){console.error(error.message);process.exitCode=1;}
