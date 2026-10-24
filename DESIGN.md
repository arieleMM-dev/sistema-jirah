---
name: Finca JIRAH — Acceso
description: Espacio continuo con pitahaya fotorealista y cristal para acceso y recuperación; 3D guardado como trabajo pendiente.
colors:
  auth-bg: "#e4e7df"
  auth-surface: "rgb(255 255 255 / 55%)"
  auth-ink: "#183c2b"
  auth-muted: "#506153"
  auth-border: "#7a8a7b"
  auth-action: "#26523b"
  auth-action-ink: "#fff"
  auth-hover: "#183c2b"
  auth-error: "#9d2424"
  auth-error-bg: "#fff0ee"
  auth-success-bg: "#e8f1df"
  auth-focus: "#466a35"
  auth-bg-dark: "#101c19"
  auth-surface-dark: "rgb(255 255 255 / 6%)"
  auth-ink-dark: "#f0f5e8"
  auth-muted-dark: "#b9c8ba"
  auth-border-dark: "#7c927f"
  auth-action-dark: "#f2ce35"
  auth-action-ink-dark: "#183c2b"
  auth-hover-dark: "#f8dc62"
  auth-error-dark: "#ffd6d0"
  auth-error-bg-dark: "#422723"
  auth-success-bg-dark: "#293f2c"
  auth-focus-dark: "#f2ce35"
typography:
  display:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(38px, 3.9vw, 56px)"
    fontWeight: 450
    lineHeight: 1.1
    letterSpacing: "-.04em"
  headline:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(28px, 2.4vw, 36px)"
    fontWeight: 750
    lineHeight: 1.2
    letterSpacing: "-.035em"
  title:
    fontFamily: "Manrope, sans-serif"
    fontSize: "18px"
    fontWeight: 750
    letterSpacing: "-.02em"
  story-title:
    fontFamily: "Manrope, sans-serif"
    fontSize: "22px"
    fontWeight: 750
    letterSpacing: "-.02em"
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "15px"
    lineHeight: 1.65
  story:
    fontFamily: "Manrope, sans-serif"
    fontSize: "15px"
    lineHeight: 1.65
  label:
    fontFamily: "Manrope, sans-serif"
    fontSize: "14px"
    fontWeight: 650
  input:
    fontFamily: "Manrope, sans-serif"
    fontSize: "16px"
  button:
    fontFamily: "Manrope, sans-serif"
    fontSize: "14px"
    fontWeight: 750
  supporting:
    fontFamily: "Manrope, sans-serif"
    fontSize: "12px"
    lineHeight: 1.6
rounded:
  control-small: "8px"
  control: "10px"
  confirmation: "16px"
  circle: "50%"
spacing:
  control-gap: "12px"
  field-gap: "9px"
  form-gap: "22px"
  inset: "24px"
  section: "28px"
  description: "32px"
  panel-wide: "40px"
components:
  button-primary:
    backgroundColor: "{colors.auth-action}"
    textColor: "{colors.auth-action-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "13px 18px"
    width: "100%"
  button-primary-hover:
    backgroundColor: "{colors.auth-hover}"
  button-primary-dark:
    backgroundColor: "{colors.auth-action-dark}"
    textColor: "{colors.auth-action-ink-dark}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "13px 18px"
    width: "100%"
  button-primary-dark-hover:
    backgroundColor: "{colors.auth-hover-dark}"
  input:
    backgroundColor: "{colors.auth-surface}"
    textColor: "{colors.auth-ink}"
    typography: "{typography.input}"
    rounded: "{rounded.control}"
    padding: "12px 15px"
    width: "100%"
  theme-button:
    textColor: "{colors.auth-ink}"
    rounded: "{rounded.circle}"
    size: "44px"
  error:
    backgroundColor: "{colors.auth-error-bg}"
    textColor: "{colors.auth-error}"
    rounded: "{rounded.control}"
    padding: "14px 16px"
  success-icon:
    backgroundColor: "{colors.auth-success-bg}"
    textColor: "{colors.auth-ink}"
    rounded: "{rounded.confirmation}"
    size: "60px"
