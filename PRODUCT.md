# Finca JIRAH

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Trabajadores de la finca: registran pesajes y clasificación por campaña, jornada y lote; necesitan operar desde el teléfono cuando hay conexión y cuando no la hay.
- Administrador: organiza campañas, lotes, compradores y personal; revisa producción, autoriza diferencias, corrige registros con historial y controla entregas, devoluciones y reportes.

## Product Purpose

Digitalizar el registro de cosecha de pitahaya y su seguimiento comercial. Sustituye la transcripción del cuaderno al Excel del administrador, conserva el origen de la fruta y produce información de respaldo para cobros, históricos y productividad.

## Positioning

La continuidad entre pesaje en campo, clasificación por lote, entrega y devolución del comprador es el centro del producto. El saldo comercial y los porcentajes deben poder explicarse a partir de los movimientos registrados.

## Operating Context

- Uso móvil en finca y uso administrativo en escritorio y móvil.
- Una campaña agrupa fruta nacida en la misma fecha y puede abarcar varios lotes y jornadas.
- La cosecha y la clasificación se realizan en la misma jornada, manteniendo separados los lotes. Cada jornada se entrega al día siguiente según el proceso descrito por el cliente.
- El trabajador puede registrar una gaveta o un grupo indicando su cantidad, peso bruto, responsable, fecha y hora.
- La fuente original del proceso es el cuaderno de campo y el Excel de cosechas con fórmulas suministrado por el cliente.
- El proyecto está en desarrollo y contiene datos de prueba, según confirmación del usuario.

## Capabilities and Constraints

- Aplicación PWA existente con Next.js App Router, React, TypeScript y Tailwind CSS. Iconografía existente: Lucide. No es una aplicación nativa.
- Captura local y sincronización requieren conservar los registros, su identidad y la separación entre cuentas; el rediseño debe mantener ese comportamiento.
- Cálculo de netos con cantidad real de gavetas y tara correspondiente. La tara habitual en finca es 1,70 kg; el cliente informó variación de tara en entregas según comprador.
- Categorías de exportación G y P; referencia confirmada: G desde 280 g y P desde 180 g hasta menos de 280 g. Los límites son parámetros modificables. N1, N2 y N3 se eligen visualmente por tamaño.
- Cuadre sobre exportación + nacional, con margen de ±4 % y aprobación administrativa cuando corresponde. El alcance aprobado no incluye un descarte separado.
- Entregas con varios orígenes, varias devoluciones y devolución sin atribuir cuando el comprador no informa el lote; no repartirla automáticamente.
- La fruta devuelta pasa a nacional. Correcciones de jornadas cerradas y anulaciones comerciales son administrativas, con motivo, historial y control de dependencias.
- Conservar autenticación, recuperación de acceso, permisos, rutas, fórmulas, reportes y trazabilidad durante el trabajo visual.
- Las notas antiguas del Excel no sustituyen las respuestas finales del cliente. Las cantidades ambiguas de gavetas en rechazos requieren registro explícito; no deben deducirse de un peso agregado.

## Brand Commitments

- Conservar el nombre Finca JIRAH y el logotipo existente: decisión confirmada por el usuario el 10 de octubre de 2026.
- Activo original: `public/Logo.jpeg`, pitahaya amarilla en acuarela con nombre de la finca. Mantener proporciones, integridad y espacio de protección.
- Interfaz en español. El usuario solicita una estética propia y contempla una pitahaya amarilla animada junto al acceso.

## Evidence on Hand

- `AI SOFTWARE ENGINEERING GUIDELINES.md`: criterios de ingeniería, interfaz, accesibilidad y rendimiento del proyecto.
- `docs/REGLAS_NEGOCIO_Y_CONTRASTE_EXCEL_2026-10-09.md` y `REPORTE_DE_TRAZABILIDAD.md`: reglas y contraste funcional.
- `docs/MANUAL_OPERACION_Y_ACEPTACION.md`: recorridos operativos.
- `Registro de cosechas.xlsx`: archivo de referencia del proyecto; también se proporcionó un Excel con fórmulas y aclaraciones del cliente en la conversación.
- `app/login/page.tsx`, `app/dashboard/layout.tsx` y `app/globals.css`: implementación visual actual.
- `prisma/backups/browser-qa/`: capturas de la verificación funcional anterior; contrastarlas con el código actual antes de reutilizarlas como referencia visual.
- No hay un modelo 3D de pitahaya suministrado ni validado. No inventar estadísticas de producción, testimonios ni propiedades nutricionales para decorar la interfaz.

## Product Principles

1. Cada cifra de producción debe conservar un origen explicable.
2. Capturar en campo debe ser rápido y tolerante a interrupciones de conexión.
3. Guardado local y confirmación del servidor son estados diferentes y deben comunicarse con claridad.
4. La identidad de la finca debe acompañar la operación sin ocultar datos, errores o acciones importantes.
5. Las decisiones confirmadas por el cliente prevalecen sobre supuestos y notas antiguas.
