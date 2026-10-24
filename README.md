# Finca JIRAH

Aplicación para digitalizar cosechas, clasificación por lote, entregas al comprador y devoluciones. Conserva pesos brutos, cantidad de gavetas, taras, responsables y fechas; calcula los netos y genera reportes completos en CSV, XLSX con fórmulas y PDF.

La captura de campo funciona con conexión y sin conexión después de preparar el dispositivo. Las entregas, devoluciones, aprobaciones y correcciones requieren conexión. La base local se preparó sin datos ficticios, con un único administrador inicial; la aceptación del cliente y la preparación del servidor son pasos pendientes antes de su uso real.

## Documentación vigente

- [Registro, aprobación y preparación offline: implementación del 22 de octubre](docs/IMPLEMENTACION_REGISTRO_Y_PREPARACION_OFFLINE_2026-10-22.md).
- [Pitahaya 3D en el acceso: prototipo funcional y fidelidad visual pendiente](docs/IMPLEMENTACION_PITAHAYA_3D_2026-10-14.md).
- [Seguridad, permisos y límites de despliegue](docs/SEGURIDAD_Y_PERMISOS_2026-10-10.md).
- [Modo sin conexión, sincronización y conflictos](docs/OPERACION_OFFLINE_Y_CONFLICTOS.md).
- [Inicialización limpia y acceso inicial](docs/INICIALIZACION_LIMPIA_2026-10-10.md).
- [Primera inspección manual desde una base vacía](docs/GUIA_PRUEBAS_MANUALES.md).
- [Implementación y evidencia de verificación](docs/IMPLEMENTACION_FLUJO_COMPLETO_2026-10-10.md).
- [Manual de operación y prueba de aceptación](docs/MANUAL_OPERACION_Y_ACEPTACION.md).
- [Matriz de trazabilidad actual](REPORTE_DE_TRAZABILIDAD.md).
- [Contraste con el Excel del cliente](docs/REGLAS_NEGOCIO_Y_CONTRASTE_EXCEL_2026-10-09.md).
- [Auditoría inicial](docs/AUDITORIA_FUNCIONAL_Y_RIESGOS_2026-10-05.md), como antecedente; los documentos posteriores sustituyen el estado de los hallazgos resueltos.

## Preparar el entorno

Requiere Node.js compatible con las versiones fijadas en package-lock.json y npm. Se verificó localmente con Node.js 26.8.1 en Windows y Chrome instalado para las pruebas de navegador.

1. Ejecute `npm ci` y `npm run db:generate` desde la raíz.
2. Copie .env.example a .env. Configure DATABASE_URL, NEXTAUTH_URL y un NEXTAUTH_SECRET aleatorio privado. No publique .env.
3. Para una base existente, ejecute `npm run db:backup` antes de migrar. Guarde la ruta del respaldo.
4. Ejecute `npm run db:deploy`. Son migraciones aditivas: no requieren reiniciar ni vaciar los datos.
5. Para una base nueva, configure SEED_ADMIN_EMAIL, SEED_ADMIN_CEDULA y SEED_ADMIN_PASSWORD y ejecute `npm run db:seed`. Se crea únicamente el administrador inicial, sin trabajadores, campañas, lotes ni compradores ficticios. Una nueva ejecución conserva la cuenta y su contraseña; no promueve usuarios ni crea otro administrador con un correo diferente. Use una frase de al menos 15 caracteres, hasta 72 bytes UTF-8; se rechazan claves comunes y repeticiones simples. El administrador completa los catálogos y crea el personal desde la aplicación.
6. Inicie desarrollo con `npm run dev`. La PWA está deshabilitada en este modo; pruebe sin conexión con una compilación de producción local.

Para verificar que una migración aditiva conservó todas las columnas y filas anteriores:

    node scripts/verify-migration.cjs prisma/backups/NOMBRE_DEL_RESPALDO.sqlite

## Verificar y ejecutar

    npm run typecheck
    npm run lint
    npm test
    npm run build
    npm run test:http
    npm run test:e2e
    npm start

Las pruebas HTTP y de navegador requieren una compilación actualizada. Crean bases temporales separadas y no usan la base de desarrollo. La prueba de navegador utiliza Chrome instalado y guarda capturas en prisma/backups/browser-qa/. Respaldos y capturas están excluidos de Git.

## Correo y acceso inicial