---

# Design System: Finca JIRAH

## Overview

**Creative North Star: "Cada cosecha cuenta"**

Una entrada botánica y operativa en un espacio continuo: la imagen fotorealista de pitahaya amarilla comparte el fondo con la interfaz, suspendida sin caja propia ni suelo. La decisión final explícita del usuario conserva esta imagen y guarda el 3D como trabajo pendiente. El formulario es el destino inmediato. Formulario y mensajes se apoyan directamente sobre el fondo, sin tarjetas exteriores. El cristal semitransparente se concentra en los campos, con desenfoque fijo y bordes suaves, según la corrección explícita del usuario.

Este sistema describe exclusivamente `/login`, `/recuperar` y `/recuperar/reset`, a partir de `app/ui/auth/` y del contrato corregido en `docs/design/acceso.md`. El panel operativo conserva su composición y sus tokens agrícolas; solo comparte Manrope local. El nombre Finca JIRAH y el logotipo original `public/Logo.jpeg` son compromisos de marca. No cambian autenticación, rutas, permisos ni reglas de negocio.

La exploración del 14 de octubre de 2026 produjo un modelo amarillo con giro real a partir de fotografías propias y adaptación artística, sin sustituir el mundo visual existente. Su última revisión solicita reconstruirlo (REBUILD); no está aprobado como fotorealista. La entrega elegida conserva la imagen flotante y los mensajes aleatorios, sin lienzo 3D ni descarga del GLB en el modo predeterminado. La secuencia de escritorio conserva marca, fruto flotante y dato botánico a la izquierda, con acceso inmediatamente usable a la derecha. El prototipo permanece disponible únicamente mediante activación explícita para pruebas locales; no es una entrega 3D terminada.

**Key Characteristics:**

- Imagen fotorealista de pitahaya amarilla con alpha nativo, suspendida sobre fondo continuo.
- Formulario y mensajes abiertos sobre el fondo; cristal solo en los campos.
- Manrope local y logotipo original íntegro.
- Temas claro y oscuro con la misma jerarquía; formulario prioritario en móvil.
- Flotación y mensajes con suspensión contextual; 3D guardado y desactivado por defecto como trabajo pendiente.

## Colors

Verde profundo, piedra verdosa y cristal claro acompañan la fruta dorada. En oscuro, el verde carbón recibe una iluminación ambiental tenue y la acción pasa a amarillo. El frontmatter conserva los formatos CSS de la implementación y es la referencia normativa.

### Primary

- **Verde de acción:** `auth-action` y `auth-hover` identifican el envío en claro.
- **Amarillo de acción nocturna:** `auth-action-dark` y `auth-hover-dark` conservan contraste sobre el fondo oscuro.
- **Foco:** `auth-focus` y su variante oscura distinguen navegación por teclado.

### Neutral

- **Piedra verdosa / verde carbón:** `auth-bg` y `auth-bg-dark` sostienen todo el espacio, incluida la fruta.
- **Cristal de campo:** `auth-surface` y su variante oscura aportan translucidez al interior de los campos; el mismo rol rellena el hover del control de tema. Formulario y relato carecen de superficie exterior.
- **Tinta, texto secundario y borde:** `auth-ink`, `auth-muted` y `auth-border` mantienen roles distintos. Los sufijos `-dark` sustituyen los mismos roles.
- **Mensajes de estado:** `auth-error` sobre `auth-error-bg`; confirmación con `auth-success-bg`. Tienen variantes oscuras y texto explícito.

**The Roles Rule.** Aplicar los roles de autenticación dentro de sus superficies; no sustituir automáticamente los tokens agrícolas del panel.

## Typography

**Display Font:** Manrope, con sans-serif de respaldo.  
**Body Font:** Manrope, con sans-serif de respaldo.

