# Corrección de la escena de pitahaya

> Registro histórico de la entrega posteriormente rechazada por el usuario por su apariencia artificial. El modelo procedural y Three.js se retiraron. La implementación vigente está en `docs/ACCESO_CRISTAL_2026-10-10.md`; el giro axial permanece pendiente y no debe darse por cumplido a partir de este informe.

La primera entrega no cumplía tres requisitos señalados por el usuario: giro sobre el propio eje, fondo neutro para distinguir el amarillo y mensajes sobre la fruta. Esta revisión los toma como autoridad sobre el veredicto visual anterior.

## Resultado implementado

- Estudio tridimensional original de pitahaya amarilla: geometría continua de corteza con relieves, puntas cortas, tallo cortado y base floral; piel con moteado procedural. No se presenta como un escaneo fotogramétrico.
- Giro axial de 360° cada 24 segundos con inclinación constante y flotación vertical mínima. Cambian la silueta y las superficies visibles, no se gira un plano con una fotografía.
- Fondo marfil neutro `#eae9e2`, iluminación cálida y sombra separada de la fruta. El formulario conserva su diseño y contraste en ambos temas.
- Tres mensajes sobre corteza/pulpa, dulzura y planta/flor, con navegación manual y pausa compartida con el giro.
- Escena visible desde 800px, con composición compacta hasta 1100px. Pantallas más pequeñas priorizan el acceso y no montan el renderer.

La referencia [Corn Revolution, Resn](https://cornrevolution.resn.global/#) se observó en navegador. Se toman el protagonismo del objeto agrícola, el volumen iluminado y el espacio alrededor; no se copiaron sus modelos, texturas ni el recorrido de navegación.

Los textos se contrastaron con el [Manual del Cultivo de Pitahaya para la Amazonía Ecuatoriana, INIAP](https://repositorio.iniap.gob.ec/handle/41000/5551). No incluyen propiedades medicinales ni cifras comerciales.

## Carga, funcionamiento y alternativas

Three.js `0.186.1` se importa en un componente separado mediante `next/dynamic`, solo cuando corresponde mostrar la escena animada. Densidad máxima 1,5 y actualización limitada a 30fps; sin posprocesado. La caché PWA puede descargar recursos estáticos en segundo plano: importación diferida no significa ausencia de toda descarga en móviles.

El bucle se detiene con pausa, pestaña oculta o escena fuera de pantalla. Al desmontar se detienen animaciones/observadores y se disponen geometrías, materiales, textura, entorno y renderer. El formulario no espera la escena; un límite de errores local protege su funcionamiento si falla el módulo.

Se conserva `public/brand/pitahaya-amarilla.webp` como alternativa durante carga, WebGL no disponible, pérdida de contexto o preferencia de movimiento reducido. Su procedencia y prompt siguen junto al activo y en `docs/design/pitahaya-provenance.json`; no se generó otro raster. El modelo y la textura de piel se crean en código original de `app/ui/auth/pitahaya-model.ts`.

## Verificación

- Lint, TypeScript y compilación de producción: correctos.
- Suite completa: 51 pruebas aprobadas, 0 fallidas, con base temporal, HTTP real y Chrome, antes de los ajustes posteriores limitados a geometría y resolución de imagen.
- La prueba específica observa el ángulo del modelo realmente renderizado: cambia, queda fijo al pausar y vuelve a cambiar al reanudar.
- Se comprobó 821×790 además de escritorio, móvil, tablet y orientación horizontal; sin desbordamiento horizontal.
- La prueba provoca pérdida real del contexto WebGL y verifica retorno a imagen estática con el formulario disponible.
- Después de la última corrección geométrica, lint, TypeScript, compilación y verificación específica del acceso volvieron a pasar; incluye resolución suficiente del fallback a 821px.
- Movimiento reducido no monta WebGL; tampoco se monta al reducir al ancho móvil.
- Detector: 0 patrones defectuosos, 11 avisos de documentación de escalas y colores de materiales. `DESIGN.md` y su JSON se actualizaron desde el código por un documentador independiente.

La revisión visual independiente encontró dos ajustes: integración de escamas en la corteza y nitidez de la alternativa estática a 821px. Se corrigió la resolución solicitada por `sizes` y el modelo recibió dos rondas limitadas a suavizar sus relieves y acortar las brácteas. Veredicto final: **ship**, con ambos hallazgos puntuados como **resolved**, sin regresiones directas observadas. Esta aprobación cubre únicamente las correcciones puntuadas. El documentador independiente contrastó nuevamente `DESIGN.md` y su JSON después del último ajuste y confirmó que siguen vigentes. Las pruebas no certifican rendimiento en todos los dispositivos ni Core Web Vitals en un despliegue público.

No cambian reglas de negocio, datos ni contratos de autenticación.
