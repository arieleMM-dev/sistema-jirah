# Primera inspección manual de Finca JIRAH

Actualizada el 22 de octubre de 2026. Se conserva el administrador inicial provisional y se incorpora el registro público con aprobación. Esta guía complementa `MANUAL_OPERACION_Y_ACEPTACION.md`; no certifica aceptación de producción.

## Abrir y ejecutar

La aplicación en desarrollo está en http://localhost:3000/login. Mientras el servidor esté ejecutándose, basta abrir esa dirección.

Para iniciarla nuevamente, desde PowerShell en la raíz del proyecto:

```powershell
cd C:\Proyectos\FincaJIRAH
npm run mail:dev
npm run dev
```

Inicie Docker Desktop antes de `mail:dev`. Ese comando prepara un buzón local en http://127.0.0.1:8025 y no envía mensajes a Internet. Los correos de cualquier cuenta de prueba se leen allí. Reinicie desarrollo después de configurar el buzón. La dirección de `NEXTAUTH_URL` debe coincidir con la que se abre en el navegador, incluyendo host y puerto. `.env` está configurado para localhost:3000. La dirección anterior en el puerto 3101 ya no corresponde a este servidor.

La recarga automática funciona con `dev`. Para probar sin conexión, detenga desarrollo y ejecute:

```powershell
npm run build
npm start
```

Abra http://localhost:3000/login. La PWA está deshabilitada en desarrollo: use la compilación y `start` para inspeccionar trabajo sin conexión.

El buzón sin TLS solo funciona con `dev`; `start` lo rechaza deliberadamente. Para validar correo y PWA juntos en un entorno publicado hace falta un proveedor SMTP real con TLS y el dominio HTTPS configurado. La prueba automatizada `npm run test:mail` verifica el correo local con base aislada; `npm run test:e2e` verifica la PWA en producción local y el control de accesos, sin depender de ese SMTP de desarrollo.

No hace falta reinstalar dependencias, volver a sembrar ni reiniciar la base para esta inspección. `db:reset` vacía datos; no forma parte de estos pasos.

## Cuentas disponibles

| Perfil | Correo | Estado |
| --- | --- | --- |
| Administrador inicial | admin.pruebas@fincajirah.test | Única cuenta activa |

La clave del administrador se entrega en el chat y se conserva en la configuración privada y `prisma/backups/accesos-pruebas-manuales.json`, excluidos de Git. Se conservó su contraseña y se renovó su identificador para invalidar las sesiones anteriores. Todas las demás cuentas fueron eliminadas, incluidas las desactivadas.

El administrador debe crear el personal desde Personal → Nuevo Registro. En desarrollo se muestra la contraseña temporal al guardar; úsela para probar el nuevo trabajador. En producción esa contraseña no se expone: hay que enviar la invitación desde el expediente, con SMTP configurado. Antes de entregar al cliente, sustituya el correo provisional, la cédula de prueba y la contraseña inicial por los datos del responsable real.

También puede probar el recorrido de autoservicio: Solicitar acceso → registrar datos propios → ingresar a Bienvenida → abrir el mensaje en el buzón → confirmar correo con la misma cuenta → esperar aprobación en Personal → Solicitudes de acceso. Hasta aprobar, cambiar manualmente la URL a una pantalla o API de campo debe denegar el acceso. Tras aprobar, el trabajador ingresa nuevamente y puede pesar y clasificar. Pruebe además Recuperar contraseña y confirme que el enlace anterior no funciona por segunda vez.

El modelo contempla ADMIN, AGRICULTOR, CLASIFICADOR y AGRICULTOR_CLASIFICADOR. Actualmente no existe una cuenta del cuarto rol en esta base. Agricultor y clasificador comparten las funciones de campo; esta versión no impone una separación estricta entre permiso de pesar y permiso de clasificar. Personal, administración de catálogos, aprobaciones, correcciones y movimientos comerciales tienen restricciones administrativas.

Las pruebas de autorización usan cuentas y bases temporales separadas; no vuelven a cargar trabajadores en esta base. Una base vacía no elimina las reglas de acceso, que están definidas en el código.

## Base inspeccionada

SQLite local: `C:\Proyectos\FincaJIRAH\prisma\dev.db`. Inventario tras la limpieza y antes de que el propietario empiece su inspección:

| Datos | Cantidad |
| --- | --- |
| Usuarios | 1 administrador activo |
| Campañas | 0 |
| Lotes | 0 |
| Compradores | 0 |
| Pesajes anteriores | 0 |
| Clasificaciones del formato anterior | 0 |
| Jornadas del flujo nuevo | 0 |
| Clasificaciones del flujo nuevo | 0 |
| Entregas, devoluciones, revisiones y anulaciones | 0 |

También se vaciaron parámetros de campaña, tokens de recuperación y controles de intentos anteriores. Los controles internos de acceso pueden generar registros nuevos al iniciar sesión. No mostrar ni compartir tokens o hashes como datos de negocio.

