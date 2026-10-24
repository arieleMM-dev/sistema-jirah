# Operación sin conexión y conflictos

## Alcance real

La PWA permite capturar nuevos pesajes y clasificaciones en el navegador preparado, conservando responsable, fecha, gavetas, brutos y parámetros aplicados. IndexedDB conserva la cola aunque se cierre o recargue la pantalla. Guardado local y confirmación en el servidor son estados distintos.

No permite editar libremente todos los registros sin red. Personal, catálogos, reportes actuales, entregas, devoluciones, anulaciones, aprobaciones y correcciones administrativas necesitan conexión. Las jornadas cerradas solo se corrigen por el administrador, con motivo e historial, comprobando dependencias comerciales.

## Preparar cada teléfono

1. Publicar la compilación con HTTPS; para pruebas locales usar `npm run build` y `npm start`. `npm run dev` deshabilita el service worker y no sirve para aceptar el requisito PWA.
2. Abrir el dominio definitivo con internet e iniciar sesión con cuenta aprobada. Esperar **Listo para trabajar sin conexión**: la aplicación prepara automáticamente Pesaje Bruto, Clasificación, Pendientes, sus recursos y el contexto de campañas/lotes/jornadas, sin exigir visitar cada formulario. Si no termina, el aviso indica el problema y permite comprobar de nuevo. La preparación solicita persistencia al navegador y comprueba espacio disponible; el navegador decide si concede persistencia.
3. Instalar la PWA si el navegador lo permite. El inicio instalado apunta a Pesaje Bruto para evitar necesitar el panel administrativo al abrirla sin conexión.
4. Cortar la conexión en el teléfono real, cerrar/reabrir y confirmar que siguen disponibles las tres pantallas y catálogos antes de comenzar una jornada real.

Cada teléfono necesita esa preparación. Un teléfono nuevo sin conexión no puede descargar ni autenticar por primera vez. El dominio, protocolo, perfil de navegador y dispositivo definen el almacenamiento; cambiar de origen no traslada los pendientes.

Los service workers requieren contexto seguro en producción ([MDN: uso de service workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)). La excepción localhost permite pruebas en el mismo equipo; abrir una IP de red mediante HTTP desde un teléfono no equivale a HTTPS.

## Guardado y sincronización

Los nuevos registros se guardan primero en IndexedDB, incluso al tener conexión. Después se envían por cuenta, en lotes de hasta 100, primero pesajes y después clasificaciones. Cada operación conserva UUID. Solo se retiran de la cola los IDs confirmados expresamente por el servidor.

La sincronización se dispara al abrir la app autenticada, recuperar conexión, guardar un registro o pulsar reintentar. Fallos de transporte, tiempo de espera, límites temporales HTTP 429 y errores de servidor tienen reintentos con espera creciente. Cada envío tiene un plazo de 30 segundos; recibir 429 respeta el `Retry-After` numérico hasta 60 segundos. El indicador `navigator.onLine` no garantiza internet: si la red existe pero el servidor no responde, el registro permanece local.

La sincronización actual depende de mantener o volver a abrir la aplicación. No existe una tarea que garantice vaciar la cola con el teléfono bloqueado o la PWA cerrada. La [API Background Synchronization](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API) tiene disponibilidad limitada y no se usa como garantía del proceso.

Política aprobada por el propietario: la sesión del servidor dura 8 horas, pero la identidad para captura local permanece disponible hasta 7 días desde una preparación completa con sesión válida. Leer la caché, abrir la PWA sin red o consultar rutinariamente la sesión no renueva esos siete días. La preparación se vuelve a intentar con red y periódicamente mientras la app está abierta. El aviso muestra su fecha límite; la caché de las tres pantallas se configuró para ocho días, superior a la ventana de captura. Las identidades del formato anterior conservan únicamente su vigencia original hasta completar la preparación con conexión.

Después de las 8 horas se puede continuar capturando localmente dentro de ese plazo; al reconectar, el servidor puede exigir ingresar de nuevo antes de sincronizar. Una respuesta explícita de sesión inválida retira la identidad local y vuelve al ingreso, conservando la cola. Un error de red, un límite temporal o una caída del servidor conserva la identidad local vigente, incluso si el teléfono indica conexión. Al llegar a siete días sin validación hay que conectarse para habilitar de nuevo la captura.

No se alarga la duración del JWT ni se autoriza una API mediante el almacenamiento local. La desactivación de una cuenta se comprueba al reconectar y puede impedir recibir sus pendientes; conservar/exportar esa evidencia para revisión administrativa. Se confirmó que los teléfonos serán Android e iOS; siguen pendientes sus pruebas físicas y de navegador real.

