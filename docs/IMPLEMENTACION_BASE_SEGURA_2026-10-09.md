# Primera implementación: seguridad, captura y sincronización

Fecha: 9 de octubre de 2026.

> Actualización funcional posterior: ya se recibió el nuevo Excel con fórmulas y parte de las respuestas del cliente. Consultar las [reglas confirmadas, diferencias y siguiente fase](REGLAS_NEGOCIO_Y_CONTRASTE_EXCEL_2026-10-09.md). Este informe conserva el alcance técnico implementado antes de recibir esa evidencia.

## Alcance y autorización

Después de la [auditoría funcional y técnica](AUDITORIA_FUNCIONAL_Y_RIESGOS_2026-10-05.md) y del [plan de avance](PLAN_DE_AVANCE_MIENTRAS_RESPONDE_CLIENTE_2026-10-09.md), el usuario autorizó implementar la secuencia recomendada. Confirmó que el proyecto contiene únicamente datos de desarrollo y prueba.

Se corrigieron problemas independientes de las respuestas pendientes del cliente, conservando las capas de rutas, controladores, servicios y repositorios. No se incorporaron dependencias nuevas. Esta entrega no certifica que los requisitos del cliente estén completos ni que el sistema esté listo para producción.

## Cambios y trazabilidad

| Hallazgo de la auditoría | Resultado de esta entrega | Límite pendiente |
|---|---|---|
| F-01: catálogos bloqueados para campo | El trabajador puede consultar campañas, lotes y personal activo con campos mínimos. La administración sigue restringida | Confirmar la matriz definitiva de permisos por actividad |
| F-02: contrato de clasificación incompatible | El formulario envía gavetas y pesos brutos con el contrato que espera el servicio | Continúa el modelo agregado exportación/nacional; no representa todavía G/P/N1/N2/N3 |
| T-01: exposición de credenciales | El detalle del pesaje selecciona solo los campos necesarios del agricultor | La entrega de credenciales temporales al crear personal requiere definir el procedimiento operativo |
| T-02: duplicación y referencias offline | El UUID local es la identidad persistida. Repetir un envío confirma la misma operación; reutilizarlo con otro contenido produce conflicto. La clasificación conserva su origen | Verificar dispositivos y navegadores reales, interrupciones y concurrencia prolongada |
| T-03: suplantación de autor | El servidor obtiene el autor de la sesión. La sincronización rechaza registros de otra cuenta | Registrar actividades por terceros necesita una decisión explícita de negocio |
| T-04: diferencias de cálculo | Ambos recorridos pasan por el mismo servicio; la cola guarda la tara y la clasificación usa la tara histórica del pesaje | Las colas antiguas sin datos suficientes quedan pendientes para revisión, sin conversión automática |
| T-05: confirmaciones y aislamiento | Solo se retiran IDs confirmados. Se conservan fallos parciales, se muestran errores y reintentos, y cada cuenta consulta su propia cola. La API no se guarda en la caché compartida del service worker | Falta validar inicio sin conexión, catálogos disponibles offline, conservación del almacenamiento y recuperación de colas antiguas |
| T-06: revocación de sesiones | La versión de sesión persiste en la base. Desactivar o cambiar/restablecer contraseña invalida sesiones anteriores; reactivar requiere iniciar sesión nueva | Faltan controles de abuso y decisiones operativas de acceso |
| T-07: cierre frente a pendientes | La sincronización utiliza las validaciones de campaña del servicio y rechaza campañas cerradas conservando el pendiente | No se definió autorización de envíos tardíos ni cómo cerrar con dispositivos desconectados |
| T-08: validación numérica | Se rechazan valores no finitos, tipos incorrectos y cantidades de gavetas fraccionarias o inválidas; se validan tara y tolerancia | Precisión, redondeo, denominador del cuadre y casos con base cero siguen sujetos a validación funcional |
| T-09: recuperación incompleta | Los tokens se consumen una sola vez mediante transacción; cambiar contraseña invalida tokens previos. Se eliminaron enlaces secretos y contraseñas predeterminadas del seed | La solicitud de recuperación devuelve 503 indicando falta de configuración, hasta implementar un proveedor de correo. No simula envío |
| T-10: verificación y operación | Se añadieron pruebas, configuración de ejemplo, respaldo consistente SQLite y migración aditiva | Faltan CI, pruebas operativas de restauración, despliegue y aceptación del cliente |

La política actual de cuadre, descarte y confirmación forzada no fue redefinida. Tampoco se implementaron entregas, rechazo comercial, nuevas categorías ni el reporte completo del Excel. Son trabajo funcional pendiente, no requisitos cerrados por esta entrega.

## Base de datos y compatibilidad

La migración `20261009000000_persistent_session_revocation` agrega `users.sessionVersion` con valor inicial cero. Se aplicó a la base local de desarrollo después de crear esta copia:

