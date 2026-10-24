# Pitahaya 3D: implementación y estado de aceptación

## Estado actual

**Entrega elegida por el usuario: conservar la imagen fotorealista en el login y guardar el 3D como trabajo pendiente.** No se monta un canvas ni se solicita el GLB por defecto. Se conservan flotación, mensajes aleatorios, campos de cristal y el acceso existente.

El prototipo guardado tiene geometría 3D amarilla, giro axial real, fondo transparente y alternativas ante fallos, pero **su fidelidad visual sigue pendiente**. Después de la ronda adicional autorizada y sus correcciones, la última revisión mantiene `rebuild` para corteza, material y extremos. No existe aprobación visual de este modelo y no se presenta como equivalente al objeto fotorealista de Corn Revolution.

Este documento sustituye exclusivamente el aplazamiento del giro descrito en `ACCESO_CRISTAL_2026-10-10.md`. Conserva la composición del acceso, los campos de cristal y los mensajes aleatorios. La implementación no modifica datos, reglas de negocio ni permisos, y no fue desplegada públicamente.

## Reconstrucción y límites del origen

Se encontraron 58 fotografías JPEG de fruto rosado en `img/`. El procesamiento local en CPU registró 47 cámaras, recuperó 8.156 puntos y obtuvo un error medio de reproyección de 0,61173 píxeles. La cobertura estimada de azimut fue 333,723 grados. Esas métricas describen consistencia y cobertura de las cámaras; no prueban que la superficie reconstruida sea exacta.

Una envolvente conservadora de siluetas permitió medir el perfil corporal. Los polos incompletos requieren reparación. Las fotografías de una pitahaya rosada no documentan la corteza de una amarilla: el modelo final es una adaptación artística del perfil, con tubérculos, areolas y extremos autorados. El GLB declara `exactScan: false`. No se recolorearon fotografías para presentarlas como un escaneo amarillo.

- Activo: `public/brand/pitahaya-amarilla-20261014.glb`, 4.320.660 bytes, 61.473 vértices y 118.208 triángulos en total.
- Corteza actual: 54 lóbulos asimétricos con distribución irregular, menor proyección lateral y cicatrices variables. Es una implementación técnica; su fidelidad aún no está aprobada.
- Albedo: epidermis generada con la herramienta integrada, conservada en `docs/design/pitahaya-skin-source-20261014.png` y empaquetada como JPEG dentro del GLB.
- Mapas de normal y rugosidad: datos numéricos separados de ruido periódico determinista, conservados en `docs/design/pitahaya-normal-20261014.png` y `pitahaya-roughness-20261014.png`. El segundo usa G para rugosidad y B para metalicidad cero. No son fotografías ni imágenes generadas con IA.
- Perfil medido: `docs/design/pitahaya-photo-profile-20261014.json`.
- Procedencia, prompt exacto, herramientas y referencias: `docs/design/pitahaya-3d-20261014.json`.

No se compraron modelos ni se copiaron activos del sitio de inspiración. La reconstrucción y el render usan herramientas de código abierto; la textura de albedo se creó con la herramienta integrada de generación de imágenes. Los originales del usuario se mantienen intactos. Los archivos de procesamiento y dependencias Python locales están en `prisma/backups/`, excluidos de Git y del despliegue.

## Integración

`AuthShell.tsx` activa la prop `prototype3D` únicamente si la configuración de servidor `JIRAH_AUTH_3D_PROTOTYPE` es exactamente `true`. Su valor predeterminado y el ejemplo de entorno son `false`. Esta opción se conserva para retomar pruebas locales, sin control en la interfaz ni activación mediante URL. Con la opción desactivada, `AuthScene.tsx` conserva la imagen y no monta el componente 3D.

Solo en ese modo experimental, `AuthScene.tsx` carga dinámicamente `PitahayaModel.tsx` cuando el ancho es al menos 800px y no hay preferencia de movimiento reducido. Three.js usa GLTFLoader y una iluminación de estudio con fondo transparente. El GLB tiene sus tres mapas embebidos y no necesita un servicio externo.

El modelo gira sobre Y una vuelta cada 24 segundos, con inclinación fija de −0,18 radianes y oscilación vertical de 0,045 unidades en ocho segundos. Se limita el dibujo a 30 fotogramas por segundo y la densidad a 1,5. Se añaden sombras propias PCF de 1024px entre relieves, sin suelo, tarjeta ni sombra de apoyo. Las pausas por foco en el acceso, puntero sobre la escena, visibilidad de pestaña e intersección se conservan, junto a los mensajes aleatorios cada diez segundos.

La imagen fotorealista anterior permanece visible hasta que el primer fotograma 3D está listo y vuelve si falla la carga o se pierde el contexto WebGL. Un límite de errores también contiene fallos del componente decorativo. Con movimiento reducido se utiliza esa imagen; por debajo de 800px se oculta toda la escena y se prioriza el formulario.

Se abortan solicitudes y se liberan texturas, geometrías, materiales, mapa de sombras, entorno, observadores, fotogramas y contexto al desmontar. La política CSP añade `blob:` a `connect-src` únicamente con esa misma opción experimental, para que GLTFLoader lea los mapas embebidos mediante ImageBitmapLoader. La configuración predeterminada conserva `connect-src 'self'` en producción. No se añadieron dominios externos ni se alteraron las directivas de scripts. El GLB se excluye del precache obligatorio de la PWA: un teléfono de campo no descarga este recurso decorativo como parte de la instalación. No se garantiza el giro sin conexión; se conserva la alternativa estática y la captura operativa existente.

## Verificación funcional

