# Reglas de negocio confirmadas y contraste del Excel

Fecha: 9 de octubre de 2026.

Actualización posterior: se implementaron jornadas, cinco categorías, cuadre y aprobación del administrador. El [informe de implementación](IMPLEMENTACION_JORNADAS_Y_CLASIFICACION_2026-10-09.md) contiene el estado actual y sus pruebas. Las secciones de contraste y diseño de este documento conservan la situación observada antes de esa fase; las decisiones comerciales pendientes siguen vigentes.

## 1. Evidencia y alcance

Se revisó el nuevo archivo entregado por el usuario, `C:/Users/ariel/Desktop/Registro cosechas.xlsx`, junto con las diez respuestas del cliente y las aclaraciones posteriores del usuario. Se conservó una [copia idéntica de referencia](referencias/Registro_cosechas_cliente_2026-10-09.xlsx), sin modificar el original ni reemplazar el archivo anterior `Registro de cosechas.xlsx` del repositorio.

SHA-256 del original y de la copia: `35446eba9cb6582369c9495e07ecfda31e52571db73846ae7db36ba4d0a6e397`.

El libro contiene una hoja visible, `12,13 y 15-01-2026`, con 531 celdas con contenido y 64 fórmulas, incluidas fórmulas compartidas. No se encontraron hojas ocultas, filas o columnas ocultas, nombres definidos, vínculos externos, tablas dinámicas ni macros. La dimensión declarada llega a AA1118, pero el contenido termina en la fila 159.

Se extrajeron las fórmulas y sus resultados guardados del archivo, se expandieron las referencias compartidas y se recalcularon independientemente las 64 expresiones. Coincidieron con los resultados guardados con tolerancia numérica de 0,00000001. También se inspeccionaron las vistas de encabezado y resumen. Esto verifica estas operaciones aritméticas, no implica haber recalculado el libro dentro de Microsoft Excel ni confirmar cada dato manual como dato real correcto.

La precedencia aplicada es: decisión explícita del usuario, explicación actual del cliente, fórmulas y datos del Excel como evidencia que debe reconciliarse, documentación previa y código existente. Una nota contradictoria o una fórmula con constantes manuales no crea por sí sola una nueva regla de negocio.

Esta revisión actualiza la [auditoría inicial](AUDITORIA_FUNCIONAL_Y_RIESGOS_2026-10-05.md) y prepara la siguiente implementación. En esta revisión no se modificaron código de la aplicación, esquema ni base de datos.

## 2. Reglas y decisiones registradas

| ID | Regla | Procedencia y estado | Consecuencia para el sistema |
|---|---|---|---|
| RN-01 | Campaña agrupa fruta nacida en la misma fecha, con un código común; abarca varias jornadas y lotes | Confirmado por el cliente | Separar nacimiento, campaña y fecha de cosecha. No usar la fecha de creación del registro como sustituto de la jornada |
| RN-02 | Un Excel puede reunir de una a tres jornadas; cada jornada tiene entrega al día siguiente | Confirmado por el cliente como proceso habitual | El reporte es una vista agregada. No equivale a una campaña ni identifica por sí solo una entrega |
| RN-03 | Se permiten pesajes individuales o de grupos con cantidad de gavetas, trabajador responsable, fecha y hora | Confirmado por el cliente | Conservar bruto, cantidad y tara aplicada por pesaje; contar gavetas sumando cantidades, no contando registros |
| RN-04 | La clasificación abarca la cosecha de la jornada y mantiene separado cada lote; ocurre el mismo día | Confirmado por el cliente | Agrupar por campaña, jornada y lote. No exigir una clasificación independiente para cada pesaje individual |
| RN-05 | La tara usual de finca es 1,70 kg; el cliente menciona 1,70–2,00 kg para entrega según comprador | Cliente; usuario confirma 1,70 kg para la gaveta de finca | Separar tara de finca y tara de entrega; guardar el valor aplicado para preservar el histórico. La tara física usada en devolución necesita confirmación |
| RN-06 | Exportación G: fruto ≥280 g; P: ≥180 g y <280 g, cumpliendo calidad. N1/N2/N3: tamaño visual grande/mediano/pequeño | Cliente confirma; usuario decide usar estos límites, configurables, sin excepción de 155 g | Registrar la categoría elegida. No clasificar automáticamente usando el peso total de una gaveta ni mantener N3 ligado obligatoriamente a <180 g |
| RN-07 | El rechazo del comprador se pesa bruto en finca, se descuenta tara y su neto pasa de exportación a nacional para venta | Confirmado por el cliente | Conservar clasificación original y movimiento de devolución; reducir exportación aceptada y aumentar nacional sin duplicar cosecha |
| RN-08 | Cada peso de clasificación corresponde a una gaveta, incluso parcialmente llena | Confirmado por el cliente | No inferir peso neto por gaveta ni exigir igualdad entre cantidades cosechadas y clasificadas |
| RN-09 | El Excel calcula diferencia firmada / total clasificado. El margen es ±4 %; el administrador puede aprobar una excepción | Fórmula verificada; usuario acepta aplicar el margen por jornada y lote y señala al administrador como aprobador | Mostrar signo, evaluar magnitud sin redondear antes del umbral y separar captura de aprobación. Registrar explicación, aprobador y fecha como propuesta de trazabilidad |
| RN-10 | Existencia y tratamiento de descarte distinto de nacional | No confirmado: el cliente no respondió esta parte y el usuario declara incertidumbre | No equiparar nacional con desecho ni asumir que el descarte debe sumarse al denominador. No borrar datos existentes ni fijar una regla nueva basada en la suposición |

