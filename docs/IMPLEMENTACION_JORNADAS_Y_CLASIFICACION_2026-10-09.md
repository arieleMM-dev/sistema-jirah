# Jornadas, categorías y aprobación de descuadres

Fecha: 9 de octubre de 2026. Entorno: desarrollo y datos de prueba.

## Resultado y alcance

Se implementó la unidad de negocio campaña + fecha de cosecha + lote. Varios pesajes, incluso de distintos trabajadores, alimentan una sola clasificación del grupo en G, P, N1, N2 y N3. Se conserva la arquitectura de rutas, controladores, servicios y repositorios; no se incorporaron dependencias nuevas.

Esta fase implementa la captura y el cuadre originales en finca. El reporte completo del cliente y la entrega/devolución comercial siguen pendientes. Las tablas anteriores permanecen para conservar su información; no se distribuyeron pesos históricos entre categorías o días inferidos.

## Comportamiento implementado

1. El pesaje admite una o varias gavetas, bruto, observaciones y autor autenticado. Guarda hora de captura y hora de sincronización por separado. La fecha operativa del grupo se obtiene en `America/Guayaquil`.
2. Los pesajes nuevos forman una jornada por campaña, fecha y lote. La cantidad cosechada es la suma de gavetas, aunque haya menos registros de pesaje.
3. La clasificación registra cantidad y bruto por categoría. Se permiten categorías vacías con cero gavetas y cero bruto. No se exige igualdad entre la cantidad cosechada y la clasificada.
4. La tara y los límites comerciales quedan fijados al crear la jornada en el servidor. P inicia en 180 g y G en 280 g; nacional se describe por selección visual. El catálogo permite editar límites y fecha de nacimiento sin reclasificar jornadas existentes. La fecha de nacimiento es opcional para preservar campañas previas; el código sigue siendo textual y manual.
5. Vista previa y servidor utilizan `lib/cosecha.ts`: neto = bruto − cantidad × tara; exportación = G + P; nacional = N1 + N2 + N3; total clasificado = exportación + nacional; diferencia = cosechado − clasificado; porcentaje firmado = diferencia / clasificado × 100.
6. La decisión de ±4 % se hace antes del redondeo visual. Un total clasificado cero se rechaza como no calculable. Se mantiene la precisión operativa de tres decimales en kg; los porcentajes se muestran con dos.
7. Dentro del margen, el grupo queda `CLASIFICADA`. Fuera del margen queda `PENDIENTE_APROBACION`. Solo un administrador activo puede llevarlo a `APROBADA`, con motivo de 5 a 1.000 caracteres, identidad y fecha. La diferencia original se conserva después de aprobar.
8. Guardar la clasificación cierra la captura del grupo. Antes de guardar se comparan versión e identidades de todos los pesajes. Si otro dispositivo agregó uno, se rechaza el cierre desactualizado; el usuario debe actualizar y revisar los totales. La transacción evita aceptar un subtotal mientras entra otra captura.
9. La pantalla captura la clasificación el mismo día de cosecha. Una operación capturada ese día puede sincronizarse después conservando su fecha. No se agregó un mecanismo de corrección o de carga tardía manual sin acordar sus permisos.
10. El tablero reconoce las clasificaciones nuevas y cuenta cada descuadre pendiente una sola vez por jornada, con los filtros de campaña/lote/fecha. La aprobación retira la alerta pendiente y conserva el resultado original.

## Recorrido de información y archivos

```text
Pesaje individual o de grupo
  → PesajeController → PesajeService → PesajeRepo
  → JornadaCosecha (campaña, fecha local, lote; versión y parámetros)
  → JornadaController → JornadaService → JornadaRepo
  → ClasificacionJornada + cinco DetalleClasificacionJornada
  → CLASIFICADA o PENDIENTE_APROBACION
  → administrador + motivo → APROBADA
```