## Qué ocurre entre dos personas

| Caso | Comportamiento |
| --- | --- |
| Dos personas capturan gavetas distintas en la misma jornada | Se agregan ambos pesajes mientras la jornada siga abierta; no se reemplazan. |
| Se reenvía una misma operación tras perder su respuesta | El UUID y su contenido permiten confirmarla sin duplicar. |
| Se intenta reutilizar un UUID con contenido diferente | Conflicto; no sobrescribe el original. |
| Dos personas clasifican la misma versión de la jornada | Se confirma la primera operación válida; la segunda queda pendiente con error, sin sobrescribir. No hay prioridad por jerarquía ni por hora del teléfono. |
| Llega un pesaje nuevo antes de confirmar una clasificación antigua | Cambian la versión y la lista de pesajes; esa clasificación se rechaza por información desactualizada. |
| Llega un pesaje después de que la jornada ya fue clasificada | Permanece pendiente; incorporación exclusiva mediante corrección administrativa con historial. |
| Se corrige una jornada mientras otro navegador conserva datos antiguos | Se rechaza la versión obsoleta; reintentar el original no deshace una corrección confirmada. |
| Se cierra una campaña o inactiva un lote antes de recibir un teléfono | Se admite por sincronización una captura cuya fecha original sea anterior al cierre/inactivación registrados. No habilita nuevas capturas online; una jornada ya clasificada sigue requiriendo corrección administrativa. Cierres antiguos sin fecha comprobable no reciben esa excepción. |

La comprobación y el cambio de estado se ejecutan en una transacción. No se aplica «el último gana». Una clasificación válida recibida primero puede representar una captura física equivocada: la resolución de negocio corresponde al administrador, no a una elección automática del sistema.

Dos personas registrando por separado la misma gaveta física generan UUID distintos; el sistema no puede deducir por sí solo que se trata de la misma fruta. Hace falta coordinar responsables o, si el cliente lo requiere, introducir una identificación física de gavetas. La idempotencia evita duplicados de reenvío, no duplicados de captura humana.

## Resolver sin perder evidencia

Revisar Pendientes, descargar el respaldo y leer el error. Pausar conserva una operación y detiene sus reintentos; no la elimina. Con conexión, una clasificación pendiente sobre jornada abierta puede revisarse con motivo conservando el original y generando un reemplazo. Si la jornada está cerrada, el administrador debe corregirla con historial. Si tiene entregas vigentes, primero se concilian las dependencias comerciales.

No borrar datos del navegador ni prestar una sesión abierta mientras existan pendientes. No usar navegación privada como almacenamiento de trabajo. Los navegadores pueden eliminar almacenamiento bajo sus propias políticas; la implementación no ofrece un respaldo remoto de lo que todavía no se sincronizó ([MDN: caché y almacenamiento](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching)). Descargar respaldo y sincronizar al terminar cada jornada.

## Aceptación necesaria

Probar con dos teléfonos reales y una base de ensayo: preparación inicial, modo avión, cierre/reapertura, pérdida de señal durante el envío, recepción tardía, versiones distintas, doble clasificación, sesión vencida, cuenta desactivada, cambio de usuario y actualización de la aplicación con pendientes. Comprobar IDs y totales en servidor, no solo el mensaje visual.

Verificación del 11 de octubre de 2026: 67 pruebas aprobadas con `npm run test:e2e`, incluida la base de pruebas de servicios, HTTP real y navegador Chrome. Cubren cola, idempotencia, parámetros históricos, recepción tardía, transacciones, conflicto simultáneo entre dos responsables y reapertura offline desde el inicio instalado. El navegador comprobó que un JWT vencido no envía los pendientes, que estos sobreviven al nuevo ingreso y se confirman una sola vez. Se simuló API de sesión caída con conexión aparente: acceso local a las nueve horas y bloqueo después de siete días, sin renovar la identidad por usar la caché.

La ampliación del 22 de octubre añade preparación automática, navegación offline a clasificación sin visita manual previa, caché de páginas envejecida seis días, reapertura, sesión vencida y sincronización después del ingreso. Los errores transitorios individuales dentro de HTTP 200 ahora reciben reintento; los conflictos de negocio conservan su resolución explícita. Una versión nueva del service worker espera y la interfaz bloquea su activación si hay pendientes de cualquier cuenta en el dispositivo. La sustitución real por otra compilación con cola pendiente todavía requiere su ensayo específico.

La prueba de siete días adelanta el reloj del navegador; no representa una observación física de siete días ni reproduce las políticas de expulsión de almacenamiento de iOS. Todavía se requiere aceptación con los equipos y condiciones reales de la finca. No se declara terminada esa validación física.
