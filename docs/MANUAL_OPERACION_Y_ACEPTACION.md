# Operación y aceptación de Finca JIRAH

## Preparar campañas y dispositivos

El administrador registra compradores, lotes y campañas. La campaña contiene código, nacimiento opcional, cultivo, funda, tara y mínimos G/P. Use una campaña para fruta de un mismo nacimiento; puede cosecharse en varios días y lotes. El comprador asignado a la campaña es una referencia: cada entrega tiene su comprador real.

Use 1,70 kg como tara habitual en finca. Si ya hay pesajes, la campaña conserva su tara y cultivo. Los mínimos pueden cambiar para jornadas nuevas; las existentes y las capturas pendientes conservan los parámetros con los que empezaron.

Antes de salir sin señal, ingrese con conexión y abra Pesaje Bruto, Clasificación y Pendientes. Verifique campaña y lote. El primer ingreso, renovar el acceso al servidor y obtener un catálogo nuevo necesitan conexión. Use el mismo navegador y cuenta para recuperar pendientes; no borre sus datos. Cerrar sesión no elimina la cola de trabajo.

## Capturar y clasificar

La identidad para captura local dura hasta siete días desde la última validación real con internet. La sesión del servidor dura ocho horas: al reconectar puede solicitar ingresar de nuevo antes de sincronizar, conservando los pendientes. Mantenga o vuelva a abrir la aplicación cuando recupere señal. Consulte [Operación offline y conflictos](OPERACION_OFFLINE_Y_CONFLICTOS.md) para preparar cada teléfono y resolver capturas simultáneas; el flujo no garantiza envío con la app cerrada.

1. En **Pesaje Bruto**, elija campaña y lote. Ingrese gavetas y peso bruto total. Una gaveta individual usa cantidad 1; un grupo usa su cantidad real. No ingrese neto en el campo de bruto.
2. Confirme y espere el aviso de guardado en el dispositivo. Responsable y fecha/hora quedan asociados a la captura. Con señal, se sincroniza automáticamente; sin señal, permanece en Pendientes.
3. En **Clasificación**, abra la jornada del día, campaña y lote. Mantenga los lotes separados y complete G, P, N1, N2 y N3. Las categorías sin fruta se registran con cero gavetas y cero bruto.
4. G es exportación desde 280 g y P desde 180 g hasta menos de 280 g, según los parámetros de esa jornada y siempre que cumpla calidad. N1/N2/N3 son tamaño visual de fruta nacional. La categoría la elige el trabajador; no se clasifica automáticamente cada fruto.
5. Revise neto y cuadre antes de guardar. Un descuadre superior a ±4 % queda pendiente de aprobación administrativa y no habilita la entrega de esa jornada.

La clasificación se captura el día de cosecha. Una captura de ese día puede llegar más tarde al servidor. Si otro dispositivo cerró antes de recibir un pesaje, este conserva su error y contenido; el administrador puede incorporarlo mediante corrección auditada desde el respaldo de Pendientes, siempre que no existan entregas vigentes.

## Pendientes y correcciones

En **Pendientes**, revise el motivo de los rechazos de sincronización. Puede reintentar, pausar/reactivar y descargar un respaldo JSON. Una clasificación local cuyo contexto cambió puede revisarse explícitamente: conserva su original y registra el motivo del reemplazo. No elimine un registro para ocultar un conflicto.

El administrador puede abrir **Corregir jornada cerrada**, ajustar pesos/categorías y escribir un motivo. Se guardan valores anteriores y posteriores, administrador y fecha. La corrección recalcula el cuadre y deja sin efecto la aprobación previa. El historial aparece en pantalla y descargas. Las jornadas con entregas vigentes quedan bloqueadas; concilie primero esos movimientos mediante las anulaciones descritas a continuación.

## Entregas y devoluciones

En **Entregas y devoluciones**, seleccione comprador, fecha, tara de entrega y uno o varios orígenes con categoría. Cada origen muestra saldo neto disponible. Registre gavetas reales y bruto; pueden diferir de las gavetas de cosecha por redistribución. Se admiten varios lotes y campañas en una entrega. Las operaciones comerciales requieren conexión.

