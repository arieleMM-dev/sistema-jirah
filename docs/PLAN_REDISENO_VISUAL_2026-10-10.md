# Rediseño visual de Finca JIRAH

Fecha: 10 de octubre de 2026. Estado actualizado: dirección creativa delegada por el usuario; primer bloque de acceso, recuperación y nueva contraseña implementado. La composición del panel y las pantallas operativas siguen pendientes. Ver `IMPLEMENTACION_ACCESO_VISUAL_2026-10-10.md` y `DESIGN.md` para el resultado; las observaciones siguientes conservan la auditoría inicial.

## Lectura del producto

Rediseño de una PWA de gestión y trazabilidad agrícola para trabajadores en campo y administración de finca, con una expresión contemporánea ligada a la pitahaya amarilla y una interfaz operativa clara.

La distinción debe surgir de la marca existente y de cómo se presenta el recorrido de la fruta: campaña, lote, jornada, clasificación y destino. El acceso puede concentrar el momento expresivo; las pantallas de trabajo deben ofrecer lectura rápida y acciones previsibles.

## Revisión inicial de la interfaz

Se revisaron el acceso, el contenedor de navegación, los estilos globales, el logotipo y capturas anteriores de entregas y pendientes. Es una revisión de base, no una auditoría visual exhaustiva de todas las rutas.

| Evidencia | Efecto | Acción propuesta |
| --- | --- | --- |
| `app/globals.css:1`: fuentes externas con `@import` | La tipografía depende de una solicitud externa en tiempo de uso | Servir fuentes desde la aplicación con `next/font`, verificando carga y caché offline |
| `app/globals.css:8` y `:root`: tokens agrícolas y otra escala de componentes; colores literales en páginas | La misma función visual recibe tratamientos distintos | Establecer tokens semánticos y migrar por componentes, conservando equivalencias temporales |
| `app/globals.css:938`: `.mt-4` redefine el espaciado con 4 px | Las utilidades pueden producir un resultado diferente del esperado | Identificar usos antes de retirar estilos heredados; evitar una sustitución global sin revisión |
| `app/login/page.tsx:56`: el bloque de marca se oculta bajo `lg` | En móvil el acceso pierde la identidad principal | Logo legible en móvil y composición de acceso específica para pantallas pequeñas |
| `app/login/page.tsx:92` y `:108`: campos sin `name` ni `autoComplete` explícitos | Se desaprovecha la integración con gestores de contraseñas | Añadir nombres y autocompletado; conservar pegado y etiquetas visibles |
| `app/login/page.tsx:84`: error sin anuncio accesible explícito | Un lector de pantalla puede no percibir el resultado del intento | Comunicar error y progreso de forma accesible, conservando los mensajes de seguridad |
| `app/login/page.tsx:99` y navegación: `transition-all` | Se animan propiedades sin un propósito definido | Transiciones concretas y movimiento reducido |
| `app/dashboard/layout.tsx:249`: enlace de perfil compuesto por iniciales | El destino puede ser poco claro para tecnologías de asistencia | Nombre accesible y foco visible para el enlace |
| Capturas de pendientes y comercial | Información correcta, pero explicaciones extensas y muchos formularios compiten por atención | Jerarquizar tarea principal y ayuda contextual; mantener accesibles los detalles y controles necesarios |

Las capturas pertenecen a la verificación funcional anterior. El primer bloque de implementación debe capturar también el acceso actual y registrar una referencia de rendimiento antes de cambiarlo.

## Dirección recomendada

**Concepto de trabajo: «De la finca al destino».** La pitahaya aporta la firma visual; el recorrido de cosecha aporta la estructura. No cambiar el nombre ni reinterpretar el logotipo.

- Amarillo de fruta como acento de identidad y selección, verde profundo para acciones y estructura, superficies claras para lectura prolongada.
- Tipografía sans con carácter y buena lectura de cifras. Candidata: Manrope; comprobar pesos, caracteres españoles y números antes de adoptarla. Cifras alineadas con `tabular-nums`; monoespaciada únicamente cuando un código lo requiera.
- Composición más expresiva en acceso; jerarquía compacta en escritorio y controles amplios en campo.
- Iconografía Lucide existente, con tamaño y grosor coherentes. Componentes compartidos para botones, campos, estados, tablas y navegación.
- Evitar convertir todos los bloques en tarjetas. Usar agrupaciones, separación y jerarquía según su función.

