# Base limpia e inicialización de Finca JIRAH

Preparada el 10 de octubre de 2026, por solicitud expresa de eliminar todos los datos ficticios y conservar únicamente `admin.pruebas@fincajirah.test` con su contraseña anterior. No constituye una aceptación de producción.

## Resultado

- Base local: `C:\Proyectos\FincaJIRAH\prisma\dev.db`.
- Único usuario: administrador activo. Se conservó el hash de su contraseña y se asignó un identificador nuevo para invalidar las sesiones anteriores.
- Cero trabajadores, campañas, lotes, compradores, parámetros de campañas, pesajes, clasificaciones, jornadas, entregas, devoluciones, ajustes, revisiones y anulaciones.
- Se eliminaron los tokens de recuperación y controles de intentos previos. Los controles internos pueden generar nuevos registros al usar la aplicación.
- Se conservaron el esquema, los índices, las relaciones y las nueve migraciones. La comprobación de claves foráneas no encontró errores.

Antes de limpiar se detuvo la vista previa y se creó el respaldo consistente `prisma/backups/jirah-2026-10-11T01-49-16-406Z.sqlite`. Está excluido de Git y contiene los datos ficticios anteriores; conservarlo para recuperación y no entregarlo como base inicial del cliente. La limpieza se realizó en una transacción únicamente sobre la base local indicada.

## Inicialización repetible

`npm run db:seed` crea exclusivamente el administrador inicial configurado mediante `SEED_ADMIN_EMAIL`, `SEED_ADMIN_CEDULA` y `SEED_ADMIN_PASSWORD`. No carga demostraciones. Repetirlo conserva el administrador existente y su contraseña; rechaza una cuenta de campo, una cuenta inactiva o la creación de otro administrador con un correo diferente. La semilla no vacía una base existente.

La configuración vigente utiliza el correo provisional aprobado y la cédula de prueba `0000000001`. Antes de entregar al cliente hay que sustituir la identidad provisional y la contraseña. Las credenciales están en archivos privados excluidos de Git; no se publican en este documento.

## Ejecutar y preparar la operación

Desde la raíz del proyecto, `npm run dev` abre desarrollo con recarga automática en `http://localhost:3000/login`. `.env` utiliza ese mismo origen. No hace falta ejecutar migraciones, semilla ni reiniciar la base para abrirla nuevamente. No ejecute otro servidor simultáneamente en el mismo puerto.

El administrador crea primero personal, lotes, campañas y compradores. En desarrollo, la pantalla de creación muestra la contraseña temporal del trabajador. En producción esa clave no se expone: el administrador envía una invitación desde el expediente para que el trabajador establezca su contraseña. SMTP aún no está configurado; falta probar el proveedor real y usar un correo inicial que reciba mensajes.

El modo sin conexión se prueba con `npm run build` y `npm start`, después de detener desarrollo. La PWA está deshabilitada en `dev`. Visitar y preparar las pantallas con conexión sigue siendo obligatorio.

## Permisos y límites

La limpieza no cambia los roles definidos en el código: ADMIN, AGRICULTOR, CLASIFICADOR y AGRICULTOR_CLASIFICADOR. El formulario de personal solo crea roles de campo. Las operaciones administrativas continúan protegidas en el servidor, incluidas invitaciones, catálogos, aprobaciones, correcciones y movimientos comerciales. Los trabajadores anteriores ya no pueden autenticarse y sus identificadores no corresponden al administrador nuevo.

Política confirmada posteriormente por el propietario: agricultores y clasificadores comparten captura y clasificación porque una persona puede alternar ambas tareas. Solo el administrador tiene funciones administrativas y reportes globales. Los pendientes de navegadores anteriores no se borran remotamente: no deben restaurarse como datos iniciales y deben descartarse en el dispositivo si eran ficticios.

La revisión manual encontró una navegación intermitente tras autenticar: el login solicitaba navegar y refrescar la ruta inmediatamente. Se sustituyó por una única navegación `replace`, manteniendo la validación de sesión y el destino según rol. No cambió la apariencia ni los permisos.

## Evidencia

- 53 pruebas aisladas aprobadas tras actualizar la inicialización, incluidas creación mínima, repetición sin cambio de contraseña y rechazo de promoción o segundo administrador.
- Lint y typecheck aprobados.
- Estado de Prisma: nueve migraciones aplicadas; esquema actualizado.
- Acceso real del administrador sobre la base limpia: panel y APIs de perfil, personal, catálogos, estadísticas y entregas respondieron 200. Perfil sin sesión respondió 401. No hubo errores JavaScript de página. Personal devuelve únicamente el administrador y no expone su hash.
- Archivos privados de verificación: `prisma/backups/verificacion-base-limpia.json`, `verificacion-inicio-limpio.json` e `inicio-base-limpia.png`.

El recorrido recomendado está en `docs/GUIA_PRUEBAS_MANUALES.md`. Configurar correo, completar la identidad real, preparar el servidor y obtener aceptación del cliente siguen siendo condiciones de entrega. La revisión posterior de seguridad y sincronización se documenta en `docs/SEGURIDAD_Y_PERMISOS_2026-10-10.md` y `docs/OPERACION_OFFLINE_Y_CONFLICTOS.md`.
