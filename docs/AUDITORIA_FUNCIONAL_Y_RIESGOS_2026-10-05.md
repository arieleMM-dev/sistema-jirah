# Auditoría funcional y de trazabilidad de Finca JIRAH

Fecha: 5 de octubre de 2026. Alcance: proceso de cosecha, requisitos documentados, implementación actual y riesgos técnicos críticos.

## 1. Dictamen

El proyecto tiene una base aprovechable, pero todavía no demuestra que pueda reemplazar el registro manual del cliente. Hay funcionalidades necesarias sin representación suficiente en los datos y recorridos que están interrumpidos por incompatibilidades entre la interfaz y el servidor. La sincronización y la protección de datos presentan riesgos que deben resolverse antes de operar con información real.

La siguiente fase debe establecer una especificación funcional verificable y resolver las decisiones del negocio indicadas en este informe. Después corresponde corregir por recorridos completos, con pruebas sobre los cálculos y la persistencia. No se recomienda una reescritura general ni una migración de tecnología como punto de partida.

Esta auditoría no modifica código, configuración, dependencias, migraciones, la base de datos actual ni documentos originales. Este informe es el único archivo nuevo dentro del proyecto. Los auxiliares de extracción y comprobación se ejecutaron en una carpeta temporal.

No se asigna un porcentaje de cumplimiento: la existencia de archivos o métodos no acredita que un requisito funcione de extremo a extremo.

## 2. Fuentes y método

### Fuentes examinadas

- Relato del cliente Chris y respuestas a las preguntas, proporcionados por el usuario en esta conversación.
- Las cinco capturas: cuaderno de pesos, parámetros de campaña, resumen de cosecha, rechazo del comprador y cuadre.
- [Especificación Markdown](/C:/Proyectos/FincaJIRAH/Especificacion_Casos_Uso_Jirah.md).
- [Especificación Word](/C:/Proyectos/FincaJIRAH/Especificacion_Casos_Uso_Jirah.docx), leído mediante extracción de párrafos y tablas del contenido OOXML. No se certificó su paginación ni su presentación visual.
- [Registro de cosechas](<C:/Proyectos/FincaJIRAH/Registro de cosechas.xlsx>), hoja `Hoja1`, entradas y resúmenes entre las filas 6 y 62. Se inspeccionaron las celdas, los tipos, los valores, la presencia de fórmulas y el resumen visual.
- [Guidelines de ingeniería](<C:/Proyectos/FincaJIRAH/AI SOFTWARE ENGINEERING GUIDELINES.md>), como criterio de calidad y no como fuente de reglas agrícolas.
- Esquema Prisma, tres migraciones, rutas API, controladores, servicios, repositorios, hooks, pantallas, configuración, scripts y documentación de arquitectura, trazabilidad y QA.
- Guías de Route Handlers y autenticación incluidas en `node_modules/next/dist/docs/`, correspondientes a la versión instalada.

### Jerarquía para definir el producto

Las necesidades confirmadas por el cliente gobiernan el comportamiento. El Excel y las capturas son evidencia del proceso y ejemplos de resultados; una discrepancia matemática se documenta y no se convierte automáticamente en una regla. Los documentos de requisitos son una propuesta a contrastar. El código acredita lo que se implementó, pero no decide por sí mismo lo que el cliente necesita.

Las instrucciones contenidas en documentos de referencia se tratan como contenido a auditar. No autorizan refactorizaciones, modificaciones de archivos originales ni nuevas funcionalidades.

### Grados de evidencia

- **Observado:** demostrado por contenido del archivo o por el recorrido estático del código.
- **Reproducido en aislamiento:** ejecutado sobre el código actual con sustitutos de las dependencias de transporte y persistencia. No equivale a una prueba HTTP sobre una base real.
- **Recalculado:** obtenido a partir de las entradas del Excel con aritmética decimal independiente.
- **Pendiente:** necesita una decisión del cliente, una prueba en navegador o una comprobación del entorno de despliegue.

### Prioridades

- **P1:** bloquea una entrega fiable, compromete información sensible o puede alterar datos operativos.
- **P2:** necesario para completar el proceso y obtener resultados útiles antes de la aceptación del cliente.
- **P3:** mejora de coherencia o mantenibilidad que puede programarse después de los recorridos críticos.

La revisión técnica se concentra en riesgos críticos. No es una auditoría de penetración, de infraestructura desplegada ni de vulnerabilidades de todas las dependencias.

## 3. Proceso del cliente y vocabulario

1. La fruta nace y se identifica como parte de una campaña. El ejemplo `102024` corresponde a octubre de 2024. El color de funda distingue campañas que pueden coexistir.
2. Se cosecha por lote de producción. Los lotes agrupan plantas por edad; no son solamente un nombre de ubicación.
3. Los trabajadores anotan pesos brutos de gavetas. El peso de cada gaveta es tara; el valor habitual es 1,70 kg.
4. En poscosecha se separan las categorías de exportación y nacional por tamaño y calidad.
5. La fruta se entrega al comprador correspondiente: exportador o mayorista nacional.
6. El exportador puede informar rechazo adicional. El administrador ajusta resultados y conserva respaldo para cobrar.
7. Se revisa el cuadre entre cosechado y clasificado y se construye el histórico de producción por lote y finca.

El cliente indicó un intervalo habitual de 16 a 17 semanas desde el nacimiento hasta cosechar y de 2 a 4 cosechas al año, sujeto al clima. Son referencias operativas, no fechas obligatorias, bloqueos ni promesas de predicción.

### Distinciones que deben mantenerse

- Campaña y jornada de cosecha no son necesariamente la misma unidad.
- Peso bruto incluye gavetas; peso neto corresponde a fruta después de descontar tara.
- Categoría comercial, tamaño y calidad están relacionados, pero no son intercambiables.
- Descarte en finca, diferencia de pesaje, rechazo del comprador y reclasificación son acontecimientos diferentes.
- Fruta clasificada, fruta despachada y fruta aceptada no deben contabilizarse como si fueran el mismo estado.
- Autor del registro y trabajador responsable de la actividad podrían ser personas distintas; requiere definición si el administrador registra por terceros.

