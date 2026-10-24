# Flujo de cosecha, comercialización y trazabilidad — 10 de octubre de 2026

## Alcance implementado

Se conservó la arquitectura Next.js App Router → controladores → servicios → repositorios → Prisma/SQLite. Las reglas de pesos y cuadre viven en `lib/cosecha.ts`; las operaciones comerciales y revisiones tienen servicios separados. No se añadió facturación, inventario genérico ni clasificación automática de frutos.

La campaña reúne varios lotes y jornadas. La unidad de clasificación es campaña + lote + fecha en America/Guayaquil. Los pesos pueden ser individuales o grupos con cantidad explícita de gavetas. La clasificación comprende G/P/N1/N2/N3 y se captura el día de cosecha; la sincronización puede recibirse después.

Decisiones aprobadas en esta conversación:

- Entregas con varios orígenes, varias devoluciones y rechazo sin atribuir cuando se desconoce el lote. Nunca repartirlo automáticamente.
- Solo administrador corrige jornadas cerradas, con motivo e historial de valores anteriores y posteriores.
- Anulación comercial exclusiva del administrador, con motivo e historial y control de dependencias; primero reventa, después devolución y finalmente entrega original.
- Mantener exportación + nacional sin un descarte separado no confirmado.
- P desde 180 g y G desde 280 g por defecto, con parámetros modificables para jornadas nuevas. Nacional se clasifica visualmente.
- Datos actuales exclusivamente de desarrollo/prueba; preservar el contenido existente durante las migraciones.

## Cálculos y trazabilidad

Neto = bruto − gavetas × tara. El cuadre conserva el signo y divide por **exportación + nacional**, siguiendo las fórmulas recibidas: `(cosechado − clasificado) / clasificado × 100`. La decisión ±4 % se toma antes del redondeo de presentación. Un descuadre se guarda pendiente de aprobación; no habilita entrega hasta aprobarlo un administrador con motivo.

Las jornadas y capturas offline conservan sus parámetros. `ParametrosCampana` guarda versiones de tara y mínimos, de modo que un cambio posterior no invalide una captura auténtica ni reescriba sus netos. Cultivo y tara de una campaña con pesajes no se cambian; se crea otra campaña cuando corresponde. Cultivo, funda y variedad se guardan y pueden reutilizarse en formularios.

El rechazo es un movimiento posterior a la entrega, con gavetas, bruto, tara, neto, fecha, responsable y motivo. Conserva la clasificación original y pasa a nacional ajustada. Su reventa consume un saldo propio y no aumenta producción. Entrega conserva nombre y tipo del comprador al registrarse, aunque cambie su ficha después.

Si se filtra una parte de una entrega con rechazo sin atribuir, los porcentajes ajustados se declaran no calculables. Con todos los orígenes se permite el ajuste agregado, sin asignarlo a lotes concretos. Los movimientos relacionados fuera del filtro quedan señalados.

## Captura offline e integridad

IndexedDB versión 3 conserva las colas previas y separa datos por cuenta. Pesaje y clasificación se guardan localmente antes de enviarse, incluso con conexión. La interfaz confirma guardado local y confirmación del servidor como estados distintos. No elimina registros sin una confirmación individual válida.

La sincronización procesa lotes de hasta 100, primero pesajes y después clasificaciones. Los UUID son estables; repetir una solicitud no crea otra operación. Los errores por registro quedan visibles, con pausa/reactivación, reintento y descarga de respaldo. El cambio de versión de almacenamiento avisa si otra pestaña lo bloquea.

La sesión local guarda únicamente identidad, rol y vencimiento de una sesión previamente verificada; no guarda contraseña ni JWT. Sirve para continuar captura sin señal mientras no venza. Al reconectar, las operaciones vuelven a validar cuenta activa, rol y autor en servidor. El primer ingreso y la renovación requieren red. Cerrar sesión conserva pendientes y bloquea el acceso local hasta completar el cierre.

