# Trazabilidad funcional y evidencia — actualizada el 22 de octubre de 2026

Esta matriz sustituye la declaración anterior de «100 % completo». La fuente funcional prioritaria son las respuestas del cliente y las decisiones aprobadas por el usuario, contrastadas con el Excel con fórmulas. Los casos de uso iniciales siguen siendo referencia; las reglas aclaradas posteriormente prevalecen.

| Requisito | Implementación principal | Evidencia / alcance |
| --- | --- | --- |
| Acceso por rol, cuenta activa y revocación persistente | lib/auth/session.ts, AuthController, UserRepository | JWT real, desactivación/reactivación y cambio de contraseña probados, también por HTTP. |
| Registro público y aprobación | AccesoController, acceso.service.ts, AccesoRepository, bienvenida, solicitudes | Correo confirmado antes de aprobar; SIN_ASIGNAR/PENDIENTE sin datos operativos; solo ADMIN decide con historial. HTTP y navegador prueban denegación por URL, verificación ligada a identidad y revocación de sesión al aprobar. |
| Recuperación y establecimiento de contraseña | auth.service.ts, correo.service.ts, PasswordResetRepository | Hash del token, consumo único concurrente y límite de solicitudes. SMTP real comprobado en buzón local aislado; entrega al proveedor externo pendiente. Recuperar no aprueba una cuenta pendiente. |
| Perfil y administración de trabajadores | PerfilController, AgricultorController, dashboard/personal | Sin hashes en respuestas; invitación explícita al correo registrado; administración protegida por rol. |
| Preferencia de tema diferida | tema.ts, useTema, PerfilController | Cola por cuenta, reintento, conservación del último cambio y rechazo si cambió la cuenta autenticada. Una consulta vieja no reemplaza una elección posterior. |
| Campaña multi-lote y multi-jornada, nacimiento y código manual | Campana, JornadaCosecha, catalogo.service.ts | Agrupación por campaña + lote + fecha Ecuador. No se inventa una fecha de una campaña antigua. |
| Cultivo, funda, comprador, tara y variedad | CatalogoRepository, formularios de campañas/lotes | Cultivo/funda/variedad reutilizables desde valores guardados; cultivo y tara bloqueados si existen pesajes; tara comercial independiente. |
| Gavetas individuales o agrupadas | PesajeRepository, pesaje.service.ts, usePesaje | Cantidad explícita, bruto, neto, trabajador y fecha/hora originales. No se infiere cantidad del peso. |
| Clasificación por lote en el día de cosecha | jornada.service.ts, cosecha.ts | Conjunto completo de pesajes, control de versión, cinco categorías; recepción tardía conserva fecha de captura. |
| G/P por límites configurables; N1/N2/N3 visuales | ParametrosCampana, JornadaCosecha, useClasificacion | 180/280 g por defecto; parámetros históricos conservados. El trabajador elige categoría; no se pesan frutos individuales. |
| Cuadre (H−E−N)/(E+N) y ±4 % | cosecha.ts, JornadaRepository | Pruebas de signo, frontera, redondeo y valores del Excel; admin aprueba excepción con motivo. |
| Captura sin conexión y sincronización sin duplicados | offline.service.ts, useSyncManager, sync.service.ts, auth/offline-session.ts | IndexedDB v1→v3 sin pérdida, aislamiento por cuenta, envíos de hasta 100, UUID estables y confirmación por registro. Captura local hasta 7 días desde validación online; JWT de 8 horas. Chrome probado al reabrir sin red, con sesión vencida y al volver a ingresar. Android/iOS físicos pendientes. |
| Conflictos entre responsables | jornada.service.ts, JornadaRepository, RevisionJornadaRepository | Primera operación válida confirmada; versión y lista de pesajes verificadas atómicamente. Sin sobrescritura por llegada tardía. Doble clasificación concurrente comprobada. Corrección administrativa con historial. |
| Revisar pendientes sin borrar evidencia | dashboard/campo/pendientes, adaptador offline | Errores visibles, pausa/reactivación, respaldo JSON, revisión local con original conservado. |
| Preparación automática del teléfono | OfflineReadiness, offline-readiness.ts, next.config.ts | Descarga/verifica tres pantallas, recursos y contexto; solicita persistencia y muestra plazo de siete días. Prueba offline sin visitar previamente clasificación y con páginas envejecidas seis días. |
| Cierre con captura todavía en otro dispositivo | Campana.cerradaAt, Lote.inactivadoAt, SyncService | Recepción diferida anterior al cierre/inactivación documentados; no permite nuevas capturas online ni evita la corrección si la jornada ya fue clasificada. |
| Errores individuales transitorios al sincronizar | SyncController, sync-confirmation.ts, useSyncManager | Respuesta parcial distingue conflicto y fallo transitorio; reintenta estos últimos sin borrar IDs sin confirmar ni repetir automáticamente errores de negocio. |
| Entrega con varios lotes/campañas | comercial.service.ts, ComercialRepository | Saldo por origen/categoría, tara, comprador, responsable y fecha; concurrencia no sobreconsume. |
| Varias devoluciones y rechazo sin atribuir | Devolucion, comercial.service.ts | Gavetas/bruto/tara explícitos, acumulado limitado a entrega, origen opcional, sin reparto automático. |
| Rechazo pasa a nacional y puede revenderse | DetalleEntrega.devolucionId, servicio comercial | Reventa N1/N2/N3 con saldo propio; no crea producción. |
| Correcciones de jornadas cerradas solo por admin | revision-jornada.service.ts, RevisionJornadaRepository | Motivo, antes/después, control concurrente y nueva aprobación. Bloqueadas si existen entregas vigentes. |
| Anulación comercial con motivo e historial | anulacion-comercial.service.ts, AnulacionComercialRepository | Admin, conservación del original, idempotencia y orden reventa → devolución → entrega; saldos y reportes excluyen anulados; concurrencia protegida. |
| Pesaje tardío de jornada cerrada | Corrección con respaldo de Pendientes | Importación auditada de UUID, autor y fecha originales; sincronizar el original no deshace la corrección. |
| Estadísticas y filtros de campaña/lote/fechas | dashboard.service.ts, filtros-cosecha.ts | Fechas válidas, jornada Ecuador hasta último milisegundo y pendientes diferenciados. |
| Reportes completos CSV/XLSX/PDF | reporte.service.ts, lib/reportes, dashboard/reportes | Todos los registros del filtro; cinco categorías, fórmulas, entregas, rechazos y revisiones. Descargas reales probadas en Chrome. |
| Consultas de trabajo acotadas | PesajeRepository, JornadaRepository, ComercialRepository | Diez pesajes recientes; páginas de 25 jornadas/entregas y búsqueda de jornada por ID. Índices, 64 jornadas/128 pesajes aislados sin omitir filas ni gavetas. Reportes completos independientes. Medición de volumen real y conjunto de saldos comerciales pendientes. |
| Preservación de datos anteriores | Migraciones y scripts/verify-migration.cjs | Contenido anterior comparado contra respaldo e integridad SQLite comprobada. Históricos separados; sin categorías inventadas. |

## Restricciones expresas

- No hay descarte separado: alcance aprobado de exportación + nacional. Nacional no significa fruta destruida.
- Una devolución sin origen permite ajustar el agregado de una entrega completa, pero impide un ajuste exacto al filtrar parte de sus orígenes. El reporte señala la falta de atribución.
- Una jornada con entregas vigentes queda protegida. El administrador puede conciliar sus dependencias mediante anulaciones auditadas, corregirla y registrar los movimientos correctos. No se reactivan ni se sobrescriben movimientos anulados.
- El Excel agrupa varias jornadas; no se importan filas a días concretos sin origen suficiente. Tampoco se adivina la cantidad de gavetas del rechazo ambiguo.
- No hay precios, facturación ni cobros monetarios: el alcance confirmado respalda kilos entregados/aceptados y productividad.
- Falta validar proveedor SMTP externo, dispositivos de finca, actualización entre compilaciones con pendientes, volumen real e infraestructura publicada como parte de la aceptación operativa. El informe integral y su actualización distinguen los defectos cerrados de los trabajos aún pendientes.
- Persisten alertas altas de dependencias; consultar el informe vigente. No se declara ausencia de riesgos.
