# Registro y estado offline: encaje visual — 22 de octubre de 2026

## Resultado y límite de esta nota

Las pantallas de registro, verificación y bienvenida amplían la identidad de acceso existente de Finca JIRAH. Solicitudes y preparación offline mantienen el lenguaje operativo del panel. Esta entrega es una extensión ordinaria: no establece un nuevo mundo visual, no rediseña el panel y no sustituye los tokens vigentes.

Esta nota registra la implementación y la evidencia de cierre. `PRODUCT.md`, `DESIGN.md` y `.impeccable/design.json` se consultaron y se conservaron. El alcance funcional, las reglas de permisos y los pendientes de entrega se describen en `docs/IMPLEMENTACION_REGISTRO_Y_PREPARACION_OFFLINE_2026-10-22.md`; ese documento no se modifica ni se reemplaza aquí.

## Continuidad con el sistema establecido

| Compromiso existente | Evidencia en la extensión |
| --- | --- |
| Finca JIRAH y logotipo original | Las tres rutas de acceso reutilizan el layout de acceso y `AuthShell`, que conserva `public/Logo.jpeg`, nombre y descripción de marca. |
| Espacio continuo, fondo verde piedra y fotografía amarilla flotante | La escena sigue perteneciendo a `AuthShell`; las páginas aportan contenido de tarea dentro del formulario abierto. No agregan una tarjeta exterior. La imagen fotorealista continúa como entrega predeterminada; esta extensión no aprueba ni activa el prototipo 3D pendiente. |
| Cristal reservado a campos | Registro y verificación usan los campos y contraseñas existentes, con superficie semitransparente, desenfoque fijo, borde y foco del sistema de acceso. |
| Tarea prioritaria en móvil | Se hereda la ocultación de escena por debajo de 800 px. Nombres y apellidos pasan a una columna hasta 400 px. El formulario largo conserva desplazamiento vertical. |
| Manrope local y roles de acceso | Títulos, descripciones, etiquetas, ayuda, errores y acciones reutilizan los estilos y variables `--auth-*`. No se introduce otra familia tipográfica ni otra paleta de autenticación. |
| Separación entre acceso y operación | Solicitudes y `OfflineReadiness` usan superficies, divisores, controles y colores del panel; no trasladan el cristal ni la escena botánica a tareas administrativas. |

Se mantienen las reglas existentes **The Roles Rule** —aplicar los roles de autenticación en sus superficies— y **The Continuous Space Rule** —fruta, formulario y relato sobre fondo continuo, con cristal en los campos—. El encaje no convierte la composición de acceso en plantilla para todo el producto.

## Patrones incorporados sin cambiar los tokens

- **Registro de cuenta:** nombres y apellidos agrupados en una cuadrícula adaptable, seguidos por identificación, correo y contraseña. Reutiliza `PasswordField`, etiquetas visibles, ayuda, error enfocable y acción principal con texto de progreso. La agrupación usa separación local de 12 px; no crea un token global.
- **Confirmación de identidad:** la verificación muestra la cuenta destinataria y ofrece usar otra cuenta. El correo largo puede partirse con `overflow-wrap: anywhere`, sin alterar la escala ni el ancho del formulario.
- **Estado de solicitud:** bienvenida presenta pasos, estado y próxima acción con texto e iconos Lucide existentes. La composición es abierta, con separación de 22 px, margen vertical de 28 px y título de estado de 22 px. Usa roles ya presentes; no establece un componente de tarjeta nuevo. Los párrafos admiten correos largos.
- **Revisión administrativa:** lista de solicitudes con divisores, filtro por estado, paginación, expediente y decisión con motivo. El cambio de filtro/página retira filas anteriores y muestra «Consultando solicitudes…»; controles y decisiones quedan limitados durante la carga. La pantalla no presenta una solicitud obsoleta como resultado del filtro nuevo.
- **Preparación del dispositivo:** un bloque operativo desplegable comunica preparación, plazo, pendientes, servidor y persistencia. Distingue «Red detectada; servidor todavía sin confirmar» de «Servidor disponible». Su mensaje de disponibilidad offline depende del estado comprobado, no solo del indicador de red. Errores y actualización conservan acciones textuales y áreas de control amplias.

La hoja local declara un ajuste `.compactForm` de 14 px antes de la regla base `.form` de 22 px. Por la cascada de igual especificidad, esta nota no presenta 14 px como espaciado efectivo ni lo promueve a regla reutilizable.

