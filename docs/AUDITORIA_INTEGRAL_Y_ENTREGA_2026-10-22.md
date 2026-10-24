# Auditoría integral y preparación de entrega de Finca JIRAH

Fecha: 22 de octubre de 2026. Estado evaluado: archivos actuales del espacio de trabajo, incluidos cambios todavía sin registrar en Git. Autor: revisión técnica de Codex solicitada por el responsable del proyecto.

## Actualización posterior a la implementación del 22 de octubre

El cuerpo siguiente conserva el diagnóstico inicial como evidencia. La [implementación de registro y preparación offline](IMPLEMENTACION_REGISTRO_Y_PREPARACION_OFFLINE_2026-10-22.md) documenta los cambios posteriores; no interpretar los defectos iniciales como si continuaran todos sin tratar.

| Hallazgo inicial | Estado posterior |
| --- | --- |
| H01 caché de un día | Corregido: caché específica de campo de ocho días para ventana local de siete; prueba con páginas envejecidas seis días. Teléfonos reales pendientes. |
| H02 base/Vercel | Pendiente: sigue SQLite, sin migración PostgreSQL ni despliegue. |
| H03 cierre con pendientes remotos | Corregida la recepción de capturas anteriores al cierre/inactivación registrados. No se detectan mágicamente teléfonos desconectados; las jornadas ya clasificadas conservan corrección administrativa. |
| H04 errores transitorios parciales | Corregido: respuesta por registro marca reintentable; reintento automático solo de fallos transitorios. |
| H05 iconos | Corregido: PNG reales y tamaños comprobados, incluido Apple 180. |
| H06 cuentas/correo | Flujo implementado y probado con SMTP local real. SMTP externo/identidad final y aceptación del proveedor pendientes. Registro público sin permisos hasta confirmación y aprobación. |
| H07 operación/respaldos | Respaldo y migración local verificados. Respaldos externos automáticos, restauración y entrega publicada pendientes. |
| H08 preparación offline | Preparación automática y estado comprobable implementados. Falta ensayo físico y actualización entre compilaciones con cola pendiente. |
| H09 altas/roles | Corregido: Personal de campo combinado, invitación explícita y textos coherentes; solicitudes con historial. |
| H10 preferencias/parámetros | Implementado: cola de tema por cuenta con reintento, protección ante respuesta antigua/cambio de cuenta y margen de finca fijo en UI/API. Verificación final en el informe de implementación. |
| H11 volumen de trabajo | Reducido: pesajes recientes acotados, jornadas e historial de entregas paginados, revisión por ID, índices y orígenes específicos al registrar entrega. Aún se consulta el conjunto de saldos comerciales al cargar el formulario y falta medir volumen real de la finca. |
| H12 dependencia mitigada | Continúa la mitigación local y la alerta; no se declara eliminada la vulnerabilidad oficial. |

## Dictamen inicial

La aplicación cubre gran parte del proceso de cosecha acordado, tiene controles de seguridad comprobados y supera sus pruebas actuales. **No recomiendo entregarla todavía como sistema de producción listo para operar sin acompañamiento.** Hay defectos reproducidos en la duración real del acceso offline, el tratamiento de algunos fallos de sincronización y el cierre de campañas con pendientes en teléfonos. Faltan también la infraestructura definitiva, el correo operativo y la validación de instalación en Android e iOS reales.

La dirección recomendada para una entrega sencilla y mantenible es conservar Next.js, React, TypeScript y Prisma; utilizar PostgreSQL administrado para la base central, alojamiento administrado compatible con Next.js y correo transaccional. Vercel con una integración de PostgreSQL como Neon es una opción concreta para esa dirección. **Es una recomendación de arquitectura, todavía no una migración realizada ni una contratación autorizada.** No es necesario rehacer la aplicación.

Cambiar SQLite por PostgreSQL no arregla la PWA: la base central y la persistencia local del teléfono son dos partes distintas. Ambas deben superar sus propios criterios de aceptación.

## Alcance y evidencia

Se revisaron la arquitectura y configuración, el esquema y las migraciones, los grupos de rutas de API, las guardas de acceso, los flujos de autenticación y perfil, catálogos, captura, clasificación, sincronización, correcciones, entregas, devoluciones, anulaciones y reportes. Se inspeccionaron los servicios y repositorios críticos y las pruebas existentes; se contrastaron los requisitos del Markdown y el contenido del DOCX original con las decisiones posteriores de esta conversación y la documentación de trazabilidad.

Las respuestas del cliente y las decisiones aprobadas tienen prioridad sobre los supuestos del documento académico. El contraste de cálculos usa esas reglas y los casos de prueba derivados del Excel; esta auditoría no constituye una nueva revisión visual de cada hoja del libro ni una nueva aprobación del cliente.

