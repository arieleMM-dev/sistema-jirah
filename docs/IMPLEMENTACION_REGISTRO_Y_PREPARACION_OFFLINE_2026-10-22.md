# Registro, aprobación y preparación offline — 22 de octubre de 2026

## Resultado y alcance

Se implementó el registro público con correo propio y aprobación administrativa, y se corrigieron los defectos prioritarios de preparación offline, duración de las páginas, recepción después del cierre y reintento de errores parciales. El desarrollo conserva SQLite; esta fase no migra a PostgreSQL ni publica infraestructura. No representa una declaración de «100 %» ni aceptación de producción.

Fuentes: decisiones del propietario, respuestas del cliente, Excel con fórmulas y auditoría integral del 22 de octubre. Las reglas de cálculo aprobadas no cambian: cinco categorías, tara histórica, cuadre `(cosechado − exportación − nacional)/(exportación + nacional)` y margen ±4 %.

## Acceso y cuentas

1. El trabajador solicita una cuenta con nombres, apellidos, cédula ecuatoriana, correo y contraseña. No puede enviar un rol ni un estado de aprobación.
2. La cuenta nace activa para identificarse, pero `SIN_ASIGNAR/PENDIENTE`: puede usar Bienvenida y confirmar su correo; no puede consultar ni modificar operaciones de campo o administración.
3. El correo contiene un token de un solo uso, con vigencia de 24 horas. Se guarda su hash. El enlace usa fragmento y se retira después de confirmar; exige ingresar con la misma cuenta destinataria.
4. ADMIN revisa solicitudes paginadas, comprueba pertenencia al equipo y aprueba únicamente cuentas con correo confirmado. Se asigna `AGRICULTOR_CLASIFICADOR`, presentado como Personal de campo, que permite pesar y clasificar. El rechazo conserva `SIN_ASIGNAR`.
5. Cada decisión exige motivo y conserva administrador, estado anterior/nuevo y rol asignado. El control de versión evita decisiones simultáneas incompatibles. Aprobar/rechazar revoca la sesión anterior; hay que ingresar nuevamente.
6. Se mantiene el alta desde Personal y el envío explícito de invitación desde el expediente. El botón Crear otro conserva el rol de campo combinado.

El registro limita solicitudes, normaliza correo y aplica la política existente de contraseña. No sobrescribe una cuenta por repetir correo o cédula. Los errores del correo no conceden permisos ni dejan un token emitido fallidamente utilizable. La recuperación conserva su vigencia de una hora y consumo único; demuestra titularidad del correo, revoca sesiones y no aprueba una cuenta pendiente.

Las API operativas requieren estado aprobado además de rol y cuenta activa, comprobados contra la base central. La identidad local no concede acceso al servidor. Las cuentas pendientes tampoco reciben identidad para captura offline. Cambiar manualmente la URL no evita estos controles.

## Preparación offline automática

La interfaz del panel muestra un estado específico de preparación. **Listo para trabajar sin conexión** solo se presenta después de:

- Validar una sesión aprobada de la cuenta actual y el control del service worker.
- Comprobar almacenamiento disponible y solicitar persistencia al navegador.
- Descargar campañas, lotes y jornadas a IndexedDB, separados por cuenta.
- Descargar y comprobar las tres páginas de campo: pesaje, clasificación y pendientes.
- Preparar sus recursos JavaScript, CSS y fuentes del mismo origen.
- Confirmar presencia de las páginas en la caché y guardar identidad/plazo local.

El plazo de captura es de siete días desde la preparación completa. Las páginas/recursos de campo tienen una ventana de caché de ocho días. Consultar la sesión de forma rutinaria, leer caché o abrir sin red no renueva ese plazo. La preparación se intenta al entrar, recuperar conexión y periódicamente mientras la aplicación permanece abierta. La interfaz muestra fecha límite, pendientes, disponibilidad real del servidor y si se concedió persistencia.

La sesión central continúa en ocho horas. Al reconectar puede exigir ingresar de nuevo antes de enviar; la cola se conserva. La PWA no garantiza sincronizar estando cerrada o con el teléfono bloqueado. Personal, catálogos, aprobaciones, correcciones, entregas y devoluciones requieren conexión.