### Categorías confirmadas en el relato

| Categoría | Significado | Precisión disponible |
|---|---|---|
| G | Exportación grande, fruta de 280 g o más y calidad exportable | Confirmado por el cliente |
| P | Exportación pequeña, fruta desde 180 g hasta menos de 280 g y calidad exportable | Confirmado; precisar medición y redondeo si se registran gramos decimales |
| N1 | Fruta grande que no califica para exportación por manchas o daños | Confirmado, sin umbral numérico adicional |
| N2 | Fruta mediana con daños y menor tamaño | Confirmado, sin límites numéricos exactos |
| N3 | Fruta pequeña por debajo de 180 g | Confirmado |

Estos umbrales corresponden a la fruta individual. No se puede deducir la categoría a partir del peso total de una gaveta. El producto puede registrar la categoría determinada por el clasificador sin obligarlo a pesar cada fruto individualmente.

## 4. Verificación del Excel

El archivo recibido tiene una sola hoja y **cero fórmulas almacenadas**. Los resultados del resumen son valores numéricos. Por tanto, no se puede reconstruir una fórmula original que no está presente; sí se puede comprobar la correspondencia entre entradas y resultados.

### Reconciliación de pesos

Se contaron y sumaron las entradas numéricas de las filas 12 a 54 de cada columna. Se aplicó la tara de `L6`, 1,70 kg, sin redondeos intermedios.

| Grupo y lote | Entradas | Bruto kg | Tara kg | Neto kg | Referencia |
|---|---:|---:|---:|---:|---|
| Cosechado L1 | 43 | 865,90 | 73,10 | 792,80 | C12:C54 y C56:C59 |
| Cosechado L2 | 18 | 371,40 | 30,60 | 340,80 | D12:D54 y D56:D59 |
| Exportación L1 | 33 | 616,50 | 56,10 | 560,40 | I12:I54 y I56:I59 |
| Exportación L2 | 15 | 286,10 | 25,50 | 260,60 | J12:J54 y J56:J59 |
| Nacional L1 | 11 | 206,50 | 18,70 | 187,80 | O12:O54 y O56:O59 |
| Nacional L2 | 5 | 87,10 | 8,50 | 78,60 | P12:P54 y P56:P59 |

Los seis conteos, sumas y netos coinciden con los valores del archivo. En la muestra aparecen las etiquetas G y N1; la necesidad de P, N2 y N3 también está expresada por el cliente y por CU-05.2.

### Resultados de referencia

| Resultado | Cálculo independiente | Resultado | Valor en el archivo |
|---|---|---:|---:|
| Cosechado neto | 792,8 + 340,8 | 1.133,60 kg | C60: 1.133,60 |
| Exportación neta | 560,4 + 260,6 | 821,00 kg | I60: 821 |
| Nacional neta | 187,8 + 78,6 | 266,40 kg | O60: 266,4 |
| Clasificado comercial | 821 + 266,4 | 1.087,40 kg | T60: 1.087,4 |
| Exportación inicial | 821 / 1.087,4 × 100 | 75,50 % | I61: 75,50 % |
| Nacional inicial | 266,4 / 1.087,4 × 100 | 24,50 % | O61: 24,50 % |
| Rechazo bruto | suma U12:U16, cinco gavetas | 83,70 kg | U18: 83,7 |
| Rechazo neto | 83,7 − 5 × 1,7 | 75,20 kg | U19: 75,2 |
| Rechazo sobre exportación | 75,2 / 821 × 100 | 9,16 % | U20: 9,16 % |
| Exportación aceptada | 821 − 75,2 | 745,80 kg | Se deriva de los valores de la muestra |
| Exportación ajustada sobre clasificado | 745,8 / 1.087,4 × 100 | 68,59 % | K62: 68,59 % |
| Nacional ajustada si se reasigna el rechazo | (266,4 + 75,2) / 1.087,4 × 100 | 31,41 % | Q62: 31,41 % |
| Aceptación del volumen exportado | 745,8 / 821 × 100 | 90,84 % | Corresponde al indicador que calcula AjusteService |
| Diferencia cosechado menos clasificado | 1.133,6 − 1.087,4 | 46,20 kg | T61: 46,2 |
| Diferencia sobre cosechado | 46,2 / 1.133,6 × 100 | 4,0755 %, visible 4,08 % | T62 muestra 2,32 % |

**Discrepancia E-01, P1:** el 2,32 % de T62 no se explica con la diferencia y las bases visibles. Usar clasificado como denominador tampoco lo explica: da aproximadamente 4,25 %. No se debe copiar ese valor como criterio de cuadre.

**Decisión E-02:** 68,59 % y 31,41 % son compatibles con una reasignación de rechazo a nacional manteniendo el denominador de 1.087,40 kg. La coincidencia matemática no demuestra el destino físico ni comercial de esa fruta. Hasta confirmarlo, conservar rechazo y nacional como datos separados.

**Decisión E-03:** el rechazo del ejemplo está a nivel global y no tiene lote de origen explícito. No se puede calcular rechazo por lote distribuyéndolo arbitrariamente o en proporción sin autorización del cliente.

El servicio actual calcula aceptación sobre exportación, 90,84 % en este ejemplo. Es un indicador válido con otro significado; no reemplaza el 68,59 % que espera el reporte. Ambos deben tener nombres y denominadores explícitos si se conservan.

## 5. Auditoría de la especificación

El Word permite leer con mayor claridad tablas que quedaron dañadas en el Markdown, particularmente CU-05.2 y su excepción. En las secciones examinadas expresa esencialmente los mismos requisitos. Tener una versión Word no resuelve las ambigüedades de negocio.