Antes de capturar, cree una campaña activa con tara 1,70 kg, dos lotes activos, un comprador exportador y un mayorista si probará venta nacional. Los nombres y códigos del recorrido siguiente son ejemplos que debe crear; ya no existen datos precargados.

Antes de limpiar se creó el respaldo consistente `prisma/backups/jirah-2026-10-11T01-49-16-406Z.sqlite`. El nombre usa UTC; corresponde al 10 de octubre en Ecuador. Se conservaron el esquema y las nueve migraciones. El respaldo contiene los datos ficticios anteriores y no debe distribuirse como base inicial del cliente.

## Recorrido inicial con resultados conocidos

1. Ingresar como administrador. Personal muestra únicamente la cuenta ADMIN; revisar los estados vacíos de Campañas, Lotes, Compradores, Reportes y Entregas. Crear los catálogos anteriores y un trabajador de campo.
2. Cerrar sesión e ingresar con el trabajador recién creado, o usar una ventana privada para mantener separados los perfiles. Confirmar que el menú administrativo no esté disponible. Intentar abrir una pantalla administrativa y comprobar que no permita consultar ni modificar datos.
3. En Pesaje Bruto, elegir una campaña activa y `L-01`. Registrar **2 gavetas y 43,40 kg brutos**. Con tara de 1,70 kg por gaveta, el resultado esperado es **3,40 kg de tara y 40,00 kg netos**. Confirmar responsable, fecha y hora.
4. Abrir Clasificación para esa jornada. Registrar **G: 1 gaveta, 26,70 kg brutos**; **N1: 1 gaveta, 16,70 kg brutos**. P, N2 y N3: cero gavetas y cero bruto. Resultado: **25 kg exportación, 15 kg nacional, 40 kg clasificados, 62,50 % exportación, 37,50 % nacional y 0 % de descuadre**. Las categorías son elegidas por el trabajador.
5. Como admin, consultar Reportes filtrando la fecha actual, campaña y lote; comparar pantalla y descargas CSV/XLSX/PDF.
6. Registrar una entrega de exportación con ese origen G, **1 gaveta, 26,70 kg brutos y tara 1,70 kg**: salen **25 kg netos**. Confirmar saldo restante. Como agricultor, comprobar que no se pueda administrar esa entrega.
7. Para probar fuera de margen, usar otra jornada/origen, por ejemplo `L-02`: repetir cosecha de 40 kg netos y clasificar solo 30 kg netos. El descuadre es **(40 − 30) / 30 × 100 = 33,33 %**; debe quedar pendiente de aprobación. Solo admin puede aprobar con motivo antes de entregar.
8. Para probar sin conexión, iniciar sesión con señal y abrir Pesaje, Clasificación y Pendientes antes de desconectar. Capturar en la compilación de producción local, reconectar y comprobar que se sincronice una sola vez y conserve responsable y fecha.

Evite reutilizar una jornada ya cerrada para otro caso independiente: el sistema agrupa por día, campaña y lote. Use otro lote o campaña para mantener separados los escenarios.

## Límites y controles de esta inspección

- El correo está disponible en el buzón local después de `mail:dev`. La entrega externa aún requiere proveedor real y su propia prueba. No emplear `SMTP_LOCAL_TEST=true` en producción.
- Política confirmada: AGRICULTOR, CLASIFICADOR y AGRICULTOR_CLASIFICADOR pueden registrar cosechas y clasificaciones; una persona puede alternar ambas tareas. Solo ADMIN administra personal, catálogos, reportes globales, entregas, aprobaciones y correcciones.
- La apariencia revisada recientemente se concentra en acceso y recuperación; el panel operativo todavía conserva su diseño anterior.
- Anotar pantalla, rol, pasos, resultado esperado, resultado obtenido y captura para cada incidencia. No incluir contraseñas, cookies ni tokens en capturas compartidas.

## Comprobaciones estáticas y automatizadas

La revisión de código y estas comprobaciones son estáticas:

```powershell
npm run lint
npm run typecheck
```

Usar la aplicación y observar resultados es prueba manual dinámica/funcional. Las pruebas automatizadas, con base temporal separada, se ejecutan así:

```powershell
npm test
npm run build
npm run test:e2e
```

La preparación de la base limpia aprobó 53 pruebas automatizadas, lint y typecheck. Incluye pruebas de inicialización sin datos de demostración, repetición sin cambiar contraseña y rechazo de promoción de trabajadores o creación de otro administrador. No cambió las reglas de cálculo ni la política de roles de campo.

La revisión posterior del 11 de octubre aprobó 67 pruebas completas, compilación, lint y typecheck. Consulte `SEGURIDAD_Y_PERMISOS_2026-10-10.md` para la evidencia actual y `OPERACION_OFFLINE_Y_CONFLICTOS.md` para preparar los teléfonos y probar conflictos entre dos dispositivos. Las contraseñas nuevas requieren al menos 15 caracteres y como máximo 72 bytes UTF-8. La captura local dura hasta siete días desde la última validación con el servidor; las sesiones del servidor conservan ocho horas.