`prisma/backups/jirah-2026-10-10T00-11-35-564Z.sqlite`

El nombre usa fecha UTC; corresponde al 9 de octubre en Ecuador. Antes y después se compararon los conteos de las ocho tablas existentes: coincidieron. Ambas bases superaron la comprobación de integridad SQLite y no presentaron infracciones de claves foráneas. No se ejecutaron reset ni seed. La copia local está excluida de Git; todavía falta ensayar una restauración operativa completa en un entorno aislado.

Las sesiones emitidas antes de incorporar la versión deben iniciar sesión de nuevo. Los identificadores existentes se conservan; las nuevas operaciones offline usan UUID. La actualización del service worker elimina únicamente la antigua caché `apis`, conservando IndexedDB. La protección requiere que el navegador active la nueva versión.

Los registros antiguos de la cola que no tienen autor, tara o detalle de clasificación suficiente se conservan y no se atribuyen a otra cuenta ni se completan con valores supuestos. Falta proporcionar el recorrido de revisión y recuperación para esos registros.

## Verificación ejecutada

| Comprobación | Resultado |
|---|---|
| Generación del cliente Prisma | Correcta |
| TypeScript sin emisión | Correcto |
| Compilación de producción | Correcta |
| Pruebas de servicios, persistencia y seguridad | 20 aprobadas |
| Suite con integración HTTP sobre la aplicación compilada | 21 aprobadas en total, incluyendo las 20 anteriores |
| Lint de backend, sincronización, hooks de campo, configuración y herramientas de esta fase | Cero errores; seis advertencias por parámetros sin uso |
| Lint global | Sigue fallando: 19 errores y 105 advertencias; la auditoría había registrado 62 errores y 106 advertencias |
| Revisión de formato de diferencias | Correcta |

Las pruebas crean una base temporal independiente, aplican las migraciones y la eliminan al finalizar. Cubren revocación entre procesos, reactivación, sesiones reales de NextAuth, permisos, autoría, ausencia de hashes en detalle, clasificación, valores inválidos, idempotencia, fallos parciales, tara distinta de 1,70, campaña cerrada y consumo concurrente de tokens. La prueba HTTP inicia una instancia de producción con esa base temporal y autentica mediante el flujo real de credenciales.

El aislamiento de la cola local y la eliminación selectiva de caché tienen comprobaciones automatizadas, pero no equivalen a una prueba completa de la PWA en un dispositivo. No se han certificado funcionamiento offline completo, envío real de correo, seguridad integral ni preparación de producción.

Los errores de lint restantes están principalmente en catálogos, dashboard, perfil, reset, personal y repositorios existentes. Se conserva el informe de diagnóstico local en `prisma/backups/lint-security-20261009.json`. No se desactivaron reglas generales para declarar una aprobación artificial.

## Preparación y comandos

Para una instalación nueva, instalar las dependencias desde el archivo de bloqueo y copiar `.env.example` a `.env`, completando los valores privados. No reemplazar un `.env` existente. `NEXTAUTH_SECRET` debe contener un secreto aleatorio; el ejemplo no incluye credenciales.

```powershell
npm ci
npm run db:generate
npm run db:deploy
npm test
npm run build
npm run test:http
npm run dev
```

Para una base existente, ejecutar `npm run db:backup` antes de `npm run db:deploy`. El respaldo usa `VACUUM INTO` sobre una base SQLite local y queda en `prisma/backups/`. `db:deploy` aplica las migraciones guardadas; no exige reset.

El seed es opcional y crea datos de prueba. Para crear usuarios nuevos exige `SEED_ADMIN_PASSWORD` y `SEED_USER_PASSWORD`; no modifica las contraseñas de usuarios que ya existen. No es un mecanismo de rotación de contraseñas.

## Secuencia siguiente

1. Con las respuestas del cliente y el Excel con fórmulas, cerrar unidad de registro, categorías, tara, cuadre, descarte, entregas y rechazo. Convertir cada decisión en ejemplos de aceptación y actualizar la matriz de trazabilidad.
2. Implementar el modelo y el recorrido funcional acordados, incluyendo el reporte completo y sus cálculos, sin apoyar la cobertura en el antiguo reporte que declaraba 100 %.
3. Completar permisos, excepciones y recuperación por correo; resolver los errores de lint restantes y las limitaciones conocidas de las pantallas.
4. Probar la captura y recuperación offline en dispositivos reales, junto con sesiones vencidas, cambios de cuenta, interrupciones y cierre de campaña.
5. Ensayar restauración, preparar el entorno de entrega y realizar aceptación con ejemplos reales del cliente antes de publicar.

Las decisiones técnicas reversibles pueden avanzar dentro de la autorización existente. Las reglas que cambien resultados agrícolas, responsabilidades o aceptación del cliente deben consultarse y quedar registradas antes de implementarlas.