Paleta inicial para probar, no tokens definitivos:

| Función | Propuesta clara | Propuesta oscura |
| --- | --- | --- |
| Fondo | `#F7F9F2` | `#101D17` |
| Superficie | `#FFFFFF` | `#192A21` |
| Texto principal | `#183C2B` | `#F0F5E8` |
| Texto secundario | `#506153` | `#B9C8BA` |
| Acción principal | `#26523B`, texto blanco | `#F2CE35`, texto `#183C2B` |
| Acento pitahaya | `#F2CE35`, texto `#183C2B` | `#F2CE35`, texto `#183C2B` |

El amarillo no llevará texto blanco. Los estados de error, advertencia, éxito y sincronización necesitan colores semánticos independientes, acompañados de texto o iconos. Medir contraste sobre las combinaciones finales, incluidos foco, bordes y estados deshabilitados.

## Primer bloque: acceso y recuperación

- En escritorio: formulario fácil de localizar, marca original y una escena de pitahaya amarilla al lado. Mensaje breve vinculado a la actividad real de la finca.
- En móvil: logo, título y formulario tienen prioridad. La escena se simplifica o queda estática; no desplazar el acceso fuera del primer recorrido de lectura.
- Mantener correo, contraseña, recuperación y redirecciones por rol. Añadir mostrar/ocultar contraseña con nombre accesible y mantener foco y autocompletado.
- Estados completos: inicial, enviando, credenciales incorrectas, cuenta desactivada, límite de intentos y fallo de conexión.
- Recuperación e invitación deben compartir la misma familia visual.

### Pitahaya y movimiento

La idea es adecuada como firma del acceso. El modelo debe representar la pitahaya amarilla con criterio, sin sustituir el logotipo en acuarela. Primero validar una composición estática; después construir o adquirir un modelo con licencia y procedencia documentadas.

Si el resultado justifica Three.js:

1. Aislar la escena en un componente cliente y cargar el motor/modelo de forma diferida, fuera del camino necesario para ingresar.
2. Mantener un cartel o imagen estática mientras carga y ante falta de WebGL, fallo de carga o pérdida de contexto.
3. Desactivar movimiento con `prefers-reduced-motion`; evitar descargar el motor en la variante estática cuando sea posible. Considerar ahorro de datos y pantallas pequeñas.
4. Pausar cuando la pestaña o la escena no sea visible, limitar resolución y liberar recursos al desmontar.
5. Ofrecer pausa explícita si la rotación o los textos se reproducen continuamente. Evitar anuncios repetidos al lector de pantalla y detener cambios de texto durante interacción con sus controles.
6. Medir el incremento de transferencia, carga e interacción antes de incorporarlo a la aplicación. Si compromete el uso, emplear una versión estática o una animación breve optimizada.

La animación comunica el objeto que se gestiona y concentra el carácter de la marca en el acceso. No se replica en cada pantalla operativa.

Los textos pueden tratar sobre campaña, origen y trazabilidad. Para datos del cultivo, usar únicamente información confirmada y contextualizada, por ejemplo el plazo habitual de 16 a 17 semanas que indicó el cliente. No publicar beneficios de salud, rendimientos ni estadísticas inventados. Los datos de la finca deben venir de registros reales, con su período y estado de sincronización.

## Secuencia de implementación