Se aplicaron AI SOFTWARE ENGINEERING GUIDELINES.md, Vercel React Best Practices y Web Interface Guidelines. La revisión comprende riesgos funcionales, de seguridad, operación y experiencia de usuario. No equivale a una certificación de ausencia de vulnerabilidades ni a medir cobertura de cada línea del repositorio.

### Verificación realizada ahora

| Comprobación | Resultado y límite |
| --- | --- |
| `npm test` | 67 pruebas aprobadas, sin fallos. Bases temporales aisladas. |
| `npm run lint` | Correcto. |
| `npm run typecheck` | Correcto. |
| `npm run build` | Correcto. El primer intento encontró una restricción de escritura del entorno; la repetición con permisos suficientes compiló. |
| `npm run test:e2e` | 68 pruebas aprobadas. Incluye las anteriores y el caso integrado HTTP/navegador; no son 135 pruebas diferentes. |
| Navegador | Chrome automatizado, con vistas de escritorio y móvil. Captura offline, reapertura, caducidad del JWT, reingreso, sincronización, exportaciones y operaciones comerciales. No es una prueba en teléfonos físicos. |
| Dependencias | `npm audit`: 6 alertas altas; `--omit=dev`: 4 altas. Corresponden a la misma cadena vulnerable de `braces`, no a seis vulnerabilidades independientes demostradas. |
| Comprobaciones adicionales | Error transitorio por registro de sincronización; cierre de campaña con una captura todavía local; apertura offline con páginas de antigüedad simulada de 48 horas. Resultados descritos abajo. |
| Base de desarrollo, solo lectura | 1 usuario ADMIN activo. 0 campañas, lotes, compradores, pesajes, jornadas, entregas y devoluciones. |
| Configuración local, sin divulgar secretos | SMTP_HOST y SMTP_FROM sin configurar. URL actual sin HTTPS. Entorno local Node 26.8.1. Esto describe desarrollo, no un despliegue de producción existente. |

La auditoría no modificó la lógica de aplicación, no migró ni eliminó datos y no publicó servicios. La compilación regeneró `public/sw.js`; se conservaron los artefactos de la compilación coherentes con `.next`. Se añadieron este informe y evidencias de verificación en `prisma/backups/`, carpeta ignorada por Git. El estado de trabajo ya tenía numerosos cambios y archivos nuevos antes de esta revisión.

## Hallazgos prioritarios

P1: resolver antes de entregar para uso real. P2: corregir o cerrar explícitamente antes del despliegue general. P3: mejora posterior que no bloquea el proceso principal por sí sola.

### H01 P1 La caché de páginas dura un día y el permiso local promete siete

**Ubicación:** [next.config.ts:11](C:/Proyectos/FincaJIRAH/next.config.ts:11), [offline-session.ts:4](C:/Proyectos/FincaJIRAH/lib/auth/offline-session.ts:4). La configuración extiende las reglas predeterminadas del paquete PWA sin reemplazar la duración de las páginas. En la versión instalada, `node_modules/@ducanh2912/next-pwa/dist/index.js:649–676` configura `pages-rsc-prefetch`, `pages-rsc` y `pages` con `maxAgeSeconds: 86400`.

**Reproducción:** se inició una base y un servidor de producción de prueba, se ingresó con un trabajador, se visitaron las tres pantallas de campo y se verificó su presencia en la caché. Se envejeció únicamente la cabecera Date de las respuestas de campo a 48 horas, conservando la identidad local vigente. Al cortar internet y abrir `/dashboard/campo/clasificacion`, Chrome devolvió `net::ERR_FAILED`; la pantalla no apareció. Se simuló la antigüedad para probar la política de Workbox; no se esperaron físicamente dos días.

**Impacto:** conservar los registros en IndexedDB y un permiso de siete días no basta si la interfaz deja de estar disponible al reabrirla.

**Cierre exigido:** política explícita de caché para el conjunto de pantallas y recursos de campo durante toda la ventana offline; preparación verificable; pruebas de reapertura en los días 2, 6 y 7, y rechazo al superar el límite. Mantener las API de autenticación y datos fuera de la caché. No ampliar indiscriminadamente la caché de todo el sitio.

### H02 P1 La base actual no permite desplegar directamente en Vercel

**Ubicación:** [lib/prisma.ts:21](C:/Proyectos/FincaJIRAH/lib/prisma.ts:21), [schema.prisma](C:/Proyectos/FincaJIRAH/prisma/schema.prisma), [migration_lock.toml](C:/Proyectos/FincaJIRAH/prisma/migrations/migration_lock.toml).

El proveedor del esquema y las migraciones es SQLite. El adaptador fuerza `file:` incluso si recibe otro tipo de URL. No existe configuración de conexión a PostgreSQL ni un cambio transparente hacia una base libSQL remota con token. **Cambiar solo DATABASE_URL no resuelve esto.** Vercel confirma que el SQLite local no dispone allí de almacenamiento permanente compartido entre funciones.