- Compilación de producción y lint correctos; TypeScript correcto tras terminar la compilación. Una ejecución simultánea de TypeScript y build encontró tipos temporales de `.next` durante su regeneración; se repitió secuencialmente y terminó sin errores. No se cambió código para ocultar ese fallo de coordinación.
- `npm run test:e2e` final: 68 casos aprobados, cero fallidos, salida 0, con bases temporales separadas y la opción visual predeterminada. Incluye seguridad, flujo operativo, sincronización y comprobaciones del acceso. El nuevo caso de CSP verifica que la lectura de blobs requiere activación explícita.
- Comprobación independiente del acceso con la opción experimental activada en un servidor local temporal: aprobada. Se cerró esa vista temporal después de verificarla; el login principal conserva la imagen.
- Comprobaciones nuevas del acceso: cambio de ángulo real, suspensión y estabilidad durante el foco, escena móvil sin canvas, movimiento reducido, pérdida de contexto y respuesta 404 del GLB con formulario e imagen disponibles.
- Capturas del prototipo: escritorio claro/oscuro 1440×900, tres ángulos adicionales de giro, compacto 821×790, móvil 390×844, movimiento reducido y pérdida de contexto; no constituyen aprobación visual.
- Capturas de la entrega final elegida: escritorio claro/oscuro 1440×900, compacto 821×790, 857×790 oscuro, móvil 390×844 y movimiento reducido. Cero solicitudes GLB, cero errores JavaScript y sin desbordamiento horizontal. Evidencia separada en `.impeccable/review/photo-final-20261014/`.
- Detector de diseño ejecutado una vez sobre los tres componentes afectados: siete avisos heredados sobre colores y medidas; no son errores nuevos de la escena y no se convirtieron en tokens para silenciarlos. No se repitió el detector.
- Procedencia de rasters: cuatro examinados, ninguno sin prompt/origen registrado. Los mapas numéricos registran expresamente su origen procedural.

La cobertura automatizada valida comportamiento, no realismo ni aceptación del cliente. Evidencia local: `.impeccable/review/pitahaya-20261014/`; registros de compilación y pruebas: `prisma/backups/pitahaya-*.log`.

## Revisión visual y trabajo pendiente

La primera captura incluía transiciones e indicadores de desarrollo: recibió `recapture` y se reemplazó íntegramente por evidencia estable de producción local. Su evaluación no se reutilizó como aprobación.

La primera revisión completa dio `rebuild` por crestas helicoidales, material pálido y extremos artificiales. Se reconstruyó el activo con tubérculos individuales, areolas, mapas separados, variación cromática y nueva iluminación.

La segunda revisión completa mantiene **disposition: rebuild**:

| Región | Hallazgo pendiente |
| --- | --- |
| Corteza y silueta | Los relieves forman dientes y superficies fusionadas; faltan lóbulos carnosos convexos, bases diferenciadas y menor proyección lateral. |
| Epidermis | Se percibe rayado direccional y cicatrices demasiado parecidas; hacen falta poros sin orientación dominante y transiciones de tejido. |
| Extremos y proporción | El cuerpo se ve ancho/achatado y las terminaciones parecen piezas aplicadas; hace falta integrarlas orgánicamente. |

La integración, giro, flotación, formulario, tipografía y alternativas se mantienen. El usuario autorizó expresamente otra ronda gratuita de modelado. Se alargó el cuerpo, se sustituyeron los picos por relieves convexos, se eliminaron las ondas sinusoidales de geometría y se recrearon los mapas numéricos. La revisión reconoció la proporción y la eliminación del rayado, pero señaló botones redondos, areolas claras y extremos poco reconocibles. Se corrigieron con lóbulos alargados de base amplia, ápice desplazado, orientación variable, color local más intenso, conversión sRGB a color lineal para tejidos y sombras propias.

La última revisión del modelo mantiene **disposition: rebuild**. El volumen general y la integración coinciden con el encargo, pero los lóbulos siguen pareciendo escamas uniformes de una piña/alcachofa estilizada; la piel y las cicatrices resultan demasiado homogéneas, y el tejido seco terminal no tiene presencia suficiente. La distancia visual global al fotorealismo sigue abierta. Se detuvieron las nuevas variaciones paramétricas y el usuario eligió expresamente **«La imagen fotorealista; guardar el 3D como trabajo pendiente»**. No se anuncia una aprobación visual ni se publica el prototipo como acabado definitivo. Estos defectos no se convierten en normas del sistema de diseño. La revisión de la entrega fotorealista conservada tiene un alcance separado y no sustituye este `rebuild` del GLB.

La revisión completa de las seis capturas finales del acceso con imagen terminó con **disposition: ship**, sin correcciones materiales pendientes dentro de ese alcance elegido. El documentador independiente actualizó `DESIGN.md` y `.impeccable/design.json`, preservó tokens y validó YAML, JSON y referencias. Los dos dictámenes separados constan en `.impeccable/review/pitahaya-final-dispositions.md`; ninguno certifica el proyecto completo ni aprueba el realismo del GLB.

## Preparación reproducible del activo

La ejecución normal del proyecto usa el GLB entregado: no necesita Python ni reconstruir fotografías. Para preparar de nuevo el activo en un entorno Python compatible:

```text
python -m pip install --target prisma/backups/pitahaya-tools -r scripts/assets/requirements-pitahaya.txt
python scripts/assets/build-yellow-pitahaya.py
```

El generador usa el perfil congelado y la textura fuente conservada. `reconstruct-pitahaya.py` y `recover-pitahaya-volume.py` documentan las fases anteriores; son herramientas específicas de este conjunto, con segmentación del fruto rosado. No deben presentarse como una solución general para nuevos conjuntos amarillos sin adaptar y revisar las máscaras. El procesamiento original no es parte de `npm run dev` ni de la compilación.