La navegación entre las tres páginas de campo sin red utiliza la página completa preparada, evitando depender de una solicitud RSC que el teléfono todavía no hubiera realizado. Las pantallas de registro/verificación/bienvenida no se guardan como páginas operativas offline.

## Sincronización, cierre y actualización

Los errores individuales de una respuesta HTTP 200 distinguen fallos transitorios de conflictos de negocio. Solo los transitorios reciben reintentos automáticos con espera creciente; las confirmaciones siguen siendo por UUID y solo se retiran IDs expresamente aceptados. Una clasificación obsoleta, tara incompatible u otro conflicto conserva su revisión explícita.

Cerrar campaña e inactivar lote conserva la fecha de la acción. La sincronización admite capturas originales anteriores a esa fecha; el formulario online sigue bloqueando capturas nuevas. Un cierre antiguo sin fecha comprobable no recibe una excepción inventada. Si la jornada ya fue clasificada, se conserva el requisito de corrección administrativa auditada.

El cierre de campaña informa expresamente que no puede conocer los pendientes de teléfonos desconectados. No se promete detectar una cola que nunca llegó al servidor.

Una versión nueva del service worker queda esperando. El botón de actualización requiere conexión, sesión vigente y cero pendientes de todas las cuentas del dispositivo, excluidos originales archivados de revisiones. La activación invalida la preparación anterior y vuelve a preparar recursos; no elimina IndexedDB. La comprobación de actualización entre dos compilaciones con una cola real sigue incluida en la aceptación pendiente.

Se corrigieron los iconos: PNG reales cuadrados de 192/512 y un icono Apple de 180, conservando el arte del logotipo.

## Correo local y correo publicado

`npm run mail:dev` inicia Mailpit en Docker, limitado a puertos loopback 1025/8025. Antes de cambiar el SMTP local conserva un respaldo privado de .env y no reemplaza un proveedor externo ya configurado. `npm run mail:stop` detiene el buzón desechable.

En `npm run dev`, los mensajes aparecen en `http://127.0.0.1:8025`; no se envían a Internet. Se probó transporte SMTP real con ese buzón, registro, confirmación, aprobación y recuperación, usando una base temporal.

`SMTP_LOCAL_TEST=true` solo admite hosts loopback y modo desarrollo. Producción lo rechaza, exige HTTPS en los enlaces y conserva TLS para el transporte. Mailpit no es el proveedor de correo del cliente. Todavía falta configurar remitente/proveedor real y probar recepción externa, no deseados y enlaces en los teléfonos.

## Datos y migraciones

Se aplicaron tres migraciones aditivas: registro/aprobación, fechas de cierre/inactivación e índices de paginación. El respaldo previo de los cambios funcionales es `prisma/backups/jirah-2026-10-22T16-02-52-715Z.sqlite`; antes de los índices se creó `prisma/backups/jirah-2026-10-22T17-53-10-443Z.sqlite`. Las comparaciones posteriores comprobaron integridad SQLite y conservación de todas las filas/columnas anteriores.

El inventario de desarrollo comprobado al terminar la implementación conserva 1 usuario ADMIN y 0 campañas, lotes, pesajes y clasificaciones. Las pruebas no vuelven a cargar datos ficticios en esa base. El correo y contraseña administrativos existentes se conservaron.

## Preferencias y consultas acotadas

El tema se guarda por cuenta en una cola local separada de los movimientos de cosecha. Se reintenta al recuperar conexión, abrir el panel o periódicamente mientras está visible. El envío usa un bloqueo entre pestañas cuando el navegador lo ofrece y conserva el último cambio si llega otro durante la solicitud. Un error o sesión vencida no elimina la preferencia pendiente. La API comprueba el propietario esperado para evitar aplicar un cambio que quedó en vuelo a otra cuenta después de cambiar sesión. Una respuesta antigua de consulta no reemplaza una elección local posterior.

Perfil y botón del panel comparten la misma preferencia. El estado muestra cuándo sigue pendiente. La recuperación del tema no requiere tener el perfil abierto sin red: el control del panel también permite cambiarlo.

