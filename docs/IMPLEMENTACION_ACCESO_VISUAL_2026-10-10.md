# Primer bloque visual de Finca JIRAH

Fecha: 10 de octubre de 2026. Dirección creativa delegada por el usuario, conservando nombre y logotipo.

**Actualizaciones posteriores:** el usuario pidió giro real, fondo neutro y textos sobre la fruta. La escena procedural descrita en `ESCENA_PITAHAYA_3D_2026-10-10.md` también fue rechazada posteriormente por su apariencia artificial. La escena vigente está descrita en `ACCESO_CRISTAL_2026-10-10.md`; el giro axial sigue pendiente. El relato siguiente conserva el registro histórico de la primera entrega.

## Resultado

Acceso, recuperación y nueva contraseña comparten una composición, tipografía y sistema de estados. En escritorio, una escena amarilla con pitahaya acompaña al formulario; en móvil, el espacio se concentra en el acceso. Hay temas claro y oscuro, campos amplios, foco visible, autocompletado y control para mostrar la contraseña.

La escena usa una imagen transparente y una entrada CSS breve. Tres mensajes describen el proceso real de la finca, con navegación manual y pausa; la reproducción se detiene cuando la pestaña está oculta y respeta movimiento reducido. No se implementó una rotación 3D ni se añadió Three.js. Esta primera entrega permite evaluar la identidad sin introducir un motor gráfico en el acceso.

La fuente Manrope se sirve desde la aplicación, con licencia OFL incluida en `app/fonts/`. Se retiró la carga externa de Google Fonts. El panel también recibe esta base tipográfica; su composición y componentes todavía no se han migrado al sistema de acceso.

## Comportamiento y límites

- Se conservan las rutas y contratos de autenticación, las comprobaciones de cuenta y las redirecciones por rol.
- Recuperación comprueba la respuesta del servidor: un fallo de correo o servicio ya no muestra una confirmación falsa. La respuesta exitosa mantiene el mensaje genérico que protege la existencia de las cuentas.
- Nueva contraseña informa de token ausente o inválido y valida coincidencia y requisitos antes de enviar. El servidor sigue siendo la autoridad de validación.
- Se conservaron los cambios funcionales anteriores. No se migraron bases de datos ni se modificaron reglas de cosecha o comerciales en esta entrega.

## Verificación

- Lint, comprobación de tipos y compilación de producción: correctos.
- Pruebas completas: **51 aprobadas, 0 fallidas**, con base temporal separada, HTTP real y Chrome. Incluyen captura y clasificación sin conexión, sincronización, informes, entregas, devoluciones, anulaciones y corrección/aprobación administrativa.
- Prueba específica de interfaz: aprobada en producción para temas, mostrar/ocultar contraseña, credenciales incorrectas, recuperación con respuestas 503/200, token ausente/expirado, contraseñas distintas sin envío y movimiento reducido.
- Vistas comprobadas: 1440×900, 768×1024, 390×844, 375×812 y 844×390. Sin desbordamiento horizontal en las comprobaciones; no equivale a certificación integral de accesibilidad ni a medición de Core Web Vitals en producción.
- Capturas esperan fuentes, imágenes decodificadas y fin de animaciones. Se guardan en `prisma/backups/browser-qa/` y `.impeccable/review/`.
- Detector mecánico de los componentes nuevos: sin hallazgos. Procedencia: un raster nuevo, ninguno sin metadatos.

La prueba completa inicialmente reveló dos carreras de verificación: desconectar antes de preparar las páginas visitadas de la PWA y consultar SQLite mientras una aprobación seguía en curso. La prueba ahora visita las tres pantallas de campo y espera su caché real antes de desconectar; comprueba la respuesta HTTP de aprobación antes de leer su resultado en la base. No se introdujeron esperas fijas ni reintentos de aprobación. El acceso offline a una página que nunca se preparó sigue siendo un punto a mejorar en la fase de interfaz de campo.

Revisión visual independiente: **ship**, primer bloque apto para entrega. Se revisaron las diez capturas actuales y el código; se comprobó presencia real de logotipo y fruta en claro/oscuro. Contrastes calculados de los tokens revisados: texto de apoyo ≥6,05:1, acciones ≥7,94:1 y error 6,99:1. La primera revisión pidió recaptura por activos no cargados y una vista previa antigua; el veredicto corresponde a los archivos finales verificados, no a esas capturas inválidas. No sustituye la aceptación del cliente ni certifica todo el panel.

## Activo y procedencia

La ilustración se creó con **image_gen.imagegen integrado** y se optimizó conservando transparencia:

- Activo: `public/brand/pitahaya-amarilla.webp`, 750×1000, 154330 bytes.
- Prompt completo: `docs/design/pitahaya-prompt.txt`.
- Origen y procesamiento: `docs/design/pitahaya-provenance.json`.
- Metadatos de procedencia junto al activo: `public/brand/pitahaya-amarilla.webp.json`.

El logotipo original no fue regenerado. No se añadieron dependencias de ejecución.

## Continuidad

`DESIGN.md` y `.impeccable/design.json` documentan el sistema implementado. La siguiente fase debe adaptar navegación, pesaje, clasificación y pendientes a la operación en campo: estado de conexión y preparación offline visibles, acción principal clara y revisión de datos antes de confirmar. Después, administración, entregas e informes. Los controles de historial, aprobación y dependencias comerciales deben permanecer accesibles durante esa migración.