La respuesta sobre responsable confirma que debe existir; no aclara si el usuario que captura siempre es quien realiza el trabajo. El sistema debe conservar la autoría autenticada y, si se acuerda registrar por terceros, distinguirla del responsable operativo.

La fecha de clasificación operativa es la misma jornada; la recepción posterior de un registro offline no debe alterar esa fecha ni convertirse automáticamente en una infracción. Las reglas de captura tardía, corrección y cierre siguen pendientes.

## 3. Fórmulas verificadas y resultados de referencia

Se usan las abreviaturas H = cosechado neto, E = exportación neta original, N = nacional neto original, C = E + N y R = rechazo neto del comprador. Todas las masas de las fórmulas siguientes están en kg.

| Resultado | Celdas / fórmula del Excel | Interpretación |
|---|---|---|
| Cantidad de gavetas por lote y etapa | Fila 148: `COUNT(...)` | En este libro cada entrada de la matriz es una gaveta. En la aplicación debe ser la suma de cantidades de los pesajes |
| Bruto por lote y etapa | Fila 150: `SUM(...)` | Sumar las entradas de bruto del ámbito |
| Neto por lote y etapa | Ejemplo C151: `C150-(C148*$L$6)` | Bruto − cantidad × tara aplicada. L6 contiene 1,70 |
| Cosechado neto H | C152: `C151+D151+E151+F151+G151` | 2.245,50 |
| Exportación neta E | I152: `I151+J151+K151+L151+M151` | 1.603,40 |
| Nacional neto N | O152: `O151+P151+Q151+R151+S151` | 631,30 |
| Total clasificado C | T152: `I152+O152` | 2.234,70. No incluye una categoría de descarte separada |
| Diferencia firmada | T153: `C152-T152` | H − C = 10,80 |
| Diferencia relativa firmada | T154: `T153/T152` | (H − C) / C = 0,4832863472 %, mostrado 0,48 % |
| Participación original de exportación | I153: `I152/T152` | E / C = 71,7501230590 %, mostrado 71,75 % |
| Participación original de nacional | O153: `O152/T152` | N / C = 28,2498769410 %, mostrado 28,25 % |
| Rechazo bruto | U18: `SUM(U12:U17)` | 144,00 |
| Rechazo neto R | U19: `U18-(8*1.7)` | 130,40, con ocho gavetas ingresadas como constante manual |
| Rechazo sobre exportación entregada | U20: `U19/I152` | R / E = 8,1327179743 %, mostrado 8,13 %; no es participación sobre cosecha ni sobre todo lo clasificado |
| Participación ajustada de exportación | K154: `I153*(1-U20)` | Equivale a (E − R) / C = 65,9148879044 %, mostrado 65,91 % |
| Participación ajustada de nacional | Q154: `1-K154` | Equivale a (N + R) / C = 34,0851120956 %, mostrado 34,09 % |

Derivados independientes para aceptación: exportación aceptada = 1.473,00 kg; nacional tras devolución = 761,70 kg; su suma sigue siendo 2.234,70 kg. El rechazo es un traslado entre destinos comerciales de fruta ya registrada, no nueva producción ni un segundo peso cosechado.

