# Avance mientras se confirman las reglas del cliente

Fecha: 9 de octubre de 2026.

> Nueva evidencia recibida: el cliente entregó un Excel con fórmulas y respuestas parciales. El [contraste actualizado y registro de decisiones](REGLAS_NEGOCIO_Y_CONTRASTE_EXCEL_2026-10-09.md) reemplaza los estados «pendiente» de este plan cuando existe confirmación expresa. El plan original se conserva como antecedente.

> Estado actualizado: este documento conserva el plan previo a la autorización de implementación. Posteriormente el usuario autorizó ejecutar la secuencia y confirmó que solo existen datos de desarrollo y prueba. Los cambios realizados, verificaciones y pendientes están en [Primera implementación: seguridad, captura y sincronización](IMPLEMENTACION_BASE_SEGURA_2026-10-09.md). Las referencias siguientes a no modificar código y a pruebas pendientes describen el estado original del plan.

Base: [auditoría funcional y de riesgos](C:/Proyectos/FincaJIRAH/docs/AUDITORIA_FUNCIONAL_Y_RIESGOS_2026-10-05.md).

## Alcance actual

El usuario ya envió al cliente las preguntas de negocio y solicitó el Excel con fórmulas. Las respuestas y el archivo están pendientes. Continúa vigente la instrucción de no modificar código todavía.

Este documento prepara el trabajo siguiente. No acredita correcciones, pruebas nuevas ni autorización para alterar código, datos o infraestructura. Los resultados técnicos citados proceden de la auditoría del 5 de octubre; no se repitieron en esta preparación.

## 1. Qué podemos preparar sin esperar

| Orden | Paquete | Hallazgos de origen | Resultado que debe obtenerse | Dependencia del cliente |
|---|---|---|---|---|
| 1 | Protección de respuestas y credenciales | T-01, T-09 | Inventario de respuestas públicas y campos permitidos; plan para excluir hashes, tokens y secretos de logs y respuestas | No depende de fórmulas; canal de recuperación y entrega de credenciales sí requiere definición operativa |
| 2 | Sesiones y autoría | T-03, T-06 | Comprobaciones de sesión válida, cuenta activa, desactivación/reactivación y autor autenticado | Separar autor de captura y responsable de actividad; registrar por terceros queda pendiente |
| 3 | Contratos y acceso mínimo a catálogos | F-01, F-02, T-08 | Comparación de campos entre formulario, API y servicio; validaciones de tipos; separación entre leer opciones y administrar catálogos | El contrato definitivo de clasificación depende de su unidad de registro y agrupación |
| 4 | Fiabilidad de sincronización | T-02, T-04, T-05, T-07 | Escenarios de repetición, fallo parcial, cambio de cuenta y referencias; requisitos de confirmación y errores visibles | Modelo, migraciones, cierre, captura con sesión vencida y envíos tardíos pendientes |
| 5 | Verificación y operación | T-10 | Casos críticos ejecutables previstos; lista de configuración y procedimiento de copia/restauración a preparar | Destino de despliegue, datos reales, volúmenes y responsables pendientes |

La seguridad, la validación de entradas y la ausencia de duplicación son objetivos independientes de las fórmulas agrícolas. Su implementación debe respetar el modelo que se confirme; preparar estos objetivos no implica fijar ahora tablas nuevas ni políticas de permisos no acordadas.

## 2. Criterios de aceptación preparados

Todos los casos siguientes están **pendientes de ejecución**. La auditoría contiene reproducciones aisladas de algunos defectos, que no sustituyen las comprobaciones de integración aquí previstas.

| ID | Escenario | Resultado exigible |
|---|---|---|
| V-01 | Consultar listados y detalle de pesajes con una cuenta autorizada | Las respuestas contienen únicamente campos necesarios; ningún hash de contraseña, token de recuperación o secreto del usuario relacionado |
| V-02 | Intentar operaciones protegidas sin sesión o con sesión inválida | La operación se rechaza y no modifica datos |
| V-03 | Desactivar una cuenta con sesión abierta y reiniciar el proceso | Las operaciones protegidas siguen bloqueadas; reactivar permite iniciar una sesión nueva válida |
| V-04 | Enviar un registro con autor distinto del usuario autenticado | El cuerpo no puede suplantar al autor de la captura; cualquier responsable de actividad distinto usa un permiso explícito cuando se acuerde |
| V-05 | Abrir el formulario de campo con una cuenta de trabajador | Puede cargar las opciones necesarias; las operaciones de administración permanecen restringidas |
| V-06 | Enviar campos obligatorios ausentes, tipos incorrectos o números inválidos | Se devuelve un error comprensible antes de persistir; no llegan valores inválidos a los cálculos o al repositorio |
| V-07 | Registrar y clasificar desde el formulario con entradas válidas acordadas | Formulario, API y servicio utilizan el mismo contrato; la operación completa guarda y devuelve el resultado esperado |
| V-08 | Repetir el envío de la misma operación después de perder la respuesta | Existe un único efecto persistido y una confirmación que permite retirar la operación local correcta |
| V-09 | Sincronizar un lote con operaciones válidas e inválidas | Solo las confirmadas dejan de estar pendientes; las fallidas conservan sus datos y muestran una causa y una acción posible |
| V-10 | Sincronizar una clasificación cuyo origen también se capturó offline | La relación de origen se conserva aunque los identificadores locales y del servidor sean diferentes |
| V-11 | Usar los mismos datos y la misma tara aplicable online y offline | Ambos recorridos producen el mismo resultado y no descuentan tara dos veces |
| V-12 | Cerrar sesión y utilizar otra cuenta en el mismo dispositivo | La segunda cuenta no visualiza ni envía registros privados de la primera; retención de pendientes y cierre deben definirse sin pérdida silenciosa |
| V-13 | Solicitar un reporte de un ámbito con más de ocho registros | El detalle incluye el conjunto completo del ámbito, con filtros coherentes; formato y métricas finales pendientes |
| V-14 | Restaurar una copia en un entorno aislado | Conteos, relaciones y totales relevantes coinciden con la copia; nunca se prueba sobrescribiendo datos operativos |