| ID | Deficiencia | Consecuencia | Tratamiento propuesto |
|---|---|---|---|
| D-01 | CU-05.1 pide cantidad y bruto total, mientras el cliente entrega una lista de pesos por gaveta | Traslada la suma manual al trabajador y puede perder el detalle de origen | Confirmar captura individual; derivar sumas automáticamente |
| D-02 | CU-05.2 menciona G/P/N1/N2/N3, pero no define registros, agrupación y asociación de entradas | La implementación agrupó solo exportación y nacional | Especificar detalle por categoría y unidad de clasificación |
| D-03 | CU-05.3 no define si el rechazo ingresado es bruto o neto, ni su tara | Riesgo de descontar gavetas dos veces o de no descontarlas | Captura con unidad explícita y ejemplo de cinco gavetas |
| D-04 | Porcentaje de fruta efectiva sin denominador | Dos resultados diferentes pueden presentarse como equivalentes | Definir fórmulas, base, nombres y redondeo de cada indicador |
| D-05 | Se exige una clasificación despachada, pero no hay caso de uso de despacho | Falta el vínculo entre producción y respaldo de entrega | Definir entrega mínima verificable, sin introducir facturación por supuesto |
| D-06 | Tolerancia de cuadre se presenta también como perfil de merma del comprador | Confunde el balance interno con un rechazo comercial legítimo | Separar cuadre, rechazo y tolerancias comerciales si estas últimas se confirman |
| D-07 | El servidor debe detectar registros todavía aislados en dispositivos offline | Exige conocer datos que el servidor aún no recibió | Definir protocolo y política de cierre y envíos tardíos |
| D-08 | Agricultor, clasificador y administrador se usan de forma desigual; no hay matriz completa de permisos | Riesgo de bloquear trabajo permitido o aceptar acciones no autorizadas | Definir permisos por operación y ámbito de datos |
| D-09 | PostgreSQL, IndexedDB, Prisma y Service Worker aparecen dentro del comportamiento funcional | Puede darse por cumplido un mecanismo sin validar el resultado | Separar requisitos funcionales, decisiones de arquitectura y requisitos de operación |
| D-10 | “Transacción ACID”, “listado en menos de un segundo” y “curvas de rendimiento” sin escenarios y métricas | No permite comprobar aceptación objetiva | Definir atomicidad necesaria y escenarios medibles con volumen y entorno |
| D-11 | “Ficha inalterable” incluye nombres, pero CU-03.3 permite editarlos; comparación de contraseña con hash mal descrita | Contradicciones y terminología técnica incorrecta | Enumerar campos editables y describir verificación segura de contraseña |
| D-12 | No se especifican correcciones, responsables, historial de cambios, retención y recuperación | Un error de digitación puede quedar sin solución trazable | Acordar un flujo mínimo de corrección y respaldo antes de producción |
| D-13 | La productividad por edad de plantas y el efecto de fundas se prometen sin definir datos ni método | Reportes que sugieren conclusiones que no pueden sostener | Definir datos necesarios; una agrupación por color no demuestra causalidad |
| D-14 | CU-06.1.4 no define contenido, integridad ni alcance del reporte | Se exportó una lista reciente en lugar del respaldo completo de campaña | Especificar contenido del reporte con el ejemplo del cliente |

El código de campaña puede ser manual o derivado de nacimiento según el relato. No debe imponerse generación automática ni una sola campaña por mes sin confirmar la política de identificación.

## 6. Trazabilidad de los requisitos existentes

“Presente” significa que se encontró un recorrido coherente al leer el código; no certifica comportamiento en navegador. “Parcial” señala elementos implementados y faltantes. “Defectuoso” identifica una incompatibilidad o riesgo en el recorrido. Los criterios de aceptación adicionales están en la sección 9.

### Acceso, perfil y personal

| Requisito | Estado observado | Evidencia y brecha |
|---|---|---|
| CU-01.1 Iniciar sesión | Parcial | AuthController, AuthService y login verifican credenciales y estado. Existe redirección admin/campo; no diferencia clasificador. Revocación presenta T-06; falta verificación HTTP y prevención de abuso |
| CU-01.2 Recuperar contraseña | Parcial | Token hasheado con vencimiento; el envío de correo se simula en consola. El usuario real no recibe el enlace. Consumo y cambio no son atómicos |
| CU-02.1 Actualizar datos | Presente, pendiente de prueba E2E | PerfilController y página permiten teléfono/avatar. Validación de imagen se basa en prefijo y tamaño de la cadena; validar contenido y fallo de red antes de aceptación |
| CU-02.2 Cambiar contraseña | Presente, pendiente de prueba E2E | Se verifica contraseña actual y fortaleza. Definir invalidación de sesiones y probar doble envío |
| CU-02.3 Preferencias | Defectuoso | Perfil almacena CLARO/OSCURO; layout lee light/dark de la misma clave. Tema y avatar usan claves globales sin usuario; no hay cola de sincronización de preferencias |
| CU-03.1 Crear trabajador | Parcial | Datos e identificación validados; se devuelve contraseña temporal `_dev_password` y se muestra en interfaz. No hay envío real ni cambio obligatorio inicial |
| CU-03.2 Consultar trabajador | Presente, pendiente de prueba E2E | Rutas restringidas a admin, búsqueda y ficha. Límite de 50 sin paginación; el tiempo de respuesta prometido no se midió |
| CU-03.3 Editar trabajador | Parcial | Lista de campos editables y unicidad. Eliminación de tokens y actualización del usuario son operaciones separadas |
| CU-03.4 Desactivar/reactivar | Defectuoso | Borrado lógico y bloqueo de auto-desactivación presentes. Revocación en memoria y reactivación inconsistente: T-06 |

### Catálogos