**Cierre exigido:** migración controlada del proveedor y adaptador, historial de migraciones adecuado a PostgreSQL, inicialización, conexiones y transacciones; adaptar pruebas, límites de acceso y respaldo. Ejecutar toda la suite sobre el motor elegido. Conservar las migraciones SQLite como historia de desarrollo; no tratar su SQL como si fuera PostgreSQL.

Una alternativa válida es mantener SQLite en una única instancia Node con disco persistente y respaldos externos. SQLite no es una tecnología de baja calidad; el problema es su encaje con este despliegue y la operación que queremos simplificar.

### H03 P1 Cerrar una campaña no detecta los pendientes de teléfonos desconectados

**Ubicación:** [catalogo.service.ts:120](C:/Proyectos/FincaJIRAH/lib/services/catalogo.service.ts:120), [pesaje.service.ts:60](C:/Proyectos/FincaJIRAH/lib/services/pesaje.service.ts:60).

El cierre consulta filas `PENDING` de la base central. Los pendientes reales de captura están en IndexedDB del teléfono, por lo que esa consulta no demuestra que todos los dispositivos hayan terminado. El DOCX promete impedir el cierre si existen esos pendientes: esa promesa no está implementada para dispositivos desconectados.

**Reproducción:** se construyó una captura local válida de una campaña activa en una base temporal, se cerró la campaña antes de enviarla y luego se intentó sincronizar. El cierre se permitió y el envío devolvió `CAMPANA_CERRADA`.

**Impacto:** el dato no se borra, pero queda pendiente de resolución. La corrección auditada existente incorpora pesajes tardíos a jornadas ya clasificadas; no es una solución general para una jornada que nunca llegó al servidor antes del cierre. Tampoco se encontró una reapertura administrativa de campaña en el flujo público actual.

**Cierre exigido:** distinguir cierre de nuevas capturas y recepción tardía de capturas anteriores, definir conciliación y auditoría administrativa y mostrar el alcance real del cierre. El servidor no puede conocer mágicamente el contenido de un teléfono sin conexión. La solución debe cubrir también campañas sin jornada central todavía creada y cuentas desactivadas, sin debilitar los permisos de sincronización.

### H04 P2 Algunos fallos temporales de sincronización no reciben reintento automático

**Ubicación:** [SyncController.ts:32](C:/Proyectos/FincaJIRAH/lib/controllers/SyncController.ts:32), [useSyncManager.ts:64](C:/Proyectos/FincaJIRAH/lib/hooks/useSyncManager.ts:64), [useSyncManager.ts:87](C:/Proyectos/FincaJIRAH/lib/hooks/useSyncManager.ts:87).

El controlador convierte cualquier excepción dentro del procesamiento de un registro en un error del lote y responde HTTP 200. El cliente aplica reintentos progresivos a errores de red, 429 y HTTP 5xx, pero no a esos errores parciales con respuesta 200.

**Reproducción:** al simular `SQLITE_BUSY` en el guardado de una captura, la respuesta real del controlador fue HTTP 200, `success: false`, `savedIds: []` y un mensaje genérico. La lectura del hook confirma que esa rama no programa el reintento. El registro se conserva y se puede reintentar manualmente o mediante otro evento; no es una pérdida demostrada de datos.

**Cierre exigido:** distinguir conflictos/validaciones definitivas de errores transitorios por operación, conservar confirmación individual y reintentar solo los transitorios. Probar lotes parcialmente confirmados y no reintentar indefinidamente una clasificación conflictiva.

### H05 P2 Los iconos no corresponden al manifiesto de instalación

**Ubicación:** [manifest.json:11](C:/Proyectos/FincaJIRAH/public/manifest.json:11), archivos `public/icon-192.png` y `public/icon-512.png`.

Se anuncian PNG cuadrados de 192 y 512 píxeles. La inspección binaria y de dimensiones encontró que ambos son **JPEG de 1012 × 1024**, idénticos al logotipo de origen, de 86.568 bytes. Esto deja una configuración de instalación incorrecta y puede afectar la selección del icono por los navegadores.

**Cierre exigido:** generar iconos reales en los tamaños/formato declarados, preparar el icono de Apple y verificar instalación y apertura en Android e iOS. La consulta de instalabilidad en la comprobación automatizada reportó contexto privado; por tanto no se usa como prueba de un fallo de instalación definitivo. El defecto de formato y dimensiones sí está comprobado.

### H06 P1 El acceso y la recuperación por correo no están listos para el cliente

**Ubicación:** [correo.service.ts:4](C:/Proyectos/FincaJIRAH/lib/services/correo.service.ts:4), [AuthController.ts:124](C:/Proyectos/FincaJIRAH/lib/controllers/AuthController.ts:124), [prisma/seed.ts:14](C:/Proyectos/FincaJIRAH/prisma/seed.ts:14).