La revisión de una clasificación pendiente conserva el original, motivo y reemplazo. El servidor valida la historia local declarada; esta no equivale a una versión anterior previamente certificada por servidor. Las correcciones de jornadas persistidas tienen auditoría transaccional separada.

Los pesajes que llegan a una jornada ya cerrada pueden incorporarse por admin desde el respaldo JSON de Pendientes. Se conservan UUID, trabajador y fecha/hora originales. La huella de captura original permite confirmar su sincronización posterior aunque una revisión administrativa haya corregido los pesos; no se deshace la corrección.

Las transacciones y controles de versión protegen clasificación/captura simultáneas, correcciones, saldos de entrega y devoluciones. Solo se entrega fruta de jornadas dentro del margen o aprobadas. No se permite sobreconsumir un origen, devolver más de lo exportado ni revender dos veces el mismo saldo.

La anulación comercial conserva movimiento, motivo, administrador, fecha y una instantánea anterior. No borra ni reutiliza identidades. Solo se permite cuando no existen movimientos dependientes vigentes: reventa → devolución → entrega. Invalida reservas concurrentes de saldo, restaura disponibilidad y excluye anulados del ajuste comercial. Las filas y auditorías siguen apareciendo en las descargas con su estado. Una jornada puede corregirse después de conciliar todas sus entregas vigentes; si queda fuera de margen requiere nueva aprobación.

## Reportes y acceso

Reportes descarga todos los registros del filtro, sin el límite de ocho de la vista resumida. Incluye jornadas, cinco categorías, pesajes, entregas, devoluciones, revisiones e históricos. El XLSX añade fórmulas de neto y cuadre con resultados almacenados; se usa ExcelJS en lugar de la dependencia anterior vulnerable. Los valores externos se escriben como texto y se protege CSV frente a ejecución de fórmulas.

Las correcciones extensas se dividen en partes para respetar el límite por celda de Excel, conservando antes/después completos. Las fechas de filtrado corresponden a cosecha en Ecuador, hasta el último milisegundo del día. Una jornada aún abierta se muestra pendiente, sin incorporarla como pérdida al cuadre.

Las sesiones se revocan de forma persistente al desactivar o cambiar contraseña. Las respuestas usan proyecciones sin hashes. Las APIs no se guardan en la caché compartida de la PWA y las mutaciones rechazan orígenes cruzados. El menú funciona en móvil y se conservaron estilos del producto.

Recuperación/invitación utiliza SMTP real configurable, enlaces de una hora con token aleatorio almacenado como hash, consumo único y límites persistentes de solicitudes. Sin configuración/fallo de correo se devuelve indisponibilidad; no se simula un envío exitoso. La prueba automatizada usa transporte simulado, sin enviar correos externos.

## Migración aplicada y conservación

Respaldo previo: `prisma/backups/jirah-2026-10-10T06-31-58-616Z.sqlite`, excluido de Git.

Se aplicaron `20261010000000_versiones_parametros`, `20261010010000_entregas_devoluciones_revisiones` y `20261010020000_cultivo_campana`. Se generó Prisma Client 7.10.0. No se reinició ni resembró la base actual.

Tras aprobarse la política de anulaciones, se creó otro respaldo (`prisma/backups/jirah-2026-10-10T06-57-18-111Z.sqlite`) y se aplicó `20261010030000_anulaciones_comerciales`. La comparación con ese respaldo también conservó íntegramente todas las filas anteriores y pasó las comprobaciones de integridad. Se conservan 4 versiones iniciales de parámetros; las nuevas tablas operativas permanecen vacías en desarrollo.

El verificador comparó todas las columnas y filas anteriores contra el respaldo: **contenido conservado**, `integrity_check = ok` y sin infracciones de claves foráneas. Persisten 7 usuarios, 3 tokens anteriores, 4 campañas, 5 lotes, 2 compradores, 7 pesajes, 1 clasificación histórica y 0 ajustes. Las tablas de jornadas estaban vacías. La migración agrega estructuras; no reparte retrospectivamente pesajes o categorías sin evidencia.

## Verificación

