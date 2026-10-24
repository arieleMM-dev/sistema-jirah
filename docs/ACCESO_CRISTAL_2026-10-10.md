# Acceso con fruta fotorealista y cristal

> Actualización del 14 de octubre: el usuario autorizó la fase 3D con sus fotografías y, tras la revisión, eligió conservar esta imagen y guardar el modelo como trabajo pendiente. El [estado actual y la evidencia](IMPLEMENTACION_PITAHAYA_3D_2026-10-14.md) documentan el prototipo desactivado por defecto y la aprobación del acceso con imagen. Esa aprobación no incluye el realismo del modelo.

## Motivo

El usuario rechazó la fidelidad de la geometría procedural y aclaró que «fondo neutro» significa un espacio continuo. En el refinamiento posterior pidió eliminar también las tarjetas exteriores de frases y login, renovar los mensajes y hacerlos aleatorios sin controles de reproducción. Conserva nombre y logotipo, exige recursos gratuitos y difiere la mejora de la figura hasta disponer de fotografías propias.

## Implementación

- Nueva imagen fotorealista generada a partir de la referencia botánica proporcionada, con textura nítida y alpha nativo. No se presenta como fotografía de la finca. Archivo: `public/brand/pitahaya-realista.webp`, 1024×1536, unos 494KB, procedencia y prompt en `docs/design/` y sidecar junto al activo.
- Espacio continuo en ambos temas; sin panel de fondo ni sombra de suelo detrás de la fruta.
- Mensajes y formulario directamente sobre el fondo continuo, sin tarjetas, bordes ni paneles exteriores. El cristal semitransparente se concentra en los campos, con desenfoque fijo de 12px y texto contrastado. El formulario gana anchura útil en móvil.
- Seis mensajes botánicos renovados sobre madurez, pulpa, dulzura, aroma, planta y floración. Selección aleatoria cada diez segundos entre los cinco distintos del actual, sin repetición inmediata. Transición cruzada de opacidad de 650ms y altura estable. Se eliminan pausa, reproducción, flechas y contador.
- Flotación suave de la imagen. Movimiento y cambios de frase se suspenden al enfocar el formulario, pasar el puntero por la escena, ocultar la pestaña, salir de pantalla o solicitar movimiento reducido. Los mensajes no generan anuncios automáticos al lector de pantalla.
- Se retira el modelo rechazado, Three.js y sus tipos, además del raster anterior sustituido. No hay cambios de datos, reglas de negocio ni contratos de autenticación.

## Figura diferida por instrucción del usuario

Esta versión **no realiza giro axial de 360°**. La última instrucción dice: «después en el futuro con las fotos de la pitahaya amarilla podremos hacer una buena figura de la pitahaya pero el resto que sea prolijo». La figura y el giro quedan diferidos a esa fase; no se presentan como entregados. La imagen actual conserva su flotación y no se deforma un plano para simular un escaneo.

## Verificación

- Lint, TypeScript y compilación de producción correctos.
- Suite completa en base temporal y Chrome: ejecución final con 51 pruebas aprobadas, 0 fallidas y salida 0. Registro en `.impeccable/review/test-results.txt`.
- La primera comprobación de este refinamiento detectó que la prueba intentaba salir del formulario pulsando un título cuyo ancestro seguía recibiendo foco. Se corrigió el paso para enfocar la cabecera, manteniendo la suspensión prevista. También se cierra el navegador si falla la comprobación inicial para evitar procesos de prueba colgados.
- Una ejecución posterior aprobó los 51 casos, pero el proceso terminó con código nativo de Windows 3221225477 después de los casos. La repetición diagnóstica terminó correctamente; no se estableció la causa del cierre previo ni se alteraron dependencias de datos para ocultarlo.
- Verificación específica del acceso aprobada: ausencia de tarjetas y controles, cinco cambios consecutivos sin repetición, suspensión por foco y puntero, temas, contraseña, errores, recuperación y movimiento reducido. Las pruebas verifican flotación, no giro axial.
- Capturas de escritorio, móvil, tablet, 821×790 y ancho actual del navegador integrado de 857×790, temas y estados verificadas; sin desbordamiento horizontal en los anchos comprobados.
- Contraste calculado en superficies de referencia: borde de campos claro 3,35:1; texto secundario claro 5,73:1 y oscuro 8,06:1. El borde claro se oscureció tras detectar que la transparencia reducía su contraste.
- Detector de este refinamiento ejecutado una vez: 0 fallos, 8 avisos de medidas y colores para contrastar con la documentación actualizada. No se repitió el detector para mejorar artificialmente el resultado.
- Documentador independiente: `DESIGN.md` y `.impeccable/design.json` actualizados desde la implementación, retirando tokens y snippets de tarjetas obsoletos. YAML y JSON válidos, esquema v2 y referencias comprobados. Tipografía, cristal en campos, mensajes y suspensiones documentados; las medidas y colores heredados se registran sin convertirlos en nuevas reglas generales.
- Procedencia: un raster publicado, ninguno sin prompt/origen registrado.

La revisión anterior de los paneles de cristal fue `fix` por el giro pendiente. La instrucción posterior difiere expresamente esa figura y cambia el alcance visual: retirar paneles y controles y automatizar frases. Este refinamiento recibe una revisión completa nueva sobre sus capturas y requisitos actuales; no se reutiliza la aprobación de la versión rechazada.

La nueva revisión independiente terminó con **disposition: ship** para esta implementación acotada: abrió las trece capturas requeridas, confirmó TYPE/MATERIAL/GROUND y los requisitos actuales, y no pidió correcciones materiales. Su aprobación visual no certifica todo el proyecto ni el giro diferido. Evidencia de revisión en `.impeccable/review/open-access-finish.md`.

## Skills aplicadas

Taste e Impeccable orientan la composición y la revisión visual; UI/UX Pro Max se consultó específicamente para contenido automático y movimiento reducido. Vercel React Best Practices orienta estado, limpieza de suscripciones y renderizado inicial determinista. Vercel Web Design Guidelines se consultó en su fuente actual para foco, formularios, movimiento y rendimiento. La petición expresa de eliminar controles prevalece sobre la recomendación de carruseles con pausa; se documentan las mitigaciones sin afirmar conformidad universal de accesibilidad.