Recuperación, enlaces de un uso y cambio de contraseña están implementados. Sin SMTP operativo, la recuperación responde que no está disponible. En producción, las contraseñas temporales de trabajadores no se muestran: el administrador debe enviarles un enlace desde su expediente. El entorno actual carece de servidor y remitente SMTP configurados.

**Cierre exigido:** correo y dominio reales, identidad real del administrador inicial, envío/recepción probados desde el dominio definitivo, caducidad y uso único del enlace, y prueba de la invitación de un trabajador. No entregar la cuenta `.test` como correo recuperable del cliente. La semilla no cambia el correo de un administrador existente ni crea automáticamente otro; debe prepararse una base nueva de producción o una actualización administrativa controlada.

Queda pendiente confirmar si todos los trabajadores tienen correo accesible. La invitación actual no resuelve el alta de una persona que no pueda recibirlo. Si hace falta ayuda administrativa, se debe definir un procedimiento seguro y auditable, sin compartir cuentas ni claves generales.

### H07 P1 Faltan respaldos operativos y una entrega reproducible

**Ubicación:** [backup-db.cjs:10](C:/Proyectos/FincaJIRAH/scripts/backup-db.cjs:10), [package.json](C:/Proyectos/FincaJIRAH/package.json), estado de Git y documentación de operación.

Existe respaldo consistente de SQLite mediante `VACUUM INTO`, guardado en la misma máquina y ejecutado manualmente. No se encontró una automatización del repositorio que garantice copias externas programadas, retención, alertas de fallos y restauración comprobada para el alojamiento definitivo. Los reportes XLSX no reemplazan una copia de la base con usuarios, permisos e historial.

Hay componentes esenciales, migraciones, pruebas y scripts todavía sin registrar en Git. No existe una canalización de CI en `.github`. La compilación local usa Node 26.8.1 y el paquete no fija versión; la documentación actual de Vercel ofrece Node 24 y 22. No se ha probado aquí una instalación limpia de la aplicación en Linux/Node 24.

**Cierre exigido:** versión completa registrada, compilación reproducible con Node soportado, generación de Prisma explícita, migraciones controladas, entornos de prueba y producción separados, secretos protegidos, respaldo externo y restauración ensayada. Configurar monitoreo de disponibilidad y fallos de correo/sincronización, además de un responsable de soporte y recuperación.

### H08 P2 Falta una preparación offline comprobable por el usuario

**Ubicación:** [offline.service.ts:26](C:/Proyectos/FincaJIRAH/lib/services/offline.service.ts:26), [dashboard/layout.tsx:241](C:/Proyectos/FincaJIRAH/app/dashboard/layout.tsx:241), [worker/index.js](C:/Proyectos/FincaJIRAH/worker/index.js).

Actualmente se requiere ingresar con red y visitar pesaje, clasificación y pendientes. Hay alertas de bloqueo de IndexedDB y respaldo JSON, pero no un proceso que compruebe páginas/recursos, catálogos e identidad y confirme «Este dispositivo está preparado para trabajar sin conexión». El rótulo Online usa `navigator.onLine`: no demuestra que el servidor sea alcanzable ni que los pendientes estén confirmados.

No se encontró solicitud de persistencia con `navigator.storage.persist()` ni comprobación de capacidad con `estimate()`. El almacenamiento web puede fallar o ser desalojado; solicitar persistencia reduce riesgos donde se concede, pero no constituye un respaldo ni impide que la persona borre datos del sitio. WebKit documenta almacenamiento de mejor esfuerzo y expulsión por presión de espacio o inactividad.

El worker propio no procesa la cola en segundo plano. La sincronización se ejecuta desde React con la aplicación abierta o reabierta. No se puede prometer envío automático con la aplicación cerrada en ambos sistemas móviles. La disponibilidad de Background Sync es limitada entre navegadores.

**Cierre exigido:** preparación guiada automática, estado verificable, último contacto/última confirmación, número de pendientes y caducidad local visibles, tratamiento del almacenamiento insuficiente y prueba de actualización de la PWA con cola pendiente. Conservar el envío al reabrir como garantía de operación y presentar cualquier sincronización adicional de fondo como una mejora dependiente del navegador.

### H09 P2 La interfaz de altas y roles contradice el comportamiento aprobado

**Ubicación:** [personal/nuevo/page.tsx:90](C:/Proyectos/FincaJIRAH/app/dashboard/personal/nuevo/page.tsx:90), [personal/nuevo/page.tsx:202](C:/Proyectos/FincaJIRAH/app/dashboard/personal/nuevo/page.tsx:202), [personal/nuevo/page.tsx:214](C:/Proyectos/FincaJIRAH/app/dashboard/personal/nuevo/page.tsx:214).

El formulario afirma que la contraseña se enviará automáticamente, pero el alta no envía ese correo y el acceso se inicia con un enlace solicitado desde el expediente. En producción, el bloque «La contraseña temporal es» muestra una instrucción, no una contraseña. Además, los nombres de rol sugieren exclusividad de tareas aunque, por la decisión aprobada, los tres roles de campo pueden pesar y clasificar.