| Requisito | Estado observado | Evidencia y brecha |
|---|---|---|
| CU-04.1.1 Crear campaña | Parcial | Código, funda, tara y comprador. Falta nacimiento explícito y referencia de cultivo en campaña; confirmar si comprador es destino predeterminado |
| CU-04.1.2 Consultar campañas | Presente para admin; defectuoso para campo | Listado existe, pero su permiso impide cargar el formulario del agricultor: F-01 |
| CU-04.1.3 Editar campaña | Parcial | Bloqueo de tara con pesajes presentes en servidor. No protege registros aún offline; edición de tara sin pesajes no repite validación de rango |
| CU-04.1.4 Cerrar campaña | Parcial | Solo consulta PENDING en servidor; no conoce colas desconectadas. Sync permite insertar en campaña cerrada: T-07 |
| CU-04.2.1 Crear lote | Parcial | Código, nombre y hectáreas. Variedad existe en esquema pero no se captura en la pantalla; edad o fecha de plantación no se modela |
| CU-04.2.2 Consultar lotes | Presente para admin; defectuoso para campo | Mismo bloqueo de lectura que F-01 |
| CU-04.2.3 Editar lote | Parcial | Código protegido. La lista permitida en servicio omite variedad; no resuelve datos de edad de plantas |
| CU-04.2.4 Inactivar lote | Parcial | Conserva histórico y revisa pesajes con campaña activa. La relación operativa lote/campaña se infiere de pesajes existentes; no conoce trabajo offline |
| CU-04.3.1 Crear comprador | Parcial | Directorio y tipo presentes. Validación de razón social solo acepta letras y espacios, excluyendo nombres comerciales habituales con puntos, números o símbolos |
| CU-04.3.2 Consultar compradores | Presente para admin | Directorio existe. Definir qué datos necesita campo y qué debe quedar restringido |
| CU-04.3.3 Editar comprador | Parcial | Campos permitidos presentes. No se vuelve a validar tolerancia en el servicio; tolerancia no participa en cuadre de clasificación |
| CU-04.3.4 Inactivar comprador | Presente, pendiente de prueba E2E | Borrado lógico y filtro de activos en selección de campañas. AjusteService no exige comprador activo ni correspondencia con despacho |

### Campo y productividad

| Requisito | Estado observado | Evidencia y brecha |
|---|---|---|
| CU-05.1 Pesaje | Parcial y bloqueado para agricultor | Regla de tara agregada presente. F-01 impide carga normal; falta captura cómoda por gaveta y agregación por jornada |
| CU-05.2 Clasificación | Defectuoso | Contrato UI/servidor incompatible: F-02. Sin G/P/N1/N2/N3, sin agrupación definida, sin porcentaje de exportación en la pantalla |
| CU-05.3 Ajuste comprador | Parcial, sin recorrido de interfaz | API/servicio/repositorio existen. No se encontró pantalla de ajuste, despacho ni reporte que integre sus métricas. Denominador distinto del Excel |
| CU-05.4 Sincronización | Defectuoso | Hay IndexedDB y reintentos, pero sin identidad estable, equivalencia online/offline, aislamiento por cuenta y tratamiento correcto de fallos parciales: T-02 a T-07 |
| CU-06.1 Dashboard | Parcial | Kilos, actividad y barras por lote. Sin evolución temporal, composición por categorías ni aceptación/rechazo; API no restringe a admin pese al actor documentado |
| CU-06.1.1 Fechas | Parcial | Filtros presentes. Sin validación de rango; inicio y fin construidos con convenciones temporales diferentes. Error no se representa explícitamente en pantalla |
| CU-06.1.2 Lote | Parcial | Filtra pesajes; no filtra el contador global de alertas. Lista solo lotes activos, dificultando seleccionar histórico de lotes inactivos |
| CU-06.1.3 Campaña/funda | Parcial | Filtro por ID de campaña. No hay filtro independiente por funda ni comparación de campañas coexistentes |
| CU-06.1.4 Exportación | Defectuoso para objetivo del cliente | Exporta `actividadReciente`, limitada a ocho pesajes. No reproduce matriz, categorías, compradores, rechazo, porcentajes ni cierre de campaña |

## 7. Brechas funcionales prioritarias

### F-01 P1 Lectura de catálogos bloqueada para el trabajador

**Evidencia:** `lib/hooks/usePesaje.ts:27` consulta campañas y lotes. `lib/controllers/CatalogoController.ts:57` y `:100` exigen ADMIN también para listar. El hook trata un 403 como fallo de carga. Un agricultor inicia sesión correctamente y no puede completar el formulario normal.

**Criterio:** un usuario autorizado para pesar puede consultar las opciones activas que necesita; las modificaciones de catálogos siguen reservadas al administrador.

### F-02 P1 Contrato de clasificación incompatible

**Evidencia:** `lib/hooks/useClasificacion.ts:113` envía `pesajeId`, `exportacionKg`, `nacionalKg`, `descarteKg`, `forzarDescuadre`. `lib/controllers/PesajeController.ts:97` reenvía el cuerpo sin transformación. `lib/services/pesaje.service.ts:99` espera `pesajeBrutoId`, cantidades de gavetas, pesos brutos, `pesoDescarte` y `forzar`.

**Reproducción:** con el cuerpo del formulario, el repositorio recibe ID indefinido. Con un sustituto que devuelve ausencia para ese ID, la respuesta es 404. Una consulta Prisma real con ID indefinido puede arrojar un error de validación y terminar en 500; no se probó contra la base actual. Cambiar solamente el nombre del ID no soluciona la ausencia de los otros campos.

**Criterio:** UI y API comparten un contrato validado; el servidor calcula el neto y acepta o rechaza el mismo registro que presenta la pantalla.

### F-03 P2 Falta detalle comercial y unidad de registro

**Evidencia:** `prisma/schema.prisma` contiene agregados de exportación/nacional y una clasificación única por pesaje, pero no detalle de gavetas ni categorías comerciales. Registrar cada gaveta como un PesajeBruto de una gaveta podría guardar entradas individuales, pero no resuelve su captura agrupada ni la clasificación de un conjunto de entradas.

**Criterio:** conservar el detalle confirmado por el cliente y obtener totales derivados por campaña, jornada, lote y categoría. No imponer identificación física permanente de gavetas si solo se necesita registrar cada medición.

### F-04 P2 Falta recorrido de entrega y rechazo

**Evidencia:** sin modelo de despacho/entrega ni pantalla de ajuste. Un comprador opcional en campaña no demuestra a quién se entregó realmente cada volumen. El ajuste es único por clasificación y no conserva gavetas o bruto del rechazo.

**Criterio:** registrar al menos fecha, comprador, categorías, neto entregado y procedencia; relacionar la respuesta del comprador con esa entrega. Definir entregas parciales, mezcla de lotes y múltiples reportes antes de fijar cardinalidades.

### F-05 P1 Reporte incompleto para respaldo comercial