## Archivos que sustentan la extensión

| Archivo | Responsabilidad visual |
| --- | --- |
| `app/registro/page.tsx` | Formulario público y estados de solicitud. |
| `app/verificar/page.tsx` | Identidad, confirmación, ingreso y resultados del enlace. |
| `app/bienvenida/page.tsx` | Estado de correo/aprobación y siguiente acción. |
| `app/registro/layout.tsx`, `app/verificar/layout.tsx`, `app/bienvenida/layout.tsx` | Reutilización del layout de acceso. |
| `app/ui/auth/AuthShell.tsx`, `app/login/layout.tsx` | Composición, marca y escena heredadas. |
| `app/ui/auth/auth.module.css` | Roles existentes y extensiones locales de agrupación, estado y partición de texto. |
| `app/dashboard/personal/solicitudes/page.tsx` | Lista administrativa, carga, filtros y decisión. |
| `app/ui/OfflineReadiness.tsx` | Estado visible de preparación y actualización en el panel. |
| `app/globals.css` | Tipografía global y tokens agrícolas del panel consultados para el contraste. |

## Capturas conservadas

Carpeta: `prisma/backups/browser-qa/registro-20261022/`. Contiene nueve PNG frescos de la comprobación del recorrido:

| Captura | Superficie o estado |
| --- | --- |
| `registro-desktop.png` | Registro con escena y formulario abierto en escritorio. |
| `registro-mobile.png` | Registro móvil sin escena y con campos de nombre apilados. |
| `verificar-mobile.png` | Confirmación de correo en móvil. |
| `bienvenida-mobile.png` | Bienvenida en móvil. |
| `pendiente-desktop.png` | Solicitud pendiente en escritorio. |
| `pendiente-mobile.png` | Solicitud pendiente en móvil. |
| `solicitudes-desktop.png` | Revisión administrativa en escritorio. |
| `solicitudes-mobile.png` | Revisión administrativa en móvil. |
| `solicitudes-cargando-mobile.png` | Filtro administrativo en carga, con mensaje explícito y sin filas anteriores. |

Para redactar esta nota se contrastaron código, estilos, sistema registrado e inventario de capturas; se inspeccionaron directamente registro en escritorio/móvil y la captura móvil de carga. Las capturas no constituyen por sí solas una matriz completa de temas, dispositivos o accesibilidad.

## Veredicto y comprobaciones

El cierre recibió `VERDICT: PASS`, con disposición `ship`, del revisor fresco `registro_finish_reviewer`. Su alcance se limitó a dos correcciones resueltas: correos largos sin desbordamiento y carga del filtro administrativo sin filas obsoletas. No es una certificación global de la interfaz ni aprobación nueva del sistema de diseño.

El cierre funcional informó lint, comprobación de tipos y compilación aprobados. El resultado 76/76 de `test:e2e` y `test:mail` correspondió a la primera fase de registro; después de la extensión de preferencias y consultas, los logs vigentes `prisma/backups/registro-e2e.log` y `prisma/backups/registro-mail.log` registran 80/80 cada uno, con cero fallos. El recorrido de correo incluye SMTP local real sobre base temporal, sin agregar datos a la base de desarrollo. Se verificaron ambos logs finales para esta actualización documental; no se repitieron las pruebas para redactarla.

La preparación PWA comprobada en escritorio y las pruebas de correo local no sustituyen aceptación física en Android/iPhone, señal intermitente, almacenamiento y batería, actualización entre compilaciones ni recepción externa de correo. Los límites y pendientes completos siguen en el documento funcional.

## Avisos heredados conservados

El detector ya se ejecutó una vez y dejó siete avisos consultivos en `prisma/backups/registro-disenio.json`, todos referidos a `app/ui/auth/auth.module.css`: dos apariciones del color ambiental nocturno `rgb(95 116 78 / 22%)`, dos tamaños de 13 px y los ajustes existentes de 32, 20 y 17 px. Son discrepancias heredadas entre el detector y el registro de tokens; algunas ya están descritas como excepciones locales en la prosa de `DESIGN.md`.

No se repararon como efecto secundario, no se silenciaron y no se convirtieron en nuevos tokens ni recomendaciones generales. También se conserva la limitación documental existente: el alcance declarado de `DESIGN.md` enumera las rutas anteriores de acceso; esta nota registra la extensión sin reescribir ese contrato ni su sidecar. No hubo otra ronda de detector, rediseño o pulido durante este cierre documental.