Para una devolución, seleccione entrega de exportación, fecha, gavetas, bruto, tara utilizada al pesar de vuelta en finca y motivo. Mantenga **Sin atribuir** si el comprador no identifica el origen. Se permiten varias devoluciones; nunca se reparte un rechazo automáticamente entre lotes.

El rechazo reduce exportación aceptada y aumenta nacional ajustada, conservando clasificación original. Para venderlo como nacional, seleccione comprador mayorista y origen **Devolución** con N1/N2/N3. Se controla su saldo sin sumar otra cosecha.

Si perdió conexión al enviar, conserve los mismos datos y reintente: se reutiliza la identidad de operación para evitar duplicados. Consulte el historial antes de registrar otro movimiento.

## Anular un movimiento equivocado

Solo el administrador puede anular con conexión. Abra el movimiento en **Historial de entregas**, despliegue **Anular entrega** o **Anular devolución**, escriba el motivo y marque la confirmación. La anulación conserva el original, administrador, fecha y motivo; no borra filas ni permite reutilizar su identidad como otro movimiento.

El sistema exige resolver las dependencias en orden inverso: **reventa → devolución → entrega original**. Si hay una reventa vigente, no se anula su devolución; si hay una devolución vigente, no se anula su entrega. Cada anulación restaura el saldo correspondiente y queda excluida de los totales vigentes y del ajuste comercial. El historial y las descargas conservan las filas señaladas como ANULADA.

Después de conciliar todas las entregas vigentes de una jornada, puede corregirla con historial y volver a registrar los movimientos correctos con nuevas referencias. Una jornada que quede fuera de margen vuelve a necesitar aprobación antes de entregar. No se rehabilita un movimiento anulado: se registra el reemplazo correcto para mantener la evidencia.

## Leer reportes

En **Reportes**, filtre campaña, lote y fechas de cosecha. El tablero es un resumen; use Reportes para descargar todo el detalle. CSV, XLSX y PDF incluyen información del filtro, movimientos comerciales relacionados e historial de correcciones.

Se diferencian clasificación original, ajuste por devolución, jornadas sin clasificar e históricos del formato anterior. El cuadre usa jornadas clasificadas; los pendientes no se presentan como pérdidas. Los históricos no se inventan como cinco categorías.

Si una entrega contiene orígenes fuera del filtro y tiene rechazo sin atribuir, su ajuste exacto aparece como no calculable. Amplíe el filtro a todos los orígenes para ver el agregado; esto no atribuye el rechazo a ningún lote.

## Prueba de aceptación con el cliente

Realizar en una copia de prueba y con pesos conocidos antes de registrar producción real:

- Reproducir una jornada con dos lotes, dos responsables, una gaveta parcial y un grupo; comprobar bruto, tara y neto manualmente.
- Completar las cinco categorías; verificar límites G/P y elección visual de nacional.
- Probar cuadre dentro y fuera de ±4 %; comprobar aprobación exclusiva de admin con motivo.
- Capturar sin conexión, recargar, reconectar y comprobar ausencia de pérdidas/duplicados.
- Provocar un pesaje tardío, descargar Pendientes e incorporarlo mediante corrección; verificar autor, fecha e historial.
- Preparar una entrega de varios orígenes con tara distinta; registrar dos devoluciones, una sin atribuir, y revender el retorno como nacional.
- Intentar anular la entrega con dependencias; comprobar el bloqueo. Anular reventa, devolución y entrega en ese orden y verificar saldos, motivos, responsables y conservación del historial.
- Comparar original y ajustado; filtrar un solo origen y comprobar que no se reparta el rechazo desconocido.
- Descargar y abrir CSV, XLSX y PDF en las herramientas del administrador; cotejar totales y revisar fórmulas e impresión del XLSX.
- Probar el teléfono real de campo: pantalla, teclado decimal, mala señal, batería, cierre de sesión y almacenamiento.
- Confirmar recepción y uso único de un enlace real de contraseña y restauración del respaldo en una base separada.

Registrar fecha, versión, resultados y observaciones. Las pruebas automatizadas no sustituyen la aceptación del proceso real.