**Cierre exigido:** flujo explícito de creación e invitación, mensajes veraces y presentación simple de Administrador / Personal de campo, conservando la compatibilidad interna necesaria. No cambiar las guardas para imponer una separación de personal que el usuario ya descartó.

### H10 P2 Hay parámetros y preferencias que prometen efectos que no ejecutan

**Ubicación:** [compradores/page.tsx:270](C:/Proyectos/FincaJIRAH/app/dashboard/catalogos/compradores/page.tsx:270), [cosecha.ts:38](C:/Proyectos/FincaJIRAH/lib/cosecha.ts:38), [perfil/page.tsx:76](C:/Proyectos/FincaJIRAH/app/dashboard/perfil/page.tsx:76).

La tolerancia por comprador se puede editar, pero el cuadre principal usa el ±4 % fijo aprobado. Hay lógica del contrato anterior que conserva otra semántica. El dato editable puede hacer creer al administrador que cambió el límite de las jornadas actuales.

El tema se guarda localmente y se intenta enviar una vez. Si no hay red, no hay cola ni reintento posterior de esa preferencia; al cargar el perfil, el valor del servidor puede volver a reemplazarlo. El texto afirma que se sincronizará al volver la conexión.

**Cierre exigido:** alinear parámetro, explicación y cálculo con la regla aprobada; no cambiar silenciosamente el denominador ni el margen. Implementar la sincronización de preferencias prometida o limitar explícitamente su alcance local. Eliminar o delimitar el contrato legado después de comprobar sus consumidores.

### H11 P2 La carga de campo crece con todo el historial

**Ubicación:** [PesajeRepository.ts:13](C:/Proyectos/FincaJIRAH/lib/repositories/PesajeRepository.ts:13), [JornadaRepository.ts:21](C:/Proyectos/FincaJIRAH/lib/repositories/JornadaRepository.ts:21), [usePesaje.ts:28](C:/Proyectos/FincaJIRAH/lib/hooks/usePesaje.ts:28), [ComercialRepository.ts:24](C:/Proyectos/FincaJIRAH/lib/repositories/ComercialRepository.ts:24).

Se descargan todos los pesajes aunque el formulario solo muestre diez; se consultan jornadas con su detalle y el historial comercial completo sin paginación. Esto es funcional con pocos datos, pero genera trabajo y transferencia crecientes en una finca con señal esporádica. No se realizó una medición de carga con años de producción, por lo que no se afirma que ya se haya agotado un límite de capacidad.

**Cierre exigido:** conjuntos de trabajo de campo acotados, filtros y paginación del servidor, manteniendo exportaciones completas por una vía apropiada. Medir con el volumen esperado y verificar índices antes de añadir infraestructura adicional.

### H12 P2 Sigue existiendo una alerta de seguridad de dependencia con mitigación local

**Ubicación:** [package.json](C:/Proyectos/FincaJIRAH/package.json), [harden-braces.cjs:1](C:/Proyectos/FincaJIRAH/scripts/harden-braces.cjs:1).

La cadena PWA → fast-glob → micromatch → braces sigue reportando GHSA-vfj7-8cjw-p6xm. El proyecto aplica un límite de profundidad con validación de versión y hash; el caso de prueba de patrones profundos pasa. Esa defensa local no elimina el aviso del registro ni equivale a una versión oficial corregida. El aviso consultado no anuncia una versión parcheada.

**Cierre exigido:** revisar exposición real y cadena de dependencia en el entorno de compilación/producción, mantener la mitigación verificada mientras sea necesaria y sustituir/actualizar cuando exista una ruta compatible. No ejecutar `npm audit fix --force` aceptando una degradación de Next.js o del paquete PWA. Registrar la decisión y volver a auditar cada versión de entrega.

## Trazabilidad de requisitos

«Implementado» describe el flujo inspeccionado y los casos cubiertos por pruebas; no implica aceptación en el entorno definitivo.

