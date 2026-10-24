# Preferencias y consultas: encaje visual — 22 de octubre de 2026

## Resultado y alcance

La preferencia de tema compartida, la explicación del cuadre fijo y la paginación de consultas amplían las superficies operativas existentes de Finca JIRAH. El modo es **Operate**: identificar la tarea, ver el estado y actuar con los controles del panel. No se reemplaza la identidad ni se extiende el lenguaje de autenticación a las pantallas de trabajo.

Este cierre conserva `PRODUCT.md`, `DESIGN.md` y `.impeccable/design.json`. El sistema de acceso registrado sigue describiendo la escena botánica, fondo continuo y cristal de campos de acceso; el panel conserva sus tokens agrícolas, superficies opacas y composición operativa. Los contratos de sincronización, cálculo, consultas y pendientes de aceptación están en `docs/IMPLEMENTACION_REGISTRO_Y_PREPARACION_OFFLINE_2026-10-22.md`, que no se modifica aquí.

## Continuidad observada

| Aspecto | Implementación conservada |
| --- | --- |
| Identidad | Nombre de la finca, `public/Logo.jpeg`, navegación y cabecera del panel existentes. |
| Paleta | Verdes `agri-green-main` y `agri-green-dark` para acción y énfasis, pizarra para apoyo, blancos/grises y variantes oscuras para superficies y bordes. No se agregan tokens cromáticos. |
| Tipografía | Manrope global y jerarquía operativa existente: títulos, etiquetas y texto de apoyo. La extensión no crea una escala global. |
| Material | Contenedores opacos con bordes y radios existentes; modal de compradores con fondo atenuado y desenfoque ya presente. No se añade cristal a los campos operativos. |
| Adaptación móvil | Opciones de tema apiladas, formularios con una columna en anchos estrechos, navegación de páginas que permite ajuste de línea y menú móvil del panel. Las cuadrículas amplían columnas en escritorio. |
| Estados | Mensajes textuales de guardado pendiente, carga y error; botones deshabilitados durante acciones o fuera del rango de páginas. El color acompaña la información. |

La regla existente **The Roles Rule** respalda conservar los tokens de cada superficie: esta extensión usa los del panel sin convertir los roles `--auth-*` en un tema universal. **The Continuous Space Rule** continúa siendo una regla de las superficies de acceso; no obliga a retirar los contenedores operativos del panel.

## Patrones de la extensión

### Preferencia por cuenta

Perfil y control del panel utilizan `useTema` y la misma cola por usuario. La selección se aplica al documento mediante los mecanismos de tema ya usados por el panel; las opciones de perfil conservan su composición y selección visible. Un estado textual diferencia una preferencia guardada en el dispositivo y pendiente de sincronizar de la sincronización con la cuenta.

La cola de preferencia permanece separada de la cola de cosecha. El estado visual no convierte una selección local en prueba de confirmación del servidor. La lógica conserva el último cambio y evita que una respuesta antigua de consulta sustituya una elección local posterior. Este comportamiento amplía el contrato de guardado; no introduce una paleta nueva ni cambia el sistema de diseño.

### Compradores y cuadre fijo

El formulario de comprador sustituye la tolerancia editable por «Cuadre de cosecha: ±4 %» y una explicación breve: se calcula por jornada y lote sobre exportación + nacional y no depende del comprador. La información usa la jerarquía y espacio del formulario existente. No se presenta como control deshabilitado ni promete un ajuste individual.

### Jornadas e historial comercial

Clasificación añade «Anterior», «Página … de …» y «Siguiente» a la lista de jornadas. La explicación distingue hasta 25 jornadas por página de las capturas pendientes locales; sin servidor indica que se muestran las jornadas preparadas y operaciones de la cuenta. La paginación no recorta los pesajes de una jornada individual.

El historial comercial usa navegación equivalente, de 25 entregas por página, con límites y carga. Al cambiar página retira los datos anteriores y limpia la entrega/origen seleccionados. La devolución explica que el selector muestra las entregas de la página actual y que una entrega anterior se busca cambiando la página del historial. Las cuadrículas, controles, bloques de historial y disposición de acciones reutilizan la composición existente.

Estos patrones son extensiones locales. No se incorporan nuevos tokens, componentes canónicos ni reglas que hagan de cada medida heredada una recomendación para futuras pantallas.