Fuente variable local en `app/fonts/Manrope-Variable.ttf`, rango de pesos (200–800), carga con intercambio de fuente. Licencia en `app/fonts/OFL-Manrope.txt`. La variable `--font-jirah` también alimenta la tipografía global.

### Hierarchy

- **Display:** título botánico; la segunda línea se enfatiza con peso (800). Desde (800px) con altura máxima de (760px) usa (38px); el ajuste compacto entre (800px) y (1100px), declarado después, usa (32px).
- **Headline:** título del formulario; hasta (480px) usa (28px).
- **Title:** marca de (18px), reducida a (17px) por debajo de (800px). **Story title:** título botánico de (22px), reducido a (20px) entre (800px) y (1100px).
- **Body:** descripción del formulario, máximo (40ch).
- **Story:** descripción botánica, máximo (43ch).
- **Label / input / button:** los roles del frontmatter separan etiqueta, edición y acción.
- **Supporting:** nota de acceso, descripción de marca y requisitos. La leyenda botánica es vertical y cursiva. Los enlaces de recuperación, retorno y la ayuda conservan actualmente (13px); esta excepción existente no establece una nueva escala recomendada.

## Layout

En escritorio, dos columnas con proporción (1.25fr / 1fr), separación `clamp(32px, 5vw, 80px)` y ancho máximo (1440px). La cabecera tiene máximo (1536px) y relleno (24px 56px); el cuerpo usa (12px 64px 44px). El formulario centra un contenido de máximo (400px). La página ocupa (100dvh) y permite desplazamiento vertical.

La escena es transparente: título, fruta y relato comparten el fondo de página. La imagen tiene altura `clamp(300px, 46dvh, 460px)` y mantiene proporciones. Solo en pruebas explícitas del prototipo, el lienzo 3D transparente ocupa el mismo soporte de figura, superpuesto sin desplazar el formulario ni el relato. Los seis mensajes comparten una celda de cuadrícula: sus alturas permanecen presentes aunque solo uno sea visible, evitando saltos. El relato usa altura mínima de (100px) y separación superior de (16px). Entre (800px) y (1100px), las columnas son iguales y separadas (28px); cabecera (20px 28px), cuerpo (16px 28px 28px), formulario (32px 28px 24px), fruta (350px), relato de altura mínima (135px). Este ajuste posterior prevalece sobre el de altura reducida.

Por debajo de (800px), se oculta la escena y queda una columna con formulario abierto de máximo (540px), relleno (36px 28px 24px) y contenido de máximo (400px). Hasta (480px), el formulario elimina el relleno horizontal interior, usa (28px 0 20px) y aprovecha el ancho disponible entre los márgenes de página. El cristal permanece en los campos. Los márgenes consideran las áreas seguras. Desde (800px), con altura máxima (760px), la fruta usa (300px) y su soporte mínimo (290px), salvo el ajuste compacto anterior.

El ritmo combina campos separados (22px), etiqueta a campo (9px), acciones con área (44px), campos de altura mínima (52px) y envío de altura mínima (54px). Estas medidas describen la superficie implementada; no migran el panel operativo.

## Elevation & Depth

La profundidad procede del alpha nativo y la iluminación de la imagen fotorealista, un degradado ambiental radial y los campos de cristal. El volumen, la iluminación y las sombras propias del prototipo 3D guardado son experimentales; su acabado no constituye una referencia aprobada. No hay sombra de tarjeta, suelo, elipse de apoyo ni contenedor detrás de la fruta. Formulario y relato no tienen fondo, borde, radio ni desenfoque de contenedor. Solo los campos aplican desenfoque de fondo fijo de (12px). La iluminación nocturna conserva el valor ambiental existente `rgb(95 116 78 / 22%)`; es un detalle de esta superficie, no un nuevo rol cromático reutilizable.

**The Continuous Space Rule.** Mantener fruta, formulario y relato sobre el fondo continuo; reservar el cristal para los campos, sin tarjetas exteriores.

## Shapes