| Requisito | Estado actual | Qué falta o qué limita su aceptación |
| --- | --- | --- |
| REQ-01.1 Iniciar sesión | Implementado | Dominio HTTPS, cuenta real y pruebas en despliegue. No se encontró un acceso administrativo por cambiar la URL en los casos probados. |
| REQ-01.2 Recuperar contraseña | Implementado, servicio pendiente | SMTP real y uso del enlace desde correo real. H06. |
| REQ-02.1 Teléfono y avatar | Implementado | Requiere conexión; validar en teléfonos reales. Campos sensibles protegidos por el servidor. |
| REQ-02.2 Cambiar contraseña | Implementado | Contraseña actual, política nueva y revocación de sesiones comprobadas. |
| REQ-02.3 Preferencias | Parcial | Persistencia local sí; reenvío diferido del tema no. H10. |
| REQ-03.1 Crear personal | Implementado con brecha de entrega | Invitación separada del alta, SMTP y textos contradictorios. H06/H09. |
| REQ-03.2 Consultar personal | Implementado | Límite de 50 resultados en búsquedas; no hay paginación general ni medición del objetivo de menos de un segundo. |
| REQ-03.3 Editar personal | Implementado | Identidad estructural protegida. Aclarar etiquetas de rol según el acuerdo posterior. |
| REQ-03.4 Desactivar/reactivar | Implementado | Revocación central comprobada. Una cuenta desactivada no debe enviar su cola; falta procedimiento de rescate administrativo cuando sea necesario. |
| REQ-04.1 Campañas | Parcial | Datos, parámetros/versiones y bloqueo histórico de tara presentes. Cierre con pendientes desconectados sin resolver. H03. |
| REQ-04.2 Lotes | Implementado | Borrado lógico y protección de uso activo; probar operación con datos del cliente. |
| REQ-04.3 Compradores | Implementado con incoherencia | Exportador/mayorista y referencias conservadas; campo de tolerancia ambiguo frente al ±4 % fijo. H10. |
| REQ-05.1 Pesaje | Implementado | Individual o grupos, cantidades, bruto/tara/neto, responsable y fecha/hora. Offline condicionado por H01/H08. |
| REQ-05.2 Clasificación | Implementado | Jornada + campaña + lote, cinco categorías, captura el mismo día, fórmulas compartidas, ±4 % y aprobación administrativa. |
| REQ-05.3 Rechazo del comprador | Implementado y ampliado | Entrega concreta, varias devoluciones, tara/bruto/neto y ajuste separado del original. No se inventa atribución de lotes. |
| REQ-05.4 Sincronización offline | Parcial para entrega | Cola, identidad por usuario, confirmación por ID, lotes e idempotencia presentes. H01/H03/H04/H08 y teléfonos reales pendientes. |
| REQ-06.1 Tablero | Implementado | Métricas y pendientes diferenciados; medir volumen y validar lectura con el administrador. |
| REQ-06.1.1 Fechas | Implementado | Día de Ecuador y validación de rangos probados. |
| REQ-06.1.2 Lote | Implementado | Filtro por lote. No inferir rendimiento por edad: no se ha modelado una analítica agronómica de edad de plantas. |
| REQ-06.1.3 Campaña/funda | Campaña implementada | Se muestra funda y se filtra por campaña; no existe un filtro independiente para agrupar varias campañas por color de funda. Aclarar aceptación si se exige ese filtro separado. |
| REQ-06.1.4 PDF/Excel | Implementado | CSV adicional, detalle completo e historial; XLSX con fórmulas. Abrir e imprimir archivos en las herramientas reales del administrador. |
| Entregas con varios orígenes | Implementado | Saldos y reservas concurrentes probados; requiere conexión. |
| Varias devoluciones y rechazo sin atribuir | Implementado | Ajuste exacto por filtro parcial puede no ser calculable; se advierte y no se reparte automáticamente. |
| Reventa nacional del retorno | Implementado | Control de saldo sin contar otra cosecha. |
| Correcciones administrativas | Implementado para jornadas clasificadas | Motivo y antes/después, nueva aprobación cuando corresponde, bloqueo por entregas vigentes. Revisar capturas abiertas erróneas y cierres de campaña. |
| Anulación administrativa | Implementado | Motivo, historial y orden reventa → devolución → entrega. Probado en concurrencia. |
| Inicio limpio del cliente | Implementado | Solo admin; preparar identidad y dominio reales en una base de producción separada. |
| Siete días sin señal | Política local implementada, operación incompleta | H01 impide aceptarlo como requisito satisfecho de extremo a extremo. |
| Instalación Android/iOS | Configuración parcial | H05/H08 y aceptación física pendiente. |

No forman parte del alcance aprobado: módulo de dinero, facturación, cuentas por cobrar, precios o pagos; descarte pesado separado de exportación/nacional; clasificación automática de cada fruto por imagen o balanza; edición offline general de catálogos y movimientos comerciales. El historial comercial sirve de respaldo de pesos, pero no constituye contabilidad. La imagen fotorealista se conserva; el prototipo 3D no está aceptado como acabado del producto.

El documento académico debe actualizarse para reflejar: permiso de campo combinado, contraseña de al menos 15 caracteres frente a la política antigua de 8, denominador del cuadre confirmado, origen de los rechazos por entrega y alcance preciso del modo offline. No debe prometer detección de teléfonos desconectados ni sincronización universal con la aplicación cerrada.

## Seguridad y calidad de implementación

Hay separación de rutas, controladores, servicios y repositorios; fórmulas de jornada compartidas entre interfaz y servidor; transacciones y control de versiones en operaciones sensibles; idempotencia por identidad de operación; bloqueo de sobreventa y devoluciones excesivas; historial de correcciones y anulaciones.