La equivalencia de los porcentajes ajustados presupone C = E + N y que todo R se traslada a nacional, según la explicación del cliente. Si posteriormente se confirma una pérdida o descarte adicional, habrá que definir el cálculo de esa situación por separado.

Para decidir el umbral propuesto: `abs((H-C)/C)*100 <= 4`, con C positivo. Con C = 0 no existe porcentaje válido: no devolver 0 % ni aprobar un cuadre por defecto. El signo sirve para distinguir clasificado mayor o menor que cosechado; la comparación del margen usa su magnitud. Falta concretar el recorrido de cierre sin fruta clasificable si ese caso existe.

### Categorías reconstruidas desde el detalle

Los bloques G y P están marcados en H12 y H54; N1, N2 y N3 en N12, N22 y N31. Se sumaron las entradas de cada bloque, sin tomar los subtotales manuales como única evidencia.

| Ámbito | Gavetas | Bruto kg | Neto kg |
|---|---:|---:|---:|
| Cosechado | 134 | 2.473,30 | 2.245,50 |
| G | 41 | 797,20 | 727,50 |
| P | 56 | 971,10 | 875,90 |
| Exportación G + P | 97 | 1.768,30 | 1.603,40 |
| N1 | 15 | 280,80 | 255,30 |
| N2 | 14 | 248,80 | 225,00 |
| N3 | 9 | 166,30 | 151,00 |
| Nacional N1 + N2 + N3 | 38 | 695,90 | 631,30 |

Hay 134 gavetas cosechadas frente a 135 clasificadas. No constituye por sí solo un error: la fruta puede redistribuirse y las gavetas pueden estar parcialmente llenas; la comparación principal es de masa neta.

### El cuadre global puede ocultar un lote fuera del margen

Estos valores acumulan las tres jornadas; el Excel no permite repartir cada peso por día con certeza.

| Lote | H kg | E + N kg | H − C kg | Diferencia / C |
|---|---:|---:|---:|---:|
| L1 | 0,00 | 0,00 | 0,00 | No aplicable |
| L2 | 82,80 | 83,30 | −0,50 | −0,60 % |
| L3 | 226,30 | 233,30 | −7,00 | −3,00 % |
| L4 | 311,00 | 293,40 | 17,60 | 6,00 % |
| L5 | 1.625,40 | 1.624,70 | 0,70 | 0,04 % |
| Total | 2.245,50 | 2.234,70 | 10,80 | 0,48 % |

El lote 4 supera 4 % en el acumulado. La aprobación global no debe sustituir las comprobaciones de jornada/lote. No es posible afirmar qué jornada originó el descuadre porque el archivo presenta las fechas juntas.

### Inconsistencias y límites del archivo

1. B15 dice «desde 155 gr. a 280». El usuario decidió usar la respuesta actual del cliente, P desde 180 y G desde 280, sin excepción, con parámetros modificables. La nota no se trasladará como regla.
2. U12:U15 contiene 15,80; 17,10; 11,00 y 100,10 kg, y U16:U17 están vacías. U19 descuenta ocho gavetas, no cuatro. No se puede deducir su reparto ni declarar erróneos los 130,40 kg sin saber qué representa el grupo de 100,10 kg. El usuario declara no conocer ese detalle. La cantidad será un dato explícito, no un `COUNT` automático del número de filas.
3. U19, K157 y K158 fijan 1,70 y cantidades en las fórmulas en lugar de depender completamente de entradas. K157/K158 sí coinciden actualmente con los 41/56 pesos del detalle; no es una fórmula extensible de captura.
4. La mayoría de rangos termina en 145, mientras C148/C150 llegan a 147. Las filas 146/147 están vacías y no alteran el resultado actual. La aplicación no debe limitarse a ese número de filas.
5. I156 contiene el valor de fecha 45901, mostrado `01/09` y correspondiente a 1 de septiembre de 2025 en el calendario del archivo. Difiere de enero de 2026 del encabezado. No usar esa anotación auxiliar para deducir fechas de entrega o cosecha.
6. El rechazo no identifica jornada, lote, categoría ni entrega. La separación por lote está confirmada dentro de la finca; la atribución del rechazo devuelto sigue sin respuesta. No distribuirlo proporcionalmente por lote o categoría sin autorización.
7. El código H6 está guardado como número `92025`. Mantenerlo como identificador textual en la aplicación, sin deducir una fecha exacta de nacimiento ni imponer relleno con ceros a partir de este ejemplo.
8. Con el denominador verificado, los 46,20 kg del ejemplo anterior sobre 1.087,40 kg clasificados darían aproximadamente 4,25 %, no 2,32 %. Este libro nuevo aclara el tipo de fórmula, pero no explica el dato 2,32 % de aquella captura; no debe copiarse como resultado esperado.