Formulario y relato abiertos, sin esquinas ni bordes de contenedor. Los controles tienen curvatura moderada según los radios del frontmatter; el control de tema es circular. El logotipo conserva proporciones con ancho (68px), reducido a (60px) por debajo de (800px). Campos y alertas comparten radio de control; el icono de confirmación usa una esquina más amplia.

## Components

### Buttons

Envío a ancho completo con altura mínima (54px). Hover cambia el fondo; presión desplaza (1px); deshabilitado reduce opacidad a (.65). La transición dura (180ms), con curva `ease`. Foco visible de (3px), separado (4px), también en enlaces y campos.

El tema usa un círculo de (44px), borde visible e icono Lucide. Respeta la preferencia del sistema cuando no hay selección guardada y conserva la elección en `jirah-tema`.

### Cards / Containers

Formulario y relato se disponen sobre el fondo sin fondo propio, borde, radio, sombra ni desenfoque exterior. El relleno organiza el formulario; la cuadrícula superpone los mensajes para conservar la altura. No hay tarjetas de acceso ni de relato.

### Inputs / Fields

Borde de (1px), altura mínima (52px), texto de (16px) y desenfoque de fondo fijo de (12px). El rol de superficie aporta blanco al (55%) en claro y al (6%) en oscuro. Hover refuerza el borde; estado inválido con rol de error. Contraseña reserva espacio derecho para una acción de visibilidad de (44px), con nombre accesible, estado presionado y vínculo al campo.

### Navigation

Recuperación y retorno tienen área mínima (44px), subrayado en hover y foco visible. «Ir al formulario» aparece al recibir foco. No se rediseña la navegación global.

### Feedback

Errores coloreados con borde `currentColor`, texto explícito y foco programático; confirmaciones con icono de (60px) y texto. El envío comunica progreso textual además del indicador giratorio y evita envíos repetidos mientras está ocupado. Estos estados conservan sus fondos funcionales; el cristal corresponde a los campos.

### Botanical Scene

**Entrega elegida: imagen fotorealista.** `public/brand/pitahaya-realista.webp` es una imagen generada con alpha nativo y resolución (1024×1536), servida con Next Image, tamaño adaptado al viewport y carga diferida. Es un activo ilustrativo, no una fotografía de producción del cliente ni un modelo 3D. Su procedencia consta en `docs/design/pitahaya-realista-provenance.json`. Flota verticalmente (12px) en (8s), con inclinación fija de (-12deg) y curva `ease-in-out`; no gira sobre su eje. Toda la escena permanece oculta por debajo de (800px), y la imagen queda estática con movimiento reducido. Las capturas de la entrega están en `.impeccable/review/photo-final-20261014/` (`desktop.png`, `desktop-dark.png`, `compact.png`, `user-857.png`, `mobile.png` y `reduced-motion.png`).

**3D guardado como trabajo pendiente.** `public/brand/pitahaya-amarilla-20261014.glb` permanece en el repositorio (4.320.660 bytes), con (61.473 vértices) y (118.208 triángulos). Su perfil se informa con la reconstrucción de (47 de 58) fotografías propias de una pitahaya **rosada**; proporciones, tubérculos y detalles se adaptan artísticamente a la variedad amarilla. No es un escaneo exacto de pitahaya amarilla ni una fotografía de la cosecha. El albedo es generado; los mapas normal y roughness son datos numéricos procedurales. La procedencia y los límites constan en `docs/design/pitahaya-3d-20261014.json`; el generador reproducible es `scripts/assets/build-yellow-pitahaya.py`. Se mantienen recursos gratuitos.

El modo predeterminado es `photo`: no monta canvas ni solicita el GLB. El servidor habilita `prototype-3d` solo si `JIRAH_AUTH_3D_PROTOTYPE === 'true'`; `.env.example` lo deja en `false` para conservar la entrega elegida. Esta activación es exclusivamente para pruebas locales. Además, el módulo 3D exige ancho desde (800px) y ausencia de preferencia de movimiento reducido. La autorización CSP de conexiones `blob:` sigue la misma bandera del servidor. En esa prueba, la imagen permanece visible hasta que el modelo está listo y ante error de carga, error de renderizado o WebGL no disponible/pérdida de contexto; también es la alternativa estática con movimiento reducido.