**Evidencia:** `lib/repositories/DashboardRepository.ts:61` limita actividad a ocho filas; `app/dashboard/page.tsx:18`, `:41` y `:62` usan esas filas para exportar.

**Criterio:** el reporte contiene todo el conjunto seleccionado, con fechas y filtros explícitos, detalle y resumen reconciliables. Debe explicar cosechado, clasificado, entregado y aceptado. Precios, cuentas por cobrar y pagos permanecen fuera del alcance hasta confirmación.

### F-06 P2 Indicadores mezclan ámbitos

**Evidencia:** alertas se cuentan globalmente en `DashboardRepository.ts:47`, mientras pesos y actividad sí se filtran. Campaña activa es la más reciente global y no necesariamente la campaña filtrada. El hook conserva estadísticas anteriores al fallar y la pantalla no usa su estado de error.

**Criterio:** cada indicador muestra su ámbito; los filtros se aplican consistentemente y un fallo de carga no se presenta como información actualizada.

## 8. Riesgos técnicos críticos y aplicación de guidelines

### T-01 P1 El detalle del pesaje puede revelar el hash de contraseña

`lib/repositories/PesajeRepository.ts:24` incluye `agricultor: true`. El modelo User tiene `passwordHash`. `PesajeController.get` devuelve el objeto completo a cualquier sesión que supera su comprobación. Se observó el recorrido y se reprodujo la ausencia de proyección con un usuario ficticio; no se extrajeron hashes de la base real.

**Corrección futura:** usar una proyección de respuesta explícita y autorización por recurso; verificar ausencia de hashes y tokens en todos los endpoints. Guidelines 10, 12 y 20.1.

### T-02 P1 Sincronización sin idempotencia ni correspondencia estable de IDs

`app/api/sync/pesajes/route.ts:29` ejecuta create y no persiste `localId`. Enviar dos veces el mismo lote llama dos veces a create. Si el servidor guarda y la respuesta se pierde, el reintento puede duplicar kilos. No devuelve la correspondencia de ID local a ID servidor.

En clasificación, `pesaje_local_id` se consulta como ID del servidor. Una clasificación referida a un pesaje creado offline no dispone de una correspondencia para resolverlo. Las restricciones de unicidad existentes no solucionan el pesaje duplicado ni convierten la repetición de clasificación en un éxito idempotente.

**Corrección futura:** identidad estable con unicidad en servidor, respuesta reconocible por registro, referencias resolubles y pruebas de respuesta perdida/reintento. No exige introducir una cola externa. Guidelines 9, 11, 21 y 23.

### T-03 P1 El servidor acepta la identidad del autor enviada por el dispositivo

Los endpoints sync comprueban que exista `session.user`, pero el adapter usa `agricultor_id` y `clasificador_id` del cuerpo. La reproducción envió una sesión ficticia y otro autor; el segundo llegó a persistencia. Tampoco se verifica el permiso de operación ni el ámbito del recurso.

**Corrección futura:** derivar autor de la sesión, o validar un registro delegado autorizado y conservar también quién lo realizó. Una cola de otra cuenta debe quedar protegida, no cambiar de dueño automáticamente. Guidelines 10 y 12.

### T-04 P1 Los cálculos online y offline no conservan las mismas reglas

`OfflinePayloadAdapter` fija tara en 1,70 kg. PesajeService usa la tara de campaña. Para bruto 100 kg y 10 gavetas en campaña con tara 2 kg, los resultados reproducidos son 80 kg online y 83 kg offline.

Clasificación offline conserva netos, pero omite gavetas y brutos. Sync llama a Prisma directamente, sin validaciones de campañas/lotes activos, valores o confirmación de descuadre del servicio normal.

**Corrección futura:** reglas de dominio comunes y datos suficientes para recalcular con la tara vigente al registrar. Acordar cómo tratar cambios de configuración durante una desconexión. Guidelines 4, 8, 10 y 11.

### T-05 P1 Fallos parciales y colas sin aislamiento suficiente

Los endpoints pueden devolver HTTP 200 con `errors`. `useSyncManager.ts:43` y `:60` eliminan solo los guardados, lo que preserva los fallidos, pero no procesan los errores. Con 200 parcial, o 4xx, el gestor puede publicar `sync-complete` sin haber sincronizado todo y no programar el reintento pertinente.

IndexedDB usa una cola global por origen sin partición por usuario. No se encontró exclusión de envíos simultáneos, seguimiento visible de pendientes ni caché estructurada de catálogos/historial para comenzar una captura después de recargar offline. Los eventos publicados tampoco tienen suscriptores de interfaz encontrados en el código de aplicación. El service worker y la PWA requieren prueba en producción, ya que PWA está desactivada en desarrollo.

**Corrección futura:** errores por registro visibles, reautenticación para sesiones caducadas, reintentos según tipo de error, aislamiento por cuenta, protección frente a múltiples pestañas y acceso offline a datos necesarios. Guidelines 7, 12, 16, 17, 21 y 23.

### T-06 P1 Revocación de sesiones y reactivación incompletas

La revocación es un Set en memoria (`auth.service.ts:179`). Se pierde al reiniciar y no se comparte entre procesos. El callback de sesión devuelve un objeto con `user` indefinido cuando está revocado (`AuthController.ts:64`), pero varios endpoints solo comprueban `if (!session)`. Se reprodujo que una sesión con esa forma supera la guarda de listado de pesajes y obtiene 200 con repositorio ficticio.

Reactivar modifica isActive, pero no limpia el Set. Un usuario reactivado puede seguir siendo marcado como revocado incluso en un nuevo inicio de sesión del mismo proceso. Los endpoints no vuelven a comprobar actividad del usuario de forma uniforme.

**Corrección futura:** validación persistente de actividad y una política consistente de revocación/versionado de sesiones; probar desactivación, reinicio, múltiples procesos y reactivación. Guidelines 12 y 23.

### T-07 P1 Cierre de campaña y cola offline pueden contradecirse