Configure SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_FROM y, cuando el proveedor lo requiera, SMTP_USER y SMTP_PASSWORD. El transporte exige TLS. NEXTAUTH_URL determina el dominio del enlace de recuperación y debe usar HTTPS en producción.

El trabajador puede solicitar una cuenta desde el acceso, confirmar su correo e ingresar a Bienvenida mientras espera aprobación. El registro público crea siempre una cuenta `SIN_ASIGNAR/PENDIENTE`, sin acceso a datos operativos. Solo ADMIN aprueba personal de campo después de comprobar el correo; la decisión conserva motivo e historial y exige ingresar nuevamente. Personal de campo puede pesar y clasificar. También se mantiene el alta administrativa y el envío de invitación desde el expediente.

No se envían contraseñas en texto plano ni se promete entrega si SMTP falla. La confirmación de correo vence en 24 horas; el establecimiento/recuperación de contraseña en una hora. Los enlaces son de un solo uso y los tokens se guardan como hash. La confirmación exige ingresar con la misma cuenta registrada. Recuperar una cuenta pendiente no la aprueba.

Para probar el correo sin contratar servicios, inicie Docker Desktop y ejecute:

    npm run mail:dev
    npm run dev

Abra [el buzón local](http://127.0.0.1:8025). Los correos dirigidos a cualquier dirección de prueba aparecen allí; no salen a Gmail, Hotmail ni a Internet. `mail:dev` configura el SMTP local en .env si no hay un proveedor externo configurado y conserva un respaldo privado antes del cambio. Reinicie desarrollo si ya estaba abierto. `npm run mail:stop` detiene y vacía ese buzón desechable. `npm run test:mail` verifica SMTP, confirmación y recuperación con una base temporal.

`SMTP_LOCAL_TEST=true` permite este buzón únicamente en desarrollo y en loopback. La aplicación lo rechaza en producción: antes de publicar, configure el proveedor real, HTTPS y `SMTP_LOCAL_TEST=false`. Falta validar entrega y carpeta de no deseados con ese proveedor.

## Operación y despliegue

La implementación usa SQLite mediante Prisma/libSQL. Para publicarla necesita un servidor con almacenamiento persistente, una sola base compartida por la instancia de aplicación, HTTPS y respaldos externos. No despliegue SQLite en almacenamiento efímero ni reparta copias independientes entre réplicas. Cambiar a PostgreSQL necesita su propia migración y pruebas; el proyecto no lo hace automáticamente.

La URL del alojamiento permite abrir e instalar la aplicación sin comprar un dominio web propio. Para Vercel sigue pendiente migrar la base: [su documentación descarta SQLite local como almacenamiento persistente](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel). La finca es un uso comercial; [Hobby se limita a uso personal no comercial](https://vercel.com/docs/plans/hobby). El dominio de remitente es otra decisión: [Resend exige un dominio propio verificado](https://resend.com/docs/dashboard/domains/introduction), aunque la aplicación se abra mediante la URL del alojamiento. No se ha contratado ninguno de estos servicios.

`dev` y `start` escuchan únicamente en 127.0.0.1. Para publicar, utilice un proxy HTTPS hacia ese servidor. `TRUST_PROXY_HEADERS=false` agrupa el límite de red en una sola identidad; solo active la opción si el proxy elimina y sustituye las cabeceras de IP recibidas del cliente y el servidor de la aplicación no es accesible directamente.

La instalación, el inicio de desarrollo y la compilación aplican una mitigación local para la dependencia `braces`. No equivale a una actualización oficial: persiste el aviso de npm hasta disponer de una versión corregida. Consulte el documento de seguridad antes de desplegar.

Antes de salir a campo, ingrese con conexión y espere **Listo para trabajar sin conexión**. La preparación descarga las tres pantallas de campo, sus recursos y catálogos, solicita almacenamiento persistente y muestra la fecha límite. Cada preparación completa habilita hasta siete días de captura local; las consultas rutinarias de sesión no prolongan ese plazo. El acceso al servidor conserva sesiones de ocho horas y puede exigir volver a ingresar para sincronizar. Los pendientes pertenecen a la cuenta y al navegador que los capturó. No borre los datos del navegador ni cambie de dispositivo sin sincronizar o descargar el respaldo. El primer ingreso necesita conexión.

La política de correcciones, el tratamiento de históricos y el riesgo residual de dependencias están documentados en la [implementación vigente](docs/IMPLEMENTACION_FLUJO_COMPLETO_2026-10-10.md). La cobertura automatizada no equivale a aceptación del cliente ni a certificación de producción.