Los casos actuales verifican JWT vencidos/inventados, revocación persistente al desactivar o cambiar contraseña, permisos obtenidos de la cuenta vigente, rechazo de actores falsificados, peticiones de origen ajeno y cuerpos excesivos, límites de acceso persistentes, token de recuperación guardado como hash y de un solo uso, validación de entradas y ausencia del hash de contraseña en respuestas públicas. La API no se autoriza por ocultar botones.

La identidad guardada en el teléfono habilita captura local; no es una credencial con la que se pueda saltar la autenticación del servidor. No permite comprobar de inmediato una revocación ocurrida mientras el teléfono no tiene red. Tampoco hay deduplicación física de una misma gaveta registrada por dos personas con identificadores diferentes; hace falta organización del trabajo.

Antes de publicar deben verificarse HTTPS, cookies en el dominio final, cabeceras del proxy y límites para no aceptar IP declarada por el cliente ni agrupar injustificadamente a toda la finca. El valor seguro actual no confía en esas cabeceras; no debe cambiarse a ciegas. La base remota debe ser accesible solo por el servidor, con secreto privado, TLS y privilegios adecuados.

No se incorporó MFA ni un servicio externo de contraseñas comprometidas. Se pueden considerar para endurecer la cuenta administradora, pero no son requisitos originales cumplidos que debamos anunciar. El despliegue necesita monitoreo y una política de actualización de dependencias; pasar pruebas locales no sustituye esas medidas.

### Observaciones del frontend

- [personal/nuevo/page.tsx:202](C:/Proyectos/FincaJIRAH/app/dashboard/personal/nuevo/page.tsx:202): las etiquetas de roles no representan las capacidades actuales.
- [personal/nuevo/page.tsx:214](C:/Proyectos/FincaJIRAH/app/dashboard/personal/nuevo/page.tsx:214): se promete un correo automático inexistente en el alta.
- [perfil/page.tsx:321](C:/Proyectos/FincaJIRAH/app/dashboard/perfil/page.tsx:321): se promete sincronización posterior de una preferencia sin cola.
- [reportes/page.tsx:33](C:/Proyectos/FincaJIRAH/app/dashboard/reportes/page.tsx:33): los filtros cambian estado local sin actualizar la URL; volver a abrir el enlace no reproduce los cambios hechos en pantalla.
- [personal/nuevo/page.tsx:138](C:/Proyectos/FincaJIRAH/app/dashboard/personal/nuevo/page.tsx:138): los errores generales no tienen anuncio accesible ni el envío enfoca el primer campo inválido.
- [perfil/page.tsx:312](C:/Proyectos/FincaJIRAH/app/dashboard/perfil/page.tsx:312): `transition-all` incumple la preferencia de animar propiedades explícitas; mejora menor.

Las bibliotecas de exportación se cargan bajo demanda y el GLB experimental no se descarga en el acceso normal, aspectos favorables para la carga inicial. Se verificaron vistas automatizadas móviles, pero siguen pendientes teclado decimal, brillo exterior, instalación, áreas seguras y cierres del sistema en teléfonos del cliente.

## Arquitectura propuesta para entregar con sencillez

| Parte | Decisión recomendada | Motivo y trabajo necesario |
| --- | --- | --- |
| Aplicación | Conservar Next.js + React + TypeScript | El producto ya está integrado; no hay evidencia para una reescritura. |
| Acceso a datos | Conservar Prisma, adaptarlo al motor final | Mantener servicios y transacciones; revisar semántica de concurrencia y migraciones. |
| Base central | PostgreSQL administrado; Neon como candidato concreto | Evita operar el archivo de SQLite y facilita un despliegue administrado. Elegir conexiones, región, retención/restauración y plan apropiados. |
| Alojamiento | Vercel con un plan permitido para el uso comercial | Encaje con Next.js y despliegue desde Git. No es un sitio estático; las API requieren servidor. |
| Datos sin señal | Conservar IndexedDB y cola propia | Son los que permiten capturar en el teléfono; PostgreSQL permanece en el servidor. |
| PWA | Corregir la política explícita de caché, preparación y actualizaciones | Evaluar el mantenimiento y dependencias del paquete actual. Cambiar de biblioteca por sí solo no demuestra fiabilidad. |
| Sesiones | Conservar los controles que ya pasan pruebas | Revalidar dominio, cookies, proxy y nueva base. No reemplazar toda la autenticación sin una necesidad concreta. |
| Correo | Proveedor transaccional administrado compatible con SMTP | Configurar remitente/dominio y comprobar entrega real. |
| Operación | Copias externas, restauración, monitoreo, CI y entornos separados | La facilidad para el cliente depende de que estas tareas las resuelva el equipo de entrega. |

La alternativa de menor cambio inmediato es un servicio Node administrado con volumen persistente y SQLite, una instancia y respaldo externo. Es válida para una finca pequeña, pero conserva más cuidado alrededor del archivo y del escalado. Para la prioridad expresada de facilitar entrega y mantenimiento, recomiendo la base central administrada; la decisión no depende de que SQLite sea «malo».