`CampanaService.cerrar` solo cuenta registros PENDING del servidor. Los pesajes online se crean SYNCED y los offline aún no existen allí. El cierre no puede garantizar que no haya trabajo pendiente en dispositivos. Sync no comprueba cierre ni actividad del lote.

**Corrección futura:** definir cierre provisional/definitivo o revisión de envíos tardíos, según decisión del cliente. No prometer que el servidor ve una cola desconectada. Guidelines 11, 23 y 32.

### T-08 P1 Validación numérica insuficiente

Se reprodujeron valores de clasificación ausentes que llegan al repositorio como NaN y descarte negativo que llega como −10 kg si se fuerza el registro. No equivale a afirmar que Prisma siempre los persiste: la validación debe rechazarlos antes de la capa de datos.

Pesaje valida gavetas enteras, pero no verifica explícitamente que el bruto sea un número finito. Clasificación no aplica validación completa de gavetas enteras, pesos y descarte. Ajuste convierte con Number sin comprobar finitud. Updates de tara y tolerancia omiten comprobaciones de rango. Se transmiten cuerpos JSON sin esquemas de entrada en varios límites.

Se reproduce además que un margen de 4,004 % se redondea a 4,00 % antes de comparar y se acepta. La política de precisión debe quedar explícita. Con base neta cero, el cálculo devuelve margen cero, lo que no demuestra un cuadre válido.

**Corrección futura:** contratos validados, rechazo explícito de ausencias, tipos incorrectos, infinitos, negativos e inconsistencias. Calcular y validar según la precisión acordada; redondear para presentación donde corresponda. Guidelines 5, 7 y 10.

### T-09 P2 Recuperación y acceso inicial no están completos para un cliente real

El envío de recuperación se simula por consola sin condición que lo limite a desarrollo, registrando un enlace con token y destinatario. El alta devuelve contraseña temporal en la respuesta y la interfaz. No se encontró proveedor de correo ni flujo obligatorio de cambio inicial.

Restablecer contraseña y marcar token usado son dos operaciones separadas; solicitudes concurrentes pueden consumir el mismo token. El controlador omite registrar fallos de recuperación y puede exponer mensajes internos en reset. No se encontró control de abuso en estos recorridos.

**Corrección futura:** acordar recuperación real, eliminar divulgación de credenciales en logs, consumir tokens de forma atómica y establecer controles de abuso proporcionados. Guidelines 7, 11, 12 y 22.

### T-10 P2 Preparación de operación y verificación insuficiente

El runtime consulta DATABASE_URL con fallback local; `prisma.config.ts` y seed fijan `prisma/dev.db`. Si se configura otra base para ejecutar la aplicación, los comandos pueden actuar sobre una base distinta. No se encontró `.env.example`, pipeline de CI ni procedimiento específico de despliegue, copia y restauración. La existencia de `.env` no demuestra que producción esté configurada correctamente; no se leyeron sus valores.

No se encontraron pruebas automatizadas de producto ni script test. El plan QA es un plan pendiente: menciona servicios/métodos inexistentes, confunde SQLite con IndexedDB para captura offline y presupone que AuthService devuelve un JWT. No acredita resultados ejecutados.

**Corrección futura:** configuración coherente entre runtime y herramientas; documentar y probar despliegue, restauración, migraciones y operación. SQLite no necesita reemplazarse por principio: su idoneidad depende del entorno, concurrencia y respaldo acordados. Guidelines 2, 11, 20, 21, 24 y 28.

### Aspectos aprovechables

Hay separación predominante de rutas, controladores, servicios y repositorios; contraseñas hasheadas; proyecciones públicas en UserRepository; borrado lógico para conservar historial; unicidad de identidades y relaciones; un cliente Prisma reutilizado; cálculo online de tara por campaña; guardado local y eliminación selectiva de registros confirmados; reintentos de red y errores 500.

Las implementaciones Strategy y State están presentes, pero no se encontraron usos desde los recorridos de aplicación. Observer publica eventos sin consumidores de UI encontrados. Según las guidelines, deben justificarse por utilidad real; no es prioritario añadir capas o conservar abstracciones solo para cumplir una rúbrica académica.

## 9. Requisitos propuestos y criterios de aceptación

Esta es una base para la especificación siguiente. No reemplaza todavía los documentos originales. Las decisiones marcadas como pendientes no autorizan imponer cardinalidades ni políticas al cliente.