## 4. Contraste con el sistema actual

| Área | Evidencia del código actual | Diferencia frente al proceso confirmado | Prioridad |
|---|---|---|---|
| Campaña/jornada | `Campana` tiene código y tara; no fecha de nacimiento ni entidad de jornada. `PesajeBruto.fechaRegistro` representa captura | Falta identificar jornada operativa y agrupar varios pesajes del mismo lote/campaña/día | Alta: fundamento del modelo |
| Clasificación | `Clasificacion.pesajeBrutoId @unique`; el formulario selecciona un pesaje | La clasificación debe abarcar el grupo de jornada/lote, no cada pesada por separado | Alta: corregir unidad de negocio |
| Categorías | Dos grupos agregados, exportación y nacional | Falta conservar G/P/N1/N2/N3 y sus pesos/cantidades | Alta: reporte y trazabilidad |
| Neto y tara | El servicio usa la tara histórica del pesaje; la vista previa de clasificación todavía lee `selected.campana.taraBase` | Un cambio de catálogo puede mostrar una vista previa distinta del servidor. Además falta separar tara de entrega | Alta: unificar cálculo aplicable en el nuevo recorrido |
| Cuadre | Servicio y hook dividen por peso cosechado, usan valor absoluto y redondean antes de comparar; incluyen `pesoDescarte` | Denominador diferente; pérdida del signo; borde de tolerancia; descarte no confirmado | Alta: fórmula y aceptación |
| Aprobación | El campo booleano `forzar` permite confirmar el descuadre en el recorrido de clasificación | La decisión del usuario exige aprobación del administrador, con trazabilidad propuesta | Alta: autorización del negocio |
| Ajuste comprador | Un `AjusteComprador` por clasificación, solo neto rechazado y `ajusteKg`. `pctFrutaEfectiva = aceptado / exportado` | Falta detalle bruto/cantidad/tara, entrega de origen y traslado a nacional. Ese porcentaje no es el porcentaje ajustado de exportación del Excel | Alta: trazabilidad comercial |
| Reportes | `DashboardRepository.actividadReciente` toma ocho pesajes; CSV/PDF/Excel exportan esa colección | No reproduce la matriz completa de lotes, categorías, etapas, jornadas y rechazo | Alta: resultado solicitado por el cliente |
| Indicadores | Dashboard destaca una campaña activa y cuenta ciertas alertas sin filtros del ámbito | Varias campañas pueden coexistir; alertas y porcentajes deben corresponder al ámbito seleccionado | Media/alta |
| Offline | Se conservaron identidad, autoría, tara capturada y confirmaciones en la fase previa | El nuevo grupo de jornada/lote y sus detalles necesitarán mantener estas garantías, fechas operativas y política de cierre | Alta al modificar el modelo |

Esto concreta F-03 a F-06 y la parte funcional de T-04/T-07/T-08 de la auditoría. Las correcciones técnicas anteriores siguen siendo útiles, pero no sustituyen este cambio de unidad de negocio. La especificación CU-05.2 debe actualizarse para agrupación, categorías y fórmula; CU-05.3 para entrega/devolución y denominadores; CU-06.1.4 para reporte completo.

## 5. Diseño funcional propuesto para la siguiente fase

Mantener Next.js y la arquitectura existente. No se necesita introducir otro framework, servicios independientes ni infraestructura nueva para resolver estas brechas.

1. **Campaña:** código textual, nacimiento y parámetros aplicables. Los valores configurables de categorías deben conservar versión o valores aplicados para que una edición no reinterprete el histórico.
2. **Grupo de jornada/lote:** identidad formada por campaña, fecha operativa de cosecha en la zona de la finca y lote. Contiene varios pesajes individuales o de grupos, cada uno con responsable, autor y fecha/hora. La fecha de sincronización es independiente.
3. **Clasificación del grupo:** captura de bruto y cantidad por G/P/N1/N2/N3; suma de netos por categoría y comparación con el total cosechado del grupo. Preservar el detalle suficiente para registrar varias pesadas sin inventar reparto entre pesajes originales.
4. **Revisión del cuadre:** mostrar valores, diferencia firmada y magnitud; un registro fuera de margen requiere aprobación del administrador. Propuesta: guardar motivo, aprobador y fecha. Definir los estados concretos al preparar el contrato, evitando un booleano que autorice excepciones desde cualquier cuenta.
5. **Entrega y devolución:** conservar origen de la fruta, comprador, fecha y tara de entrega. Registrar la devolución con cantidad y bruto, calcular neto con su tara aplicada y conservar el cambio de destino a nacional sin sobrescribir la clasificación inicial. La cardinalidad y atribución del rechazo deben cerrarse antes de esa migración.
6. **Reporte:** permitir elegir jornadas dentro de una campaña y lotes; incluir todos los registros del ámbito. Mostrar bruto, gavetas, neto, G/P/N1/N2/N3, porcentajes originales, rechazo, porcentajes ajustados y cuadre. Su resumen puede reproducir el Excel sin perder el detalle diario de la aplicación.

