# Seguridad y permisos de Finca JIRAH

Revisión iniciada el 10 y verificada el 11 de octubre de 2026. Describe controles implementados y límites conocidos; no es una certificación de seguridad ni autoriza por sí sola una entrega a producción.

## Permisos confirmados

| Operación | ADMIN | Roles de campo |
| --- | --- | --- |
| Capturar cosecha y clasificación; consultar jornadas y catálogos de campo | Sí | Sí |
| Consultar/cambiar su propio perfil y contraseña | Sí | Sí |
| Crear personal, enviar invitaciones y desactivar cuentas | Sí | No |
| Modificar catálogos y consultar compradores | Sí | No |
| Consultar tablero y reportes globales, descargar reportes | Sí | No |
| Entregas, devoluciones, ajustes y anulaciones | Sí | No |
| Aprobar descuadres y corregir jornadas cerradas con historial | Sí | No |

AGRICULTOR, CLASIFICADOR y AGRICULTOR_CLASIFICADOR conservan ambas tareas de campo por decisión del propietario. La información de jornadas se comparte para clasificar la cosecha del lote; no existe aislamiento por trabajador de esos datos productivos. Las colas locales sí pertenecen a cada cuenta.

El servidor comprueba permisos aunque alguien cambie una URL, el menú, el almacenamiento del navegador o las cabeceras. Se corrigieron la exposición de reportes/estadísticas a trabajadores y la ruta antigua de ajustes. El detalle de un pesaje no expone al trabajador el ajuste comercial anidado.

## Sesiones y contraseñas

- JWT verificado y cifrado por NextAuth, con duración configurada de 8 horas. Las rutas protegidas consultan la cuenta actual, su estado y `sessionVersion`; el rol guardado por el navegador no concede permisos.
- Desactivar una cuenta o cambiar/restablecer su contraseña invalida sus sesiones anteriores. Reactivarla no rehabilita esos JWT. Un cambio de contraseña concurrente no sobrescribe otro cambio o restablecimiento ya confirmado.
- Contraseñas nuevas: al menos 15 caracteres Unicode y hasta 72 bytes UTF-8, sin truncamiento silencioso de bcrypt. Frases permitidas; rechazo de una lista reducida de contraseñas comunes y repeticiones simples. No se incorpora aquí un servicio externo de contraseñas filtradas ni MFA.
- Claves temporales generadas con aleatoriedad criptográfica; bcrypt con coste 12. El inicio de sesión compara también un hash ficticio cuando no existe la cuenta para reducir diferencias de tiempo.
- Recuperación mediante token aleatorio de 256 bits, hash SHA-256 indexado, una hora de vigencia y consumo atómico de un solo uso. Los formatos antiguos se retiraron tras limpiar los datos ficticios.
- El token viaja en el fragmento `#token=...`, que el navegador no envía en la URL HTTP. La página elimina el fragmento tras completar el cambio y usa `Referrer-Policy: no-referrer`.
- Respuesta pública de recuperación uniforme; el correo se procesa después de responder. Sin SMTP configurado se informa indisponibilidad. Un fallo posterior de correo no revela si existe la cuenta.

La identidad guardada localmente permite identificar la captura durante hasta 7 días desde la última validación real con el servidor, según la política aprobada por el propietario; no amplía el JWT de 8 horas ni autoriza operaciones en el servidor. Un fallo de transporte no renueva el plazo ni se interpreta como revocación. No se puede conocer una desactivación remota mientras el dispositivo está desconectado. Al reconectar se valida la cuenta antes de aceptar pendientes. Consulte el documento de operación offline.

## Límites y solicitudes

Los contadores son persistentes y resisten llamadas concurrentes:

| Límite | Ventana |
| --- | --- |
| Red: 600 solicitudes, incluidas páginas y recursos que atraviesan el proxy | 1 minuto |
| POST de autenticación/recuperación: 30 por red | 1 minuto |
| API autenticada: 120 escrituras o 240 lecturas por cuenta | 1 minuto |
| Inicio de sesión: 10 intentos por correo | 15 minutos |
| Cambio de contraseña: 10 intentos por cuenta | 15 minutos |
| Consumo de recuperación: 5 intentos por token | 15 minutos |

Sin un proxy confiable configurado, las solicitudes comparten la identidad de red `shared`. Esto evita confiar en una IP inventada, pero puede limitar a varios usuarios juntos. Solo habilitar `TRUST_PROXY_HEADERS` con un proxy que reemplace las cabeceras de entrada y bloquee acceso directo al servidor interno. Estos límites no sustituyen protección frente a DDoS en el proveedor.