Las pruebas deben verificar resultados y persistencia. No basta comprobar que existe un método, que TypeScript compila o que una ruta responde 200.

## 3. Registro de decisiones por completar

Conservar las respuestas literales del cliente y, por separado, la interpretación propuesta. Marcar cada decisión como pendiente, confirmada o en contradicción. Una coincidencia matemática no constituye una respuesta del cliente.

| Decisión | Preguntas enviadas al cliente | Afecta | Estado |
|---|---|---|---|
| Unidad de campaña, jornada y captura | 1, 2 y 3 | Identidades, agrupaciones, formularios y relaciones de clasificación | Pendiente |
| Tara, categorías y cantidades | 4, 9 y 10 | Entradas, histórico y cálculo de netos | Pendiente |
| Cuadre, descarte, tolerancia y excepción | 5 y 6 | Fórmulas, precisión, alertas y permisos de aprobación | Pendiente |
| Entregas, compradores y rechazo | 7, 8, 11 y 12 | Trazabilidad comercial y porcentajes ajustados | Pendiente |
| Identificación de campañas y lotes | 13 y 14 | Catálogos, productividad y evolución histórica | Pendiente |
| Fechas, cierre, correcciones y responsabilidades | 15 y 16 | Estados, permisos y registro de cambios | Pendiente |
| Operación offline y dispositivos compartidos | 17 | Datos locales, aislamiento, sesión y sincronización | Pendiente |
| Reportes y alcance comercial | 18 y 19 | Contenido de reportes, precios/pagos si se confirman y filtros | Pendiente |
| Datos actuales, infraestructura y aceptación | 20 | Preservación de datos, migraciones, respaldo y entrega | Pendiente |

Ante una respuesta ambigua, preparar un ejemplo concreto con entradas y resultados para confirmar la interpretación. Si el cliente no conoce una regla, mantenerla pendiente y proponer opciones antes de implementarla.

## 4. Preparación para el Excel con fórmulas

Cuando se reciba el archivo:

1. Conservar el archivo recibido como referencia independiente, sin sobrescribir el anterior. Registrar qué campaña o período representa.
2. Identificar entradas manuales, fórmulas, hojas auxiliares, nombres definidos, referencias externas y celdas ocultas relevantes.
3. Distinguir fórmulas almacenadas de resultados calculados guardados. No asumir que estos últimos están actualizados; identificar necesidades de recálculo sin modificar el original.
4. Seguir las dependencias de cada resultado: conteos, bruto, tara, neto, clasificación, rechazo, diferencia y porcentajes.
5. Contrastar cada fórmula con la explicación del cliente. Resolver especialmente el denominador del cuadre, el tratamiento del descarte y el destino del rechazo.
6. Preparar ejemplos de aceptación con entradas, fórmula, resultado y precisión explícitos. Incluir valores límite y casos sin datos donde sean aplicables.
7. Registrar diferencias entre el Excel, el relato y los requisitos. No adoptar automáticamente una fórmula si contradice el proceso confirmado.

La recepción del archivo permite analizar las reglas, pero no autoriza por sí sola cambios en la base de datos ni en la aplicación.

## 5. Qué conviene aplazar

- Cambios del esquema y migraciones que fijen captura por gaveta, cardinalidad de clasificación, entregas o rechazo.
- Fórmula definitiva del cuadre, tratamiento del descarte, redondeo de tolerancias y composición nacional ajustada.
- Diseño final de reportes, indicadores de productividad y alcance de precios o pagos.
- Política de cierre y envíos tardíos, permisos de excepción y correcciones posteriores.
- Reescritura general, sustitución de base de datos o cambios estéticos amplios: no resuelven las decisiones pendientes.

## 6. Secuencia recomendada

**Mientras responde el cliente:** completar la preparación de seguridad, contratos y verificación descrita aquí, sin modificar código bajo el alcance actual.

**Al recibir respuestas:** completar el registro de decisiones, señalar contradicciones y producir una especificación funcional con criterios de aceptación. Acordar el alcance de entrega y preservar datos existentes antes de diseñar migraciones.

**Al pasar a implementación:** resolver primero protección de datos, sesiones, autoría y validación; después completar recorridos de negocio, reporte y sincronización sobre el modelo confirmado. Vincular cada corrección a su hallazgo y a una verificación pertinente.

Este plan puede adaptarse si el cliente tarda: las correcciones de seguridad independientes pueden adelantarse una vez que el usuario indique que se pasa de la fase documental a modificar código. No es necesario esperar a todas las fórmulas para proteger credenciales y sesiones.