Se retiró la tolerancia editable por comprador. Crear/editar compradores ya no promete modificar el cuadre; la API rechaza un margen diferente de 4. Los valores históricos anteriores permanecen en la base sin reescribir registros. El formulario explica la base exportación + nacional por jornada/lote.

Los pesajes recientes solicitan diez filas al servidor. Jornadas e historial de entregas se paginan de 25 en 25, con orden determinista e índices apropiados. No se trunca el conjunto de gavetas de una jornada individual. La revisión de un pendiente consulta directamente su jornada por ID o pesaje original, aunque esté fuera de la primera página. La captura offline conserva la primera página preparada y las operaciones locales; los históricos adicionales requieren conexión y no reemplazan el conjunto preparado.

La entrega comercial consulta para validar únicamente los orígenes incluidos en esa operación; no vuelve a descargar todo el historial para guardarla. El formulario aún obtiene el conjunto de saldos comerciales: se debe medir y, si su volumen lo exige, añadir búsqueda/paginación específica de saldos. Las exportaciones siguen usando sus consultas completas independientes; la paginación de pantalla no recorta los reportes.

Se probó un conjunto aislado de 64 jornadas y 128 pesajes: recorrido de todas las páginas sin omisiones/duplicados, jornadas completas y búsqueda directa de una antigua. También se verificó paginación comercial, límites inválidos y uso del índice para el orden de jornadas. Este conjunto comprueba los contratos; no equivale a una prueba de capacidad de varios años.

## Evidencia y límites

- `npm run lint` y `npm run typecheck`: aprobados.
- `npm run build`: aprobado, incluida generación de PWA y rutas nuevas.
- `npm run test:mail`: 80 pruebas aprobadas; incluye envío SMTP real al buzón local. No depende del correo de Internet.
- `npm run test:e2e`: 80 pruebas aprobadas; consultar `prisma/backups/registro-e2e.log`, con base temporal y capturas en `prisma/backups/browser-qa/registro-20261022/` y `operacion-20261022/`.
- Regresiones: registro sin escalamiento, enlace ligado a identidad, consumo único/caducidad, aprobación concurrente, sesiones revocadas, denegación por API, carga administrativa sin filas obsoletas, correos largos sin desbordamiento, cierre con captura diferida y errores parciales de sincronización.
- PWA en Chrome de escritorio: preparación automática, clasificación offline sin visita manual previa, páginas envejecidas seis días, reapertura, captura, clasificación y reingreso antes de sincronizar.
- Preferencias en navegador real: cambio sin red conserva pendiente y tema central anterior; al reconectar se aplica a la cuenta correcta y se retira su pendiente.

La simulación de fecha/caché no equivale a dejar un teléfono seis o siete días en campo. No se verificaron todavía expulsión de almacenamiento en iOS, batería, modo de ahorro, instalación física en Android/iOS, actualización entre compilaciones ni entrega externa de correo.

## Trabajo pendiente antes de entregar

1. Base central administrada y despliegue reproducible. La propuesta es PostgreSQL administrado y aplicación en un alojamiento compatible; Vercel puede servir la aplicación y su URL HTTPS, pero no convierte este archivo SQLite en una base persistente. La migración aún no está implementada.
2. Proveedor de correo real, identidad del administrador y remitente verificado. Un dominio propio no es necesario para abrir la aplicación por la URL del alojamiento; puede ser necesario para verificar el remitente del proveedor elegido.
3. Respaldos externos automáticos con restauración ensayada y supervisión de disponibilidad.
4. Completar la medición real de H11 y la búsqueda de saldos comerciales si el volumen lo requiere, y mantener la revisión de la dependencia mitigada H12. H10 se implementó en esta fase.
5. Aceptación en Android e iPhone reales, dos responsables, señal intermitente, siete días, actualización con pendientes y condiciones de almacenamiento. Contrastar reportes con el cliente.

El estado de cada hallazgo debe leerse en la actualización de la auditoría integral. No se han contratado servicios, creado cuentas de nube ni publicado datos.

Decisión de infraestructura del propietario: priorizar costo mínimo y evitar suscripciones por ahora; el presupuesto definitivo aún debe conversarse con el cliente. Esto no equivale a un requisito de gratuidad perpetua. La selección y cualquier contratación se presentarán con costos y límites concretos antes de realizarlas.