| ID propuesto | Relación | Comportamiento exigible | Criterio de aceptación |
|---|---|---|---|
| RF-01 Campaña | CU-04.1 | Identificar campaña, nacimiento cuando se acuerde, cultivo, funda y tara; permitir campañas coexistentes | Dos campañas activas pueden registrar cosecha sin mezclarse. Código/nacimiento no se confunden con fecha de registro. Regla de identificación pendiente |
| RF-02 Lote | CU-04.2 | Mantener identidad y datos del lote, preservando su histórico | Inactivar un lote no elimina resultados pasados y estos siguen consultables. Edad/plantación debe definirse si se requiere productividad por edad |
| RF-03 Captura de cosecha | CU-05.1 | Capturar entradas de peso por lote/campaña/jornada y conservar autor y fecha de la actividad | Con las 43 entradas de L1: conteo 43, bruto 865,90, neto 792,80. Captura individual y agrupación pendientes de confirmación |
| RF-04 Tara y unidades | CU-04.1 y CU-05 | Descontar una vez la tara aplicable y conservar su base histórica | Cantidad × tara reconcilia bruto y neto. El mismo registro produce iguales resultados online/offline; cambios posteriores no alteran el histórico |
| RF-05 Clasificación | CU-05.2 | Guardar detalle G, P, N1, N2 y N3 asociado a la producción de origen | Total exportación = G + P; total nacional = N1 + N2 + N3. Cantidades, brutos y netos se pueden reconstruir. Unidad de clasificación pendiente |
| RF-06 Cuadre | CU-05.2 | Mostrar diferencia y porcentaje con base explícita; advertir fuera de tolerancia | La muestra muestra 46,20 kg y, si se confirma base cosechado, 4,0755 %. No mostrar 2,32 % sin regla aprobada. Descarte y precisión pendientes |
| RF-07 Excepción de cuadre | CU-05.2 E.1 | Conservar excepción con motivo, actor y autorización según rol | Un usuario sin permiso no aprueba la excepción. La advertencia y la resolución quedan consultables; no basta un booleano sin contexto |
| RF-08 Entrega | Ampliación de CU-05.3 | Relacionar producción entregada con comprador, fecha y cantidades | Se distingue exportación a exportador de nacional a mayorista. Se conserva el origen por lote aun cuando la entrega agrupa producción. Entregas parciales pendientes |
| RF-09 Rechazo | CU-05.3 | Capturar rechazo con unidad y relación a una entrega | Cinco gavetas con bruto 83,70 y tara 1,70 producen neto 75,20. Si se ingresa neto, no se descuenta tara otra vez. No supera neto entregado |
| RF-10 Resultado ajustado | CU-05.3 y CU-06 | Separar kilos aceptados y porcentajes con denominadores explícitos | En el ejemplo: aceptado 745,80 kg; aceptación de exportación 90,84 %; composición exportable ajustada 68,59 % sobre clasificado. Nacional ajustada depende del destino confirmado |
| RF-11 Reporte de cosecha | CU-06.1.4 | Reproducir información útil del Excel para todo el ámbito seleccionado | Más de ocho pesajes aparecen completos. Incluye parámetros, detalle y totales por lote/categoría, rechazo y bases de porcentajes; reconcilia con entradas |
| RF-12 Histórico y productividad | CU-06.1 | Consultar todo el histórico con filtros coherentes | Fecha/lote/campaña afectan pesos, alertas y reporte de forma declarada. Producción de lotes inactivos se puede consultar. No se atribuye causalidad al color de funda |
| RF-13 Corrección trazable | Nueva necesidad operativa propuesta | Corregir errores sin borrar silenciosamente el historial | Registrar original/corrección, motivo, actor y fecha; recalcular resultados afectados. Permisos, estados editables y aprobación pendientes |
| RF-14 Trabajo offline | CU-05.4 | Capturar y consultar datos necesarios sin conexión, con estado visible y referencias estables | Precargar datos; desconectar; registrar y clasificar según unidad aprobada; cerrar y reabrir; recuperar registros; reconectar sin pérdida ni duplicación |
| RF-15 Autorización y cuentas | CU-01, CU-03 y transversal | Autorizar por operación y recurso; proteger cuentas y sesiones | Campo puede leer opciones necesarias, pero no administrar catálogos. Desactivar bloquea operaciones tras reinicio; reactivar permite nuevo acceso. Respuestas sin hashes/tokens |
| RF-16 Respaldo y aceptación | Transversal | Mantener datos recuperables y ejecutar verificaciones críticas | Restaurar una copia en un entorno aislado y reconciliar conteos/totales. Recorrido de una cosecha real validado por administrador y trabajador |

Las propuestas RF-08 y RF-13 surgen del proceso y de la operación necesaria para trazabilidad; su detalle debe confirmarse. No se añaden automáticamente facturación, pagos, inventario general, predicción de cosechas, pesaje automático de frutos ni integración con básculas.

## 10. Verificaciones ejecutadas

| Comprobación | Resultado | Alcance y limitación |
|---|---|---|
| Lectura Markdown y Word | Se contrastaron los seis módulos y sus casos descritos | Extracción de texto/tablas; no certifica diagramas ni presentación visual del Word |
| Lectura del Excel | Una hoja; cero fórmulas almacenadas | Se conservó original; resumen visual inspeccionado |
| Reconciliación decimal | Seis columnas coinciden en conteo, bruto, tara y neto | Comparación de datos de muestra, no integración con la aplicación |
| Rechazo y porcentajes | Neto 75,20; porcentajes 75,50/24,50 y 68,59/31,41 reconciliados según bases indicadas | Destino real del rechazo pendiente |
| Comprobación TypeScript | Exit code 0, sin errores | `tsc --noEmit --incremental false`; no prueba contratos JSON en ejecución |
| Lint completo | Exit code 1: 62 errores y 106 advertencias | Incluye artefactos generados de public |
| Lint de fuentes | 62 errores y 19 advertencias en 32 archivos con diagnósticos | 52 errores de any y 10 de reglas de efectos de React; el resto de advertencias del lint completo procede de archivos fuera de este conjunto |
| Migraciones | Las tres se reprodujeron en orden sobre SQLite vacío en memoria; ocho tablas; foreign_key_check vacío | No se ejecutó migrate/reset/seed ni se inspeccionó el contenido de dev.db; no valida despliegue sobre datos reales |
| Reproducciones aisladas | Contrato incompatible; NaN y negativos llegan a repositorio; redondeo tolerante; tara desigual; replay duplicado; autor del payload; proyección de usuario; guarda con sesión revocada | Transporte y persistencia sustituidos; no equivalen a E2E ni a un ataque contra producción |
| Estado del repositorio | Sin modificaciones a archivos versionados durante las comprobaciones | Tres referencias ya estaban sin seguimiento: guidelines, Word y Excel |

No se ejecutó build, porque el proyecto genera artefactos de PWA en `public` y esta fase conserva el código sin modificaciones. No se ejecutó navegación con sesión real, pruebas de correo, pruebas de dispositivos offline, análisis de dependencias contra avisos externos, prueba de restauración ni revisión del despliegue. Estos resultados quedan expresamente sin verificar.

### Reproducciones y resultados concretos

- Clasificación con contrato correcto y pesos 80/20 sobre base 100: total 100, margen 0. Demuestra que la lógica puede operar con sus entradas esperadas.
- Cuerpo actual del formulario: ID indefinido llega al repositorio. El sustituto de ausencia produjo 404; respuesta real de Prisma no verificada.
- Clasificación sin campos numéricos, con ID válido y forzado: total y margen NaN llegan a create.
- Descarte −10 con resto 80/20 y forzado: total 90 llega a create.
- Clasificado 104,004 frente a base 100: margen guardado 4,00; dentroDelMargen true.
- Tara de campaña 2,00, 10 gavetas, bruto 100: neto online 80 y offline 83.
- Mismo payload offline enviado dos veces: dos llamadas create; ninguna conserva localId como identidad del servidor.
- Sesión de una cuenta y autor diferente en payload: el autor del payload llega a create.
- Detalle de pesaje con agricultor incluido: proyección solicita el usuario completo y el sustituto devuelve un hash ficticio que no se elimina.
- Guarda de listado con sesión `{ user: undefined, expires: fecha pasada }`: respuesta 200 con repositorio ficticio.