Solo en el modo de prueba, el prototipo gira sobre Y una vuelta (360°) cada (24s), con inclinación Z de (-.18rad), oscilación vertical sinusoidal de amplitud (.045 unidades) y período (8s). El renderizado se limita a (30fps) y DPR máximo (1.5). Estos parámetros describen trabajo guardado, no el comportamiento de la entrega predeterminada ni reglas para heredar su geometría, textura o iluminación.

**Estado visual pendiente.** La última revisión solicita reconstruir el modelo (REBUILD): los lóbulos aún evocan escamas o piña, el material resulta demasiado homogéneo y el tejido seco se distingue poco. No se canonizan como estilo ni se declara aprobado el activo por tener giro funcional. La entrega actual conserva la imagen fotorealista por elección explícita del usuario; el 3D permanece pendiente.

Seis mensajes revisados sobre corteza, pulpa, dulzura, aroma, cactácea y floración nocturna, con fuente INIAP registrada en `docs/design/acceso.md`. El primer mensaje es determinista; cada (10000ms) se elige al azar uno distinto del actual. La transición cruzada solo anima opacidad durante (650ms), con curva `ease`. Se eliminan pausa, reproducción, anterior, siguiente y contador por petición expresa del usuario. Flotación y cambio de mensajes se suspenden con foco dentro de la sección de acceso, puntero sobre la escena, pestaña oculta, escena fuera de pantalla, movimiento reducido o ancho inferior a (800px). Los mensajes usan `aria-live="off"` y ocultan los inactivos a tecnologías de asistencia; no generan anuncios automáticos. Esta decisión específica no constituye una afirmación de accesibilidad universal. El desenfoque de fondo nunca se anima. El indicador de envío gira en (800ms) cuando se permite movimiento.

## Do's and Don'ts

### Do:

- **Do** conservar nombre, proporciones e integridad del logotipo original.
- **Do** mantener fruta, formulario y relato sobre el fondo continuo, con cristal solo en los campos, también en móvil.
- **Do** usar los roles claros u oscuros correspondientes en las superficies de autenticación.
- **Do** mantener foco visible, áreas amplias y mensajes textuales junto al formulario.
- **Do** respetar movimiento reducido y suspender fruta y mensajes durante la interacción con el acceso o la escena.
- **Do** conservar mensajes decorativos sin anuncios automáticos ni controles, según la petición explícita del usuario.
- **Do** conservar la imagen fotorealista como escena predeterminada, con flotación y mensajes aleatorios sujetos a las pausas contextuales.
- **Do** mantener el 3D guardado y desactivado por defecto; habilitarlo solo para pruebas locales explícitas, con la imagen como respaldo.
- **Do** registrar la procedencia rosada y la adaptación artística amarilla del prototipo, y mantener explícita su aprobación visual pendiente.

### Don't:

- **Don't** extender este documento como prueba de un rediseño del panel operativo.
- **Don't** presentar la imagen fotorealista como modelo 3D, ni el prototipo como escaneo exacto de fruto amarillo o fotografía de una cosecha real.
- **Don't** añadir un suelo o una caja detrás de la fruta.
- **Don't** convertir los defectos de geometría o material del prototipo rechazado visualmente en reglas del sistema, ni confundir integración funcional con fidelidad aprobada.
- **Don't** activar o publicar el prototipo como escena predeterminada o entrega 3D terminada sin una nueva decisión explícita del usuario.
- **Don't** ocultar errores, progreso o acciones de acceso detrás de la escena.
- **Don't** convertir datos de prueba o estadísticas inventadas en decoración de marca.
- **Don't** convertir medidas heredadas señaladas por el detector en recomendaciones generales.