Resultados finales del 10 de octubre de 2026:

- `npm run typecheck`: satisfactorio, sin errores de TypeScript.
- `npm run lint`: satisfactorio, sin errores ni advertencias.
- `npm run build`: satisfactorio, Next.js 16.4.0, 40 rutas/páginas generadas, incluida la API de anulaciones.
- `npm run test:e2e`: **51 pruebas, 51 satisfactorias, 0 fallidas**, incluyendo las 50 pruebas de dominio/persistencia y el recorrido HTTP/Chrome.
- Comparación de contenido previo contra ambos respaldos: satisfactorio; integridad SQLite correcta y sin infracciones de claves foráneas.
- `git diff --check` con reconocimiento de CRLF de Windows: satisfactorio.

Las pruebas usan bases temporales y no la base de desarrollo. Cubren migraciones, autorización, concurrencia, persistencia offline, parámetros históricos, reportes y servidor HTTP real. Chrome verifica captura/clasificación móvil, recarga sin red, reconexión sin duplicados, descargas reales CSV/XLSX/PDF, entrega con tara distinta, devolución sin atribuir, reventa nacional, bloqueo de anulación con dependencias y conciliación completa, corrección administrativa con nueva aprobación y saldos posteriores. Se revisaron capturas en 390×844 y 1440×1000; los controles del reporte y comercial se verificaron dentro de la pantalla móvil.

Las capturas quedan en `prisma/backups/browser-qa/`. La prueba de identidad concurrente provoca intencionalmente una colisión de clave única; el mensaje de Prisma se registra como parte de ese escenario y la operación se confirma una sola vez. No es un fallo omitido de la suite.

## Dependencias y riesgo residual

Se actualizaron dependencias compatibles, incluido Next.js 16.4.0 y Prisma 7.10.0, se sustituyó XLSX por ExcelJS y se actualizó el transporte de correo. El lockfile conserva las resoluciones reproducibles. Los overrides de dependencias transitivas se verificaron con compilación y pruebas.

La consulta `npm audit` del 10 de octubre registra **0 críticas, 0 moderadas y 6 altas**. Las seis altas corresponden a la propagación del aviso [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), agotamiento de pila con patrones profundamente anidados en braces, a través de micromatch/fast-glob y herramientas PWA/ESLint. braces 3.0.3 es la versión resuelta; no se encontró una versión corregida publicada al verificar el registro. La herramienta propone degradaciones incompatibles de PWA/Next ESLint, que no se aplicaron.

En este proyecto estos patrones se utilizan en herramientas sobre archivos del repositorio, sin una API que acepte patrones externos. Esto limita la exposición observada, pero no elimina la alerta ni prueba ausencia de otros vectores. El JSON del análisis queda en `prisma/backups/dependencias-2026-10-10.json`. Repetir la revisión antes de publicar y actualizar cuando exista una solución compatible; no ejecutar compilaciones sobre patrones de origen no confiable.

## Límites pendientes para salida real

- Una jornada con entregas vigentes no admite corrección; primero se concilian dependencias con anulaciones auditadas. No modificar la base manualmente ni borrar movimientos para resolver errores.
- No hay descarte separado, precios, facturación o cobros monetarios dentro del alcance aprobado.
- No se importa el Excel de varias jornadas a fechas individuales ni se adivinan gavetas del rechazo ambiguo.
- Falta aceptación con el cliente en teléfono real y Excel/PDF de trabajo, prueba del SMTP real, restauración operativa del respaldo y preparación del servidor HTTPS con almacenamiento persistente. SQLite local no debe alojarse en disco efímero ni replicarse como copias independientes.
- La cola depende del almacenamiento del navegador: borrar datos o perder el dispositivo puede perder pendientes no sincronizados. Descargar respaldo antes de cambiar navegador o dispositivo.

La [matriz vigente](../REPORTE_DE_TRAZABILIDAD.md) distingue lo implementado de estos límites. El [manual de aceptación](MANUAL_OPERACION_Y_ACEPTACION.md) propone el recorrido con el cliente.