Las escrituras rechazan orígenes externos. Tamaños máximos verificados leyendo el cuerpo real: 64 KiB general, 512 KiB para sincronización, 3 MiB para actualización del perfil. La clonación interna de Next se limita a 4 MiB. La lectura del cuerpo tiene un tiempo máximo de 10 segundos. El perfil solo admite sus campos editables y avatares PNG/JPEG con firma y tamaño válidos.

Las APIs responden con caché privada deshabilitada. La PWA no almacena respuestas de API autenticadas en una caché compartida. Las páginas incorporan CSP con nonce nuevo por respuesta, bloqueo de marcos y objetos, `nosniff`, política de permisos y redirecciones al mismo origen. Se permite `unsafe-eval` únicamente en desarrollo y estilos en línea por compatibilidad con la interfaz actual. El renderizado de páginas es dinámico para generar nonces. HSTS se activa con un origen HTTPS de producción.

## Dependencia pendiente del proveedor

`npm audit` identifica seis avisos altos en el árbol completo y cuatro al omitir desarrollo. Todos proceden de la misma vulnerabilidad de `braces` 3.0.3 y sus dependientes; no son seis vulnerabilidades independientes. El [aviso oficial GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) no ofrece versión corregida al revisar el proyecto.

`scripts/harden-braces.cjs` verifica versión y hash de la fuente e incorpora un límite de profundidad de 128 al analizar patrones. Se ejecuta al instalar, compilar e iniciar desarrollo o producción; falla ante una fuente desconocida. Una prueba comprueba que los patrones profundos se rechazan y los normales conservan su comportamiento. La aplicación no acepta patrones glob del usuario.

Es una mitigación local del vector observado, no una actualización oficial ni una garantía sobre todos los usos posibles de la biblioteca. El aviso de npm permanece visible. Antes de adoptar una versión corregida o sustituir la dependencia se debe retirar/revisar la mitigación y repetir compilación, PWA y pruebas; no se aplicó una degradación forzada incompatible de Next/PWA.

## Preparación pendiente de producción

- Dominio real, HTTPS y proxy con límites de tráfico, tiempos máximos y cabeceras confiables.
- Secretos privados propios del entorno, correo SMTP real con TLS y prueba de invitación/recuperación.
- Sustituir correo, cédula y contraseña provisionales del administrador. Retirar del entorno la contraseña de inicialización cuando ya no se necesite.
- SQLite en almacenamiento persistente, una única base coherente, respaldos externos y restauración comprobada. No usar copias independientes o disco efímero.
- Validar teléfonos reales, funcionamiento offline y resolución de conflictos, duración necesaria sin conexión y aceptación del cliente.
- Mantener seguimiento de dependencias; la mitigación indicada no permite afirmar que la auditoría npm esté libre de avisos.

## Evidencia del 11 de octubre

- `npm run test:e2e`: 67 pruebas aprobadas, cero fallos; incluye pruebas de servicio, servidor HTTP real y navegador Chrome sobre bases temporales separadas.
- `npm run build`, `npm run lint` y `npm run typecheck`: aprobados.
- Matriz HTTP real: acceso anónimo rechazado, tres roles de campo sin permisos administrativos incluso con cabeceras de evasión, rol actual de base aplicado, sesiones vencidas y revocadas rechazadas, origen externo y cuerpo excesivo bloqueados, CSP con nonce nuevo y respuestas privadas sin caché.
- Navegador: ingreso repetido, captura offline, cierre/reapertura desde el inicio instalado, conservación de cola ante JWT vencido, nuevo ingreso y sincronización sin duplicados. También conexión aparente con API de sesión 503: la captura permanece después de nueve horas y se bloquea después de siete días sin renovar la identidad.
- Base local real: un ADMIN, cero datos productivos, nueve migraciones y cero errores de integridad referencial. Los límites de acceso generan sus propios registros internos al usar la aplicación.
- Acceso real del administrador en el servidor de desarrollo: perfil, personal, catálogos, estadísticas y entregas respondieron 200; perfil anónimo 401; sin errores JavaScript de página.

Logs y comprobaciones privadas, excluidos de Git: `prisma/backups/seguridad-e2e-actual.log`, `seguridad-build-actual.log`, `seguridad-lint-actual.log`, `seguridad-tipos-actual.log`, `verificacion-base-actual.json` y `verificacion-inicio-limpio.json`. No contienen una aprobación de Android/iOS físicos ni de infraestructura pública; esas validaciones siguen pendientes.

Referencia para la política de contraseñas y respuestas uniformes: [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).