| Bloque | Entrega revisable | Condición para avanzar |
| --- | --- | --- |
| 1. Dirección y acceso | Composición de acceso en escritorio/móvil, estados y variante sin movimiento | Revisión visual con el usuario; funcionamiento del acceso preservado |
| 2. Fundamentos | Tokens, fuentes locales, componentes y tema claro/oscuro | Contraste y comportamiento consistentes; sin afectar páginas aún no migradas |
| 3. Navegación y resumen | Contenedor, menú, perfil, conectividad y panel con datos reales | Roles, teclado, foco y navegación móvil verificados |
| 4. Trabajo en campo | Pesaje, clasificación y pendientes con jerarquía y controles táctiles | Captura, guardado local, reintento y confirmación siguen distinguiéndose |
| 5. Gestión administrativa | Campañas, lotes, compradores, personal, entregas, devoluciones y reportes | Saldos, fórmulas, permisos e historial se conservan |
| 6. Revisión integral | Capturas comparables, pruebas funcionales y medición de rendimiento | Defectos materiales resueltos; limitaciones documentadas |

En cada bloque, construir la entrega completa, inspeccionar escritorio y móvil juntos, corregir los defectos observados en una tanda y confirmar una vez. Evitar ciclos ilimitados de pulido.

## Criterios de aceptación

- Verificar 375/390 px, tablet y escritorio; incluir orientación horizontal, zoom al 200 %, textos largos y teclado móvil. No ocultar acciones con elementos fijos.
- Controles táctiles de al menos 44 px, preferentemente 48 px en captura; campos de 16 px o más en móvil.
- Contraste de texto normal de al menos 4,5:1, controles distinguibles, navegación por teclado y foco visible. El color no es la única señal.
- Examinar ambos temas y movimiento reducido de forma independiente.
- La escena no impide enviar el formulario, recuperar acceso ni leer errores. El acceso funciona si falla el recurso decorativo.
- Tipografía y recursos esenciales disponibles desde la aplicación; comprobar el modo offline en una compilación de producción.
- Repetir las pruebas existentes adecuadas al bloque, especialmente acceso por rol, captura, sincronización y flujo comercial. Lint, tipos y compilación al integrar cambios de interfaz.
- Medir la referencia y el resultado bajo el mismo perfil de dispositivo y red. Objetivos de experiencia: LCP ≤2,5 s, INP ≤200 ms y CLS ≤0,1; no presentarlos como resultados hasta medirlos. La medición local no sustituye datos reales de uso.
- No introducir nuevas dependencias para efectos que CSS pueda resolver claramente. Evaluar Three.js por separado del resto del rediseño.

## Skills y fuentes

Instaladas desde repositorios originales en `C:/Users/ariel/.codex/skills/`, con referencias fijadas al instalar:

| Skill | Fuente | Referencia |
| --- | --- | --- |
| Taste / `design-taste-frontend` | https://github.com/Leonxlnx/taste-skill | `717446e07a78d4e6d7918b1fde1a263378eebac9` |
| Vercel React Best Practices | https://github.com/vercel-labs/agent-skills | `063bee94c3f4df8453406c830b0a7df0f2860278` |
| Vercel Web Design Guidelines | https://github.com/vercel-labs/agent-skills | `063bee94c3f4df8453406c830b0a7df0f2860278` |
| UI/UX Pro Max | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill | `50d8a7de0900119855614541f15a1a616691eb33` |
| Impeccable | https://github.com/pbakaus/impeccable | `d631a8827f99414d2b6daba4ef08b7f8701751d7` |

Taste declara fuera de alcance los paneles densos y tablas: usar sus criterios de identidad en las superficies pertinentes, sin imponer patrones de marketing a la operación. Impeccable aporta contexto y dirección; Vercel, revisión de interfaz y rendimiento de React; UI/UX Pro Max, contraste, interacción y pautas por stack.

Las búsquedas de sistema de diseño de UI/UX Pro Max devolvieron estructuras de marketing que no representan esta aplicación. No se adoptaron ni se persistieron como sistema aprobado; la propuesta anterior es una síntesis contextual del proyecto. La consulta específica de Next.js sí aportó orientación aplicable sobre fuentes e imágenes. Las APIs se contrastan con `node_modules/next/dist/docs/` de la versión instalada.

Guía de revisión consultada: https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md.

En esta fase se capturó contexto y se redactó la propuesta. No se modificaron componentes, estilos, autenticación, datos ni dependencias de la aplicación; tampoco se ejecutaron pruebas funcionales nuevas para estos cambios exclusivamente documentales.