## 11. Decisiones pendientes del usuario y del cliente

Las primeras tres preguntas se enviaron durante la auditoría. Las respuestas pendientes no impiden documentar el diagnóstico, pero sí impiden fijar correctamente algunas reglas y modificaciones de datos.

| ID | Decisión | Por qué importa | Recomendación provisional |
|---|---|---|---|
| Q-01 | ¿Cada gaveta se captura individualmente? ¿La clasificación agrupa por jornada/lote/campaña o corresponde a cada registro? | Determina la unidad de datos y vínculos entre cosecha y clasificación | Conservar mediciones individuales y derivar agregados; no imponer cardinalidad hasta confirmación |
| Q-02 | ¿El rechazo se convierte en nacional, se desecha o depende del caso? ¿Se informa bruto o neto? | Determina cifras ajustadas y prevención de doble tara | Registrar rechazo por separado con unidad explícita; destino como decisión documentada |
| Q-03 | ¿Hay despliegue o datos reales? ¿El respaldo de cobro requiere kilos o también precios/importes/pagos? | Cambia estrategia de migración y alcance comercial | Preservar toda la información actual y limitar alcance inicial a kilos mientras no se confirme más |
| Q-04 | ¿Cuadre sobre cosechado? ¿Cómo participa descarte y cómo se explica 2,32 %? | Define tolerancia y tratamiento de merma | Proponer base cosechado y diferencia explícita; no incorporar el 2,32 % como regla |
| Q-05 | ¿Entregas parciales, múltiples compradores y mezcla de lotes? ¿Cómo se conoce el lote del rechazo? | Determina cardinalidad y precisión del respaldo | No repartir rechazo por lote sin evidencia |
| Q-06 | ¿Quién registra, clasifica, fuerza diferencias y corrige? ¿Hay dispositivos compartidos? | Determina permisos, auditoría y aislamiento offline | Privilegios mínimos para campo y aprobación administrativa de excepciones, a confirmar |
| Q-07 | ¿Se necesitan correcciones después de sincronizar y cómo se aprueban? | Inmutabilidad estricta puede impedir corregir errores legítimos | Corrección trazable en lugar de modificación silenciosa |
| Q-08 | ¿Cuántos usuarios/dispositivos, dónde se alojará y quién hará respaldos? ¿Debe capturarse con sesión vencida offline? | Define operación, recuperación y política de seguridad | No elegir infraestructura ni duración de captura offline sin contexto |

No es necesario consultar todas estas preguntas simultáneamente. Resolver primero Q-01 a Q-03; después Q-04 y Q-05 con un ejemplo de cosecha completo; cerrar permisos, correcciones y operación antes del diseño definitivo.

## 12. Línea de trabajo siguiente

### Etapa A Especificación validable

Integrar respuestas en una versión nueva de requisitos con vocabulario, actores, permisos, estados, fórmulas, ejemplos y criterios de aceptación. Mantener IDs existentes y mapear las ampliaciones. Revisar un escenario completo del cliente, incluyendo entrega y rechazo. No convertir vacíos de información en reglas definitivas.

**Salida:** alcance de entrega acordado, decisiones pendientes claramente acotadas y modelo funcional que pueda reproducir el ejemplo.

### Etapa B Recorrido seguro mínimo

Antes de datos reales: proyecciones sin credenciales; autorización y sesiones consistentes; catálogos legibles para campo; contratos de pesaje/clasificación validados; reglas numéricas comunes y pruebas relevantes. Corregir errores localmente sin refactorización global.

**Salida:** un trabajador puede registrar y clasificar una cosecha válida, con permisos correctos y sin divulgar información sensible.

### Etapa C Modelo y reporte del cliente

Adaptar datos mediante migraciones hacia adelante después de confirmar Q-01/Q-02/Q-05. Implementar detalle por categorías, entrega y rechazo, correcciones acordadas y reporte completo. Preservar datos actuales y definir compatibilidad con registros agregados antiguos y colas offline anteriores.

**Salida:** ejemplo del Excel reproducido con todos los kilos e indicadores; reportes completos y trazables para respaldo de entrega.

### Etapa D Captura offline fiable

Identidad estable, idempotencia, referencias entre entidades, aislamiento por cuenta, datos disponibles offline, errores parciales visibles, reintentos y política de cierre. Probar el recorrido en una versión de producción aislada de datos reales.

**Salida:** desconectar, registrar, recargar, reconectar y repetir envíos no pierde ni duplica información.

### Etapa E Aceptación y operación

Pruebas de los recorridos críticos, lint/typecheck/build, migraciones con copia de datos representativos, restauración de respaldo, instrucciones de uso y observabilidad. Validar con el administrador y un trabajador sobre dispositivos de campo.

**Salida:** evidencia de aceptación funcional y técnica, procedimiento de recuperación probado y riesgos residuales conocidos.

## 13. Corrección de conclusiones anteriores

`REPORTE_DE_TRAZABILIDAD.md` afirma cumplimiento del 100 %, ausencia de brechas y cierre de riesgos. Esas afirmaciones no se sostienen frente a los recorridos y datos examinados. Entre sus referencias aparece `lib/services/clasificacion.service.ts`, que no existe; además atribuye garantías de sincronización, detalle de categorías y revocación que el código no proporciona de extremo a extremo.

Este informe aporta evidencia nueva sin sobrescribir aquella documentación. En la fase de actualización documental deben retirarse conclusiones de cobertura no verificadas y sustituirse por una matriz vinculada a criterios y pruebas ejecutadas.

La base del proyecto permite una evolución progresiva. La prioridad es completar y proteger el proceso del cliente antes de dedicar esfuerzo a estética, abstracciones adicionales o sustitución de tecnologías.