## Fuentes contrastadas

| Archivo | Evidencia |
| --- | --- |
| `app/dashboard/perfil/page.tsx` | Opciones y estado de tema en preferencias. |
| `app/dashboard/layout.tsx` | Control de tema compartido y estructura del panel. |
| `lib/tema.ts` | Aplicación de tema, cola local por usuario y sincronización. |
| `lib/hooks/useTema.ts` | Preferencia compartida y mensaje visible de estado. |
| `app/dashboard/catalogos/compradores/page.tsx` | Explicación fija del margen en el formulario. |
| `app/dashboard/campo/clasificacion/page.tsx` | Lista de jornadas, explicación y navegación. |
| `app/dashboard/comercial/page.tsx` | Historial paginado y selección comercial asociada a la página. |
| `app/globals.css`, `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json` | Referencia de identidad, tipografía, roles y separación de superficies. |

## Evidencia visual final

Las ocho capturas finales tienen fecha del 22 de octubre de 2026, alrededor de las 13:00, hora local. Se comprobaron existencia y fecha de los archivos:

| Ruta bajo `prisma/backups/browser-qa/` | Superficie |
| --- | --- |
| `operacion-20261022/preferencias-mobile.png` | Preferencias en móvil. |
| `operacion-20261022/preferencias-desktop.png` | Preferencias en escritorio. |
| `operacion-20261022/comprador-mobile.png` | Formulario de comprador en móvil. |
| `operacion-20261022/comprador-desktop.png` | Formulario de comprador en escritorio. |
| `operacion-20261022/clasificacion-mobile.png` | Clasificación en móvil. |
| `operacion-20261022/clasificacion-desktop.png` | Clasificación en escritorio. |
| `comercial-movil.png` | Flujo comercial en móvil. |
| `comercial-escritorio.png` | Flujo comercial en escritorio. |

Para esta nota se inspeccionaron directamente preferencias móvil, comprador escritorio, clasificación móvil y comercial móvil, contrastando sus patrones con el código. No se generaron nuevas capturas ni se abrió una nueva ronda de pulido.

## Veredicto y verificación

El revisor fresco `operacion_finish_reviewer` dio disposición **ship**, sin correcciones materiales requeridas, para esta extensión de operación. Confirmó continuidad de TYPE/MATERIAL/GROUND y adaptación móvil respecto del panel heredado. El veredicto corresponde a esta extensión; no certifica globalmente la interfaz, la PWA ni su uso en teléfonos físicos.

El veredicto previo de `registro_finish_reviewer` conserva su alcance: **ship** limitado a correos largos y carga del filtro administrativo, ambos resueltos. Las capturas de ese recorrido fueron regeneradas y no hubo cambios posteriores en el CSS de acceso; el nuevo veredicto operativo no amplía aquella aprobación.

Lint, comprobación de tipos y compilación fueron informados como aprobados. Se leyeron los logs finales `prisma/backups/registro-e2e.log` y `prisma/backups/registro-mail.log`: ambos registran **80 pruebas, 80 aprobadas y 0 fallos**. El resultado anterior de 76/76 documentaba la primera fase y no describe ya los logs vigentes. No se repitieron las pruebas en este cierre documental.

La aceptación PWA en Android/iPhone reales, condiciones de campo, permanencia de almacenamiento, batería y actualización entre compilaciones sigue teniendo los límites descritos en el documento funcional. Los conjuntos de prueba y capturas no equivalen a certificación de capacidad para varios años de datos.

## Excepciones heredadas, sin canonizar

El panel conserva detalles preexistentes, incluidos tamaños auxiliares compactos, texto de referencia como «CU-02» en perfil y símbolos de sol/luna en las opciones de tema. Su presencia en la entrega no los convierte en nuevos tokens ni prescribe usarlos como iconografía o texto del producto en nuevas superficies. El trabajo solicitado amplió el comportamiento; no autorizó una limpieza visual general.

Los siete avisos consultivos del detector de acceso siguen registrados en `prisma/backups/registro-disenio.json` y descritos en `docs/IMPLEMENTACION_VISUAL_REGISTRO_Y_ESTADO_OFFLINE_2026-10-22.md`. No se ejecutó otra ronda del detector, no se reparó deriva heredada y no se reescribieron `DESIGN.md` ni su sidecar para legitimar excepciones.