Este diseño es una propuesta concreta para preparar contratos y una migración aditiva. No se ha aplicado. No se mezclarán datos antiguos en grupos inferidos sin conservar su origen; el libro agregado no contiene información suficiente para reconstruir tres jornadas individuales.

## 6. Casos de aceptación preparados

| ID | Caso | Resultado esperado / estado |
|---|---|---|
| A-01 | Reproducir el total del Excel | H 2.245,50; E 1.603,40; N 631,30; C 2.234,70; diferencia 10,80; 0,48 % al mostrar dos decimales |
| A-02 | Reproducir categorías | G 727,50; P 875,90; N1 255,30; N2 225,00; N3 151,00 kg netos |
| A-03 | Reproducir ajuste como ejemplo numérico | Con bruto 144,00, cantidad explícita 8 y tara 1,70: R 130,40; aceptado 1.473,00; nacional final 761,70; 65,91 % y 34,09 %. Cantidad real ocho sigue pendiente de explicación |
| A-04 | Dos pesajes de 1 y 5 gavetas en el mismo grupo | Total seis gavetas; clasificar el grupo y descontar la tara por cantidad, no por número de registros |
| A-05 | Cantidades diferentes tras clasificar | No rechazar solo por tener 134 gavetas cosechadas y 135 clasificadas; evaluar masa neta |
| A-06 | Lote 4 del archivo | Mostrar 311,00 frente a 293,40, diferencia 17,60 y aproximadamente 6 %; no ocultar con el 0,48 % total |
| A-07 | Bordes de tolerancia | Con C = 1.000: H = 1.040 y 960 están en ±4 %; H = 1.040,01 o 959,99 requiere aprobación, aunque al mostrar dos decimales parezca 4,00 % |
| A-08 | Denominador cero | No devolver 0 % ni aprobar automáticamente; mostrar que el porcentaje no es calculable |
| A-09 | Cambio de parámetros/tara | Los registros anteriores mantienen sus valores aplicados; vista previa, guardado y reporte coinciden |
| A-10 | Categoría comercial | Valores iniciales P desde 180 y G desde 280; N visual. Cambiar límites no reclasifica automáticamente un histórico ni usa el bruto de la gaveta como peso individual |
| A-11 | Excepción de cuadre | Trabajador captura; solo administrador aprueba. Conservar motivo y evidencia según el contrato de aprobación |
| A-12 | Rechazo sin origen suficientemente identificado | No repartirlo por lote/categoría ni inventar jornadas. Completar el contrato de atribución antes de implementarlo |

A-01, A-02 y la aritmética de A-03/A-06 se verificaron contra este archivo. El resto son criterios para la implementación futura, no pruebas ya ejecutadas sobre funcionalidades que todavía no existen. La suite de 21 pruebas de la fase anterior no acredita estos requisitos nuevos.

## 7. Preguntas que permanecen abiertas

Las decisiones ya respondidas por el usuario no necesitan volver a preguntarse. Pendientes que afectan el siguiente modelo comercial:

1. **Alcance de entrega y rechazo:** ¿una entrega puede incluir varios lotes o campañas? ¿Cada devolución identifica qué entrega y lote originaron la fruta? ¿Puede haber varias devoluciones de una entrega? Si no se conoce el lote, debe quedar expresamente sin atribuir, no repartirse por suposición.
2. **Cantidad del rechazo y tara aplicada:** ¿qué representa U15 = 100,10 kg y de dónde salen las ocho gavetas? ¿La devolución siempre se pesa con gavetas de finca de 1,70, o puede llegar con las del comprador? La explicación actual sobre tara de entrega no responde este último punto.
3. **Descarte adicional:** además de nacional vendible, ¿hay fruta desechada cuyo peso deba registrarse? Si existe, ¿cómo afecta cuadre y porcentajes? Hasta responder, no aprobar la fórmula actual con descarte como si estuviera confirmada.
4. **Fechas, correcciones y cierre:** ¿quién puede corregir pesajes/clasificaciones cerradas o cargar tarde una jornada ya transcurrida? ¿Qué pasa si se cierra una campaña mientras un dispositivo tiene datos sin enviar?
5. **Responsable y autor:** ¿el trabajador siempre captura sus propios pesajes o un encargado registra el trabajo de otros? Esto cambia permisos y campos, sin eliminar la autoría autenticada.

La cantidad ocho del Excel puede usarse como entrada de una prueba matemática explícita; no como dato real verificado. La fecha de entrega al día siguiente describe el proceso, no justifica rechazar automáticamente una entrega tardía sin una política acordada.

## 8. Orden de implementación

Primero preparar el contrato de jornada/lote, detalle de pesajes y clasificación en cinco categorías, conservando fechas e identidades. A continuación implementar cálculos comunes, parámetros y aprobación del administrador con pruebas de aceptación. Después incorporar entrega/devolución cuando se resuelvan sus relaciones y construir el reporte completo sobre los datos del ámbito, no sobre actividad reciente. Finalmente validar el recorrido offline y la aceptación con el cliente.

La incertidumbre comercial no impide avanzar en agrupación, categorías y reporte original sin rechazo. Sí impide declarar terminado el ajuste comercial o diseñar una migración de devolución que suponga el reparto del rechazo. Las migraciones deben preservar los datos de prueba existentes y los pendientes locales; no se requiere reiniciar el proyecto.

## Anexo: respuestas literales del cliente

Se conservan las palabras facilitadas por el usuario, incluidos errores de escritura. Las interpretaciones anteriores y las decisiones posteriores del usuario no se presentan como citas del cliente.

**Campaña y cosecha:**

> Si, cada campaña se refiere a toda la fruta que nace en la misma fecha, y se asigna un mismo código. Una campaña puede tener varios días de cosecha y varios lotes. Cada excel corresponde a 1 o hasta 3 jornadas de cosecha, cada día de cosecha es una entrega en el día siguiente

**Registro de gavetas:**

> En un sistema si se podrían registrar varias gavetas, indicando la cantidad de gavetas del grupo que se pesa. Si debe haber un trabajador responsable, fecha y hora

**Relación entre cosecha y clasificación:**

> Se clasifica toda la fruta cosechada de una jornada, no se clasifica al día siguiente. Siempre se mantiene separado por lote tanto en cosecha como en la clasificación

**Tara y tipos de gaveta:**

> Nosotros generalmente usamos la tara de 1,70 kgs. para todas las cosechas, pero si hay variación para la entrega al comprador, dependiendo el comprador y varía entre 1,70 a 2,00 Kgs.

**Cuadre y margen permitido:**

> En el archivo que te adjunto se ve el detalle de la fórmula, tal vez el dato que mencionas podría tener algún error, pero la fórmula lo aclararía

**Descarte y diferencias:**

> La fruta se clasifica en exportación y nacional (de rechazo) y si se pesa por separado, después de la clasificación. Estos datos se comparan con los datos del peso que se hace antes de la clasificación a todas las gavetas cosechadas de un lote.

**Registro del rechazo:**

> El rechazo que mencionas aquí proviene de la fruta que nosotros en finca la clasficamos como exportación, entonces, así consta en el cuadro. Una vez entregada la fruta al comprador, este hace su clasificación y nos devuelve la fruta, esta se resta de nuestra clasificación de la fruta de exportación y, técnicamente, se suma a la fruta de rechazo. La frut que nos devuelve el comprador, nosotros la pesamos en la finca de igual manera: con gaveta para el peso bruto y le restamos el peso de gaveta para el peso neto

**Destino del rechazo y porcentajes ajustados:**

> Esta fruta pasa a clasificación de nacional y se vende como nacional

**Categorías comerciales:**

> Si, se confirma la información de G y P (grande y pequeña) para exportación. Las otras de N1, N2 y N3, al ser de rechazo, solo se clasifican de manera visual, no por peso, de acuerdo a grande, mediana y pequeña

**Cantidades después de clasificar:**

> Cada peso es de una gaveta, y si hay gavetas parialmente llenas por el tema de los lotes