Las rutas nuevas son `GET/POST /api/campo/jornadas` y `POST /api/campo/jornadas/aprobaciones`. La pantalla está en Campo → Clasificación; los parámetros en Catálogos → Campañas. El servidor obtiene el autor de la sesión, no del identificador enviado por el formulario. El recorrido anterior por pesaje no admite clasificar nuevamente un pesaje perteneciente a una jornada.

El detalle de cada grupo muestra pesajes, responsables, hora, cantidades, categoría, bruto, neto, clasificación, observaciones y evidencia de aprobación. Los nuevos componentes centrales están en `lib/cosecha.ts`, `lib/services/jornada.service.ts`, `lib/repositories/JornadaRepository.ts`, `lib/hooks/useClasificacion.ts` y `lib/local-jornadas.ts`.

## Captura sin conexión y compatibilidad

IndexedDB pasa de versión 1 a 2 agregando el almacén `contextos`; conserva los almacenes de pesajes y clasificaciones. Los catálogos y las jornadas descargadas se guardan por cuenta. La vista local reúne esos datos con los pesajes pendientes propios y evita contar de nuevo un identificador ya confirmado.

La clasificación nueva usa el formato 2, con identificador UUID estable, fecha original, versión del grupo, IDs de pesajes y cinco categorías. La sincronización envía primero pesajes y después clasificaciones. Repetir la misma operación confirmada no crea otra clasificación, y reutilizar su ID con otro contenido se rechaza. Solo se retiran operaciones confirmadas; un conflicto conserva el registro local y su error. Las aprobaciones requieren conexión.

Límites explícitos antes de aceptación del producto:

- No se ha ejecutado una prueba de navegador que actualice una IndexedDB real de versión 1 a 2 ni el recorrido completo en un teléfono/PWA instalado con pérdida de conexión. Las pruebas verifican servicios, combinación local, separación por cuenta, reintentos y conservación de fecha.
- La compatibilidad anterior permite reenviar clasificaciones con brutos y cantidades contra pesajes históricos sin jornada. Una clasificación antigua de un pesaje todavía no sincronizado puede encontrar ese pesaje ya organizado como jornada: queda pendiente para revisión, sin inventar G/P/N1/N2/N3 ni borrarla. No se declara conversión automática de toda cola anterior.
- Si un tercero registra más pesajes o cierra el grupo durante el trabajo offline, el servidor rechaza el cierre desactualizado. Falta una pantalla de conciliación de operaciones pendientes con intervención del administrador; no se ofrece todavía edición o descarte de la cola.
- En una jornada todavía no creada en el servidor, la copia offline del catálogo puede diferir de parámetros editados entretanto. La tara discrepante se rechaza; los límites comerciales se fijan con el catálogo vigente al crear el grupo en servidor. Falta versionar y conciliar el catálogo aplicado a esa primera captura offline. Esto no debe presentarse como historial completo de parámetros offline.
- La política de cierre de campaña con dispositivos pendientes, carga tardía manual, correcciones y captura a nombre de otro responsable continúa pendiente de decisión. La fecha del dispositivo también requiere validación operativa.

Estas limitaciones impiden declarar finalizada la aceptación offline y deben resolverse antes del uso real.

## Migración y conservación de datos

Se aplicó `20261009010000_jornadas_y_categorias` mediante `npm run db:deploy` en la base de desarrollo. Agrega los tres modelos nuevos, los parámetros de campaña y la relación opcional de pesajes con jornada; no reinicia ni rellena categorías o jornadas históricas.

Respaldo consistente previo: `prisma/backups/jirah-2026-10-10T04-34-35-275Z.sqlite` (marca UTC, correspondiente al 9 de octubre en Ecuador). Se comparó el contenido completo de las columnas originales contra ese respaldo, sin imprimir información personal o credenciales:

| Tabla anterior | Registros preservados íntegramente |
|---|---:|
| users | 7 |
| password_reset_tokens | 3 |
| campanas | 4 |
| lotes | 5 |
| compradores | 2 |
| pesajes_brutos | 7 |
| clasificaciones | 1 |
| ajustes_comprador | 0 |