Vercel permite conectar PostgreSQL de proveedores externos mediante Marketplace. El plan Hobby se limita a uso personal no comercial según su documentación actual; no se debe basar la entrega de este producto de cliente en asumir que todo será gratuito. Antes de contratar se necesita acordar presupuesto recurrente, titularidad de cuentas, facturación y soporte.

PostgreSQL requiere trabajo real: nueva configuración y migraciones, adaptación de semilla/respaldo/pruebas, gestión de conexiones, revisión de concurrencia del limitador y operaciones comerciales y validación en un entorno limpio. No migrar únicamente producción mientras desarrollo y las pruebas siguen certificando otro motor. No atribuir resultados de pruebas SQLite a PostgreSQL sin ejecutarlas allí.

## Experiencia final que debemos entregar

1. El administrador recibe el enlace HTTPS definitivo y acceso privado a su cuenta real; establece su propia contraseña.
2. Completa los catálogos reales y crea el personal; las invitaciones y la recuperación funcionan sin intervención del desarrollador.
3. En cada teléfono, el trabajador inicia con conexión. La aplicación prepara pantallas y catálogos y confirma que está lista para campo. La instalación se guía según Android/iOS; no debe necesitar configurar herramientas técnicas.
4. Sin señal, guarda pesajes y clasificación de su jornada y ve cuántos registros están pendientes. Reabrir funciona durante la ventana permitida, sujeto a la conservación del almacenamiento por el teléfono.
5. Al recuperar señal y abrir/mantener abierta la aplicación, se envían los pendientes; si la sesión central venció, se solicita ingreso y se continúa conservando la cola.
6. Los conflictos quedan visibles: la primera clasificación válida confirmada conserva su versión; la segunda no sobrescribe. El administrador resuelve las discrepancias con historial. No se aplica «gana el último» sin revisión.
7. El administrador usa reportes y movimientos comerciales; el equipo responsable recibe alertas de fallos y puede restaurar una copia si hay un incidente.

El resultado para el cliente sí puede ser «abrir el enlace y trabajar», una vez preparada esta operación. El primer uso offline de un teléfono que nunca cargó la aplicación no es posible; tampoco se puede garantizar la conservación si se borran los datos del navegador o se pierde el dispositivo antes de sincronizar.

## Secuencia de implementación y aceptación

1. **Cerrar defectos funcionales prioritarios:** caché de siete días, errores transitorios, cierre y conciliación de pendientes; añadir casos de regresión dirigidos. Preparación automática, iconos, estado de conexión real y actualización con pendientes.
2. **Preparar la base central administrada:** adaptar Prisma, migraciones, semilla, respaldos y pruebas al motor final. Fijar Node soportado; validar instalación limpia y compilación de la versión registrada. No crear recursos de pago sin presupuesto acordado.
3. **Cerrar accesos y coherencia del producto:** SMTP, identidad real, invitación, recuperación, política de trabajadores sin correo si aplica, roles, tolerancia y preferencias. Completar el filtro por funda si se confirma como filtro independiente.
4. **Publicar un entorno de aceptación separado:** mismo tipo de infraestructura que producción, dominio estable y HTTPS; verificar cookies, proxy, límites, correo, respaldos y restauración. No usar la base de pruebas como producción por accidente.
5. **Ensayo con el cliente:** Android/Chrome e iPhone/Safari instalados, modo avión, red intermitente, cierre/reinicio, dos dispositivos sobre la misma jornada, sesión vencida, días 2/6/7, campaña cerrada, actualización con pendientes y poco almacenamiento. Reproducir sus pesos conocidos y comparar las exportaciones.
6. **Entrega:** base limpia de producción, solo admin inicial, catálogos reales cargados por el responsable, manual breve, responsables y evidencia de aceptación. El vínculo y las credenciales se entregan después de estos controles.

## Fuentes externas verificadas

- [Vercel: limitación de SQLite local](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel).
- [Vercel: conexiones PostgreSQL administradas](https://vercel.com/docs/postgres).
- [Vercel: alcance del plan Hobby](https://vercel.com/docs/plans/hobby).
- [Vercel: versiones de Node admitidas](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).
- [Neon: integración con Prisma](https://neon.com/docs/guides/prisma).
- [MDN: disponibilidad de Background Sync](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API).
- [WebKit: persistencia, cuotas y expulsión de almacenamiento](https://webkit.org/blog/14403/updates-to-storage-policy/).
- [GitHub Advisory: GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
- [Vercel Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md).

Los registros de ejecución y las comprobaciones aisladas de esta auditoría están en `C:/Proyectos/FincaJIRAH/prisma/backups/auditoria-20261022-*`. No incluyen credenciales reales ni una copia publicada de la base del cliente.