`PRAGMA integrity_check` devolvió `ok` y `foreign_key_check` no encontró incidencias. Las tres tablas nuevas quedaron vacías. No se ejecutó reset ni seed.

## Verificación ejecutada

| Verificación | Resultado |
|---|---|
| `npm test` | 32/32 pruebas correctas, base temporal aislada |
| `npm run test:http` | 33/33 correctas, incluye servidor real y base aislada |
| TypeScript | `npx tsc --noEmit` correcto; compilación final también verifica tipos |
| Compilación | Dos compilaciones consecutivas correctas de la versión final |
| ESLint de los archivos de esta fase | Cero errores, cuatro avisos por parámetros de controladores sin uso |
| ESLint global | 16 errores y 104 avisos pendientes; no se declara el proyecto libre de errores estáticos |
| Conservación e integridad de desarrollo | Ocho tablas originales idénticas al respaldo, sin incidencias de integridad |

Se cubrieron agrupación de varios responsables, separación de lotes y fechas, límite de medianoche en Ecuador, cantidades desiguales entre etapas, cinco categorías, borde ±4 %, signo y denominador cero. Los valores del Excel reprodujeron G 727,50, P 875,90, N1 255,30, N2 225,00, N3 151,00, C 2.234,70 y diferencia 10,80 kg, mostrada como 0,48 %. El caso L4 queda fuera del margen.

También se verificaron versión y conjunto de pesajes, captura/cierre concurrentes, reintentos concurrentes sin duplicación, identidad conflictiva, recepción offline tardía con fecha original, aprobación restringida, motivo obligatorio, conservación de evidencia y alertas del tablero. La prueba HTTP inicia sesión como trabajador, captura y clasifica, rechaza su aprobación, revoca la sesión y comprueba la aprobación con una sesión real de administrador.

Durante la compilación se reprodujo un fallo interno `WasmHash` al reutilizar la caché de disco de Webpack en Windows: limpiar la caché permitía una compilación, pero fallaba la siguiente. `next.config.ts` usa caché en memoria solo en compilaciones de producción en Windows. Dos compilaciones consecutivas verificaron el ajuste. No cambia las cachés de respuestas ni de la PWA; puede aumentar el tiempo de compilaciones sucesivas. Se conserva una copia de diagnóstico bajo `prisma/backups/`.

## Trazabilidad y siguiente etapa

RN-01/RN-03/RN-04/RN-06/RN-08/RN-09 del documento de reglas quedan cubiertas en el nuevo recorrido, con los límites de fecha/corrección y catálogo offline indicados. RN-05 queda cubierta para el pesaje y clasificación en finca; falta la tara comercial de entrega. RN-02 requiere el reporte y las entregas. RN-07 necesita el contrato de origen del rechazo; RN-10 sigue sin respuesta suficiente.

Los casos A-01/A-02/A-04/A-05/A-06/A-07/A-08/A-10/A-11 cuentan ahora con pruebas del nuevo dominio. A-09 está verificado para jornadas ya creadas y cambios de catálogo en servidor, con reporte y catálogo offline todavía pendientes. A-03 permanece como referencia matemática del análisis, sin implementación comercial nueva; A-12 conserva su restricción de no inferir atribuciones.

La siguiente etapa debe abordar el reporte original completo por campaña, jornadas y lotes, usando todos los datos del ámbito y el detalle G/P/N1/N2/N3. La exportación actual basada en ocho registros de actividad reciente sigue pendiente de reemplazo; no equivale al Excel del cliente. En paralelo debe prepararse la conciliación y validación real de captura offline antes de aceptación.

Para incorporar entregas y devoluciones siguen siendo necesarias las respuestas sobre origen del rechazo, posibilidad de varias devoluciones, tara aplicada, el grupo de 100,10 kg y las ocho gavetas, y descarte adicional. No se debe repartir un rechazo por lotes por suposición ni alterar la clasificación original.
