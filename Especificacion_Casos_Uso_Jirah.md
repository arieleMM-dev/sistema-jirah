## **UNIVERSIDAD DE LAS FUERZAS ARMADAS "ESPE"** 

Departamento de Ciencias de la Computación Ingeniería de Software 

## **Documento de Especificación de Requisitos y Casos de Uso** 

_Sistema de Gestión Agrícola - Proyecto Jirah_ 

**Asignatura:** Ingeniería de Requisitos de Software **Proyecto:** Control, Gestión y Trazabilidad de Cosechas de Finca Jirah **Autor:** Ariel Esteban Morillo Mosquera **Finca de Aplicación:** Finca Jirah (Pitahaya Amarilla) 

## **Lista Maestra de Requisitos Funcionales y Casos de Uso** 

Proyecto Jirah - Sistema de Gestión Agrícola 

1 

## **REQ-01 / CU-01: Acceder al sistema** 

- REQ-01.1 / CU-01.1: Iniciar sesión 

- REQ-01.2 / CU-01.2: Recuperar contraseña 

## **REQ-02 / CU-02: Configurar perfil de usuario** 

- REQ-02.1 / CU-02.1: Actualizar datos 

- REQ-02.2 / CU-02.2: Modificar contraseña 

- REQ-02.3 / CU-02.3: Modificar preferencias de usuario 

## **REQ-03 / CU-03: Gestionar agricultores** 

- REQ-03.1 / CU-03.1: Crear agricultor 

- REQ-03.2 / CU-03.2: Consultar de agricultor 

- REQ-03.3 / CU-03.3: Editar de agricultor 

- REQ-03.4 / CU-03.4: Desactivar agricultor 

## **REQ-04 / CU-04: Configurar catálogos de la finca** 

- REQ-04.1 / CU-04.1: Gestionar campañas (Código, Funda, Tara base de 1.70kg) 

- REQ-04.2 / CU-04.2: Gestionar lotes (Mantenimiento de áreas de cultivo) 

- REQ-04.3 / CU-04.3: Gestionar compradores (Mantenimiento de exportadores y mayoristas) 

## **REQ-05 / CU-05: Registrar transacciones en campo (Core del Negocio)** 

- REQ-05.1 / CU-05.1: Registrar pesaje bruto (Cosecha cruda por lote) 

- REQ-05.2 / CU-05.2: Registrar clasificación poscosecha (Modelado de mermas y categorías) 

- REQ-05.3 / CU-05.3: Registrar ajuste de comprador (Trazabilidad de rechazos en destino) 

- REQ-05.4 / CU-05.4: Sincronizar datos offline (Estrategia PWA - IndexedDB a PostgreSQL) 

## **REQ-06 / CU-06: Analizar productividad** 

- REQ-06.1 / CU-06.1: Visualizar dashboard interactivo 

   - REQ-06.1.1 / CU-06.1.1: Filtrar métricas por rango de fechas <<extend>> 

   - REQ-06.1.2 / CU-06.1.2: Filtrar métricas por lote <<extend>> 

   - REQ-06.1.3 / CU-06.1.3: Filtrar métricas por campaña/funda <<extend>> 

   - REQ-06.1.4 / CU-06.1.4: Generar reporte exportable (PDF/Excel) <<extend>> 

Proyecto Jirah - Sistema de Gestión Agrícola 

2 

## **Módulo 1: Acceso al Sistema** 

## **1.1 Diagrama de Casos de Uso (Estructura de Bloques)** 

## **1.2 Especificación Nivel 0** 

**Código y Nombre** CU-01: Acceder al sistema **Requisito** REQ-01 **Actor(es)** Administrador, Agricultor 

**Descripción** Permite a los usuarios registrados autenticarse de manera segura para acceder a las funcionalidades del sistema según su nivel de privilegios, e incluye el mecanismo de recuperación en caso de pérdida de credenciales. 

Proyecto Jirah - Sistema de Gestión Agrícola 

3 

**1.3 Especificaciones de Nivel 1** 

|||
|---|---|
|**Código y Nombre**|CU-01.1: Iniciar sesión|
|||
|**Requisito**|REQ-01.1|
|||
|Actor|Administrador, Agricultor|
|||
|**Precondición**|El usuario posee una cuenta registrada y activa.|
|||
|**Flujo Normal**|1. El usuario ingresa a la pantalla principal de login.<br>2. El sistema solicita el correo electrónico y la contraseña.<br>3. El usuario ingresa sus credenciales y presiona "Ingresar".<br>4. El sistema cifra la contraseña ingresada y la compara con el hash de la<br>base de datos.<br>5. El sistema verifica que el estado de la cuenta sea "Activo".<br>6. El sistema genera el token de sesión y redirige al usuario a la pantalla<br>correspondiente a su rol (Dashboard para Admin, Pantalla de Recolección<br>para Agricultor).|
|||
|**Excepciones**|**E.1 Credenciales inválidas (Paso 4): El sistema muestra el mensaje****_"Correo o_**<br>**_contraseña incorrectos"_ y limpia el campo de la contraseña. No se especifica**<br>**cuál de los dos datos falló por seguridad.**<br>**E.2 Cuenta inactiva (Paso 5): El sistema bloquea el acceso y muestra el**<br>**mensaje****_"Su cuenta se encuentra desactivada. Comuníquese con el_**<br>**_administrador de la finca"_. **|
|||
|**Código y Nombre**|CU-01.2: Recuperar contraseña|
|||
|**Requisito**|REQ-01.2|
|||
|Actor|Usuario|



Proyecto Jirah - Sistema de Gestión Agrícola 

4 

|||
|---|---|
|**Precondición**|El usuario se encuentra fuera de la sesión y dispone de un correo electrónico<br>válido registrado.|
|||
|**Flujo Normal**|1. El usuario selecciona la opción "¿Olvidó su contraseña?" en la pantalla de<br>login.<br>2. El sistema solicita el correo electrónico asociado a la cuenta.<br>3. El usuario ingresa el correo y presiona "Enviar enlace".<br>4. El sistema valida la existencia del correo, genera un token temporal<br>encriptado (válido por 1 hora) y envía el enlace de recuperación.<br>5. El usuario accede al enlace recibido en su correo.<br>6. El sistema muestra la pantalla de restablecimiento solicitando la nueva<br>contraseña y su confirmación.<br>7. El usuario ingresa la nueva contraseña.<br>8. El sistema valida las políticas de complejidad y actualiza la credencial.<br>9. El sistema muestra_"Contraseña actualizada exitosamente"_y redirige al<br>login.|
|||
|**Excepciones**|**E.1 Cuenta Inexistente:**Si el correo no existe, el sistema muestra el mensaje<br>estándar:_"Si el correo es válido, recibirá un enlace de recuperación"_para evitar<br>filtraciones de cuentas.<br>**E.2 Token Caducado:**Si el usuario ingresa pasado el tiempo límite, el sistema<br>indica:_"El enlace de recuperación ha expirado"_.|



Proyecto Jirah - Sistema de Gestión Agrícola 

5 

## **Módulo 2: Configurar Perfil** 

## **2.1 Diagrama de Casos de Uso (Estructura de Bloques)** 

## **2.2 Especificación Nivel 0** 

**Código y Nombre** CU-02: Configurar perfil de usuario **Requisito** REQ-02 **Actor(es)** Administrador o Agricultor **Descripción** Permite al usuario activo autogestionar su información de contacto variable (teléfono, fotografía), actualizar sus claves de acceso y parametrizar las preferencias estéticas de la PWA. 

Proyecto Jirah - Sistema de Gestión Agrícola 

6 

## **2.3 Especificaciones de Nivel 1** 

|||
|---|---|
|**Código y Nombre**|CU-02.1: Actualizar datos|
|||
|**Requisito**|REQ-02.1|
|||
|**Flujo Normal**|1.<br>El usuario se dirige a "Mi Perfil".<br>2.<br>El sistema muestra los datos mutables (Teléfono y Avatar/Foto). Los datos<br>estructurales como cédula, rol y nombres aparecen bloqueados en modo lectura.<br>3.<br>El usuario carga una foto o edita el teléfono y presiona "Guardar".<br>4.<br>El sistema valida el formato de imagen (PNG/JPG < 2MB) y formato<br>numérico del teléfono.<br>5.<br>El sistema guarda los cambios y refresca la interfaz gráfica.|
|||
|**Excepciones**|**E.1 Archivo Inválido:**Si el archivo no es una imagen o supera el peso permitido,<br>se arroja el error:_"Formato de archivo no soportado o tamaño excedido"_.|
|||
|**Código y Nombre**|CU-02.2: Modificar contraseña|
|||
|**Requisito**|REQ-02.2|
|||
|**Flujo Normal**|1.<br>El usuario selecciona "Cambiar Contraseña" dentro de su perfil.<br>2.<br>El sistema solicita la clave actual, la nueva clave y su re-confirmación.<br>3.<br>El usuario llena los campos y confirma.<br>4.<br>El sistema valida que la contraseña actual sea idéntica al hash persistido.<br>5.<br>El sistema evalúa la robustez de la nueva clave (mínimo 8 caracteres, 1<br>mayúscula, 1 número).<br>6. El sistema guarda los cambios de la nueva contraseña.|
|||
|**Excepciones**|**E.1 Contraseña Actual Errónea:**El sistema cancela el proceso mostrando:_"La_<br>_contraseña actual provista es incorrecta"_.|
|||
|**Código y Nombre**|CU-02.3: Modificar preferencias|
|||
|**Requisito**|REQ-02.3|



Proyecto Jirah - Sistema de Gestión Agrícola 

7 

## **Flujo Normal** 

1. El usuario interactúa con el selector de apariencia (Tema Claro / Tema Oscuro). 2. El sistema altera la apariencia de la interfaz. 

3. El sistema guarda  la variable en `localStorage` y envía una petición en segundo plano para sincronizar la preferencia en la tabla de usuarios. 

**Excepciones** 

**E.1 Sin Internet:** Si ocurre en desconexión, la configuración se mantiene en el almacenamiento local (`localStorage`) y se omite la llamada al servidor de forma transparente. 

## **Módulo 3: Gestión de Personal (Expedientes)** 

## **3.1 Diagrama de Casos de Uso (Estructura de Bloques)** 

## **3.2 Especificación Nivel 0** 

**Código y Nombre** CU-03: Gestionar agricultores **Requisito** REQ-03 **Actor(es)** Administrador 

Proyecto Jirah - Sistema de Gestión Agrícola 

8 

|||
|---|---|
|**Descripción**|Módulo exclusivo de gestión de recursos humanos que permite estructurar la ficha<br>contractual inalterable de los trabajadores (Cédula, Nombres, Apellidos, Rol de<br>Campo).|
|**3.3 Especificaciones de Nivel 1**||
|||
|||
|**Código y Nombre**|CU-03.1: Crear agricultor|
|||
|**Requisito**|REQ-03.1|
|||
|**Actor**|Administrador|
|||
|Precondición|El administrador ha iniciado sesión con nivel de privilegios admin|
|||
|**Flujo Normal**|1. El administrador ingresa al módulo de "Personal" y hace clic en "Nuevo<br>Registro".<br>2. El sistema muestra un formulario en blanco solicitando: Nombres,<br>Apellidos, Cédula de Identidad (10 dígitos), Correo y Rol<br>(Agricultor/Clasificador).<br>3. El administrador ingresa la información y presiona "Guardar".<br>4. El sistema valida que la cédula cumpla el algoritmo de verificación y no<br>exista duplicidad de cédula o correo en la base de datos.<br>5. El sistema genera automáticamente una contraseña temporal<br>alfanumérica.<br>6. El sistema crea el usuario y envía la credencial por correo electrónico.<br>7. El sistema muestra el mensaje_"Agricultor creado exitosamente"_.|
|||
|**Excepciones**|**E.1 Cédula Inválida o Duplicada:**El sistema frena el almacenamiento arrojando<br>el error:_"Documento de identidad no válido o ya registrado en la finca"_.|
|||
|**Código y Nombre**|CU-03.2: Consultar agricultor|
|||
|**Requisito**|REQ-03.2|



Proyecto Jirah - Sistema de Gestión Agrícola 

9 

|||
|---|---|
|||
|**Actor**|Administrador|
|||
|Precondición|Existen registros de agricultores en la base de datos.|
|||
|**Flujo Normal**|1. El administrador accede al módulo de Personal.<br>2. El sistema muestra una barra de búsqueda dinámica.<br>3. El administrador digita el nombre, apellido o cédula del trabajador.<br>4. El sistema filtra en tiempo real mostrando las coincidencias en una<br>tabla (Listado en $<1$ segundo).<br>5. El administrador selecciona la fila deseada.<br>6. El sistema despliega el expediente completo con el estado de la<br>cuenta, datos fijos y último acceso.|
|||
|Excepciones (Flujo<br>Alternatvo)|E.1 Sin resultados (Paso 4): Si la búsqueda no coincide, el sistema muestra la tabla<br>vacía con el texto "No se encontraron agricultores con ese criterio".|
|||
|**Código y Nombre**|CU-03.3: Editar agricultor|
|||
|**Requisito**|REQ-03.3|
|||
|Actor|Administrador de la Finca|
|||
|Precondición|El administrador ha ejecutado previamente el CU-03.2 y localizado al empleado.|



Proyecto Jirah - Sistema de Gestión Agrícola 

10 

|||
|---|---|
|**Flujo Normal**|1. En la vista del expediente, el administrador hace clic en "Editar Datos".<br>2. El sistema habilita los campos de texto para Nombres, Apellidos y<br>Correo._Nota: El campo Cédula y Contraseña permanecen estrictamente_<br>_bloqueados._<br>3. El administrador corrige el error tipográfico y presiona "Actualizar".<br>4. El sistema valida los formatos y verifica que el nuevo correo no<br>pertenezca a otro usuario.<br>5. El sistema guarda la actualización (Transacción ACID).<br>6. Muestra el mensaje:_"Expediente actualizado"_.|
|||
|**Excepciones (Flujo**<br>**Alternativo)**|**E.1 Correo en uso (Paso 4):**El sistema rechaza la edición y notifica_"El correo_<br>_especificado ya pertenece a otra cuenta activa"_.|



## **Código y Nombre** 

CU-03.4 Desactivar agricultor 

**Requisito** 

REQ-03.4 

**Actor** 

Administrador 

Precondición 

El agricultor existe y está en estado activo. 

Proyecto Jirah - Sistema de Gestión Agrícola 

11 

|||
|---|---|
|**Flujo Normal**|1. En la vista del expediente, el administrador hace clic en el botón de<br>peligro "Desactivar Cuenta".<br>2. El sistema despliega un modal advirtiendo:_"¿Está seguro? Este_<br>_usuario no podrá acceder al sistema, pero su historial de cosechas se_<br>_mantendrá intacto"_.<br>3. El administrador confirma la acción.<br>4. El sistema ejecuta un_Soft-Delete_(cambia la bandera`isActive`a<br>falso en la base de datos).<br>5. El sistema revoca inmediatamente los tokens de sesión del<br>agricultor.<br>6. Semuestra el mensaje: _"Cuenta desactivada exitosamente"_.|
|||
|Excepciones (Flujo<br>Alternatvo)|E.1 Auto-desactvación (Paso 3): Si el administrador intenta realizar esta<br>acción sobre su propia cuenta, el sistema bloquea el fujo mostrando<br>"Operación denegada. No puede desactvar su propia sesión".|



Proyecto Jirah - Sistema de Gestión Agrícola 

12 

Proyecto Jirah - Sistema de Gestión Agrícola 

13 

Módulo 4: Configuración de Catálogos 

## **4.1 Diagrama de Casos de Uso (Estructura de Bloques)** 

## **4.2 Especificación Nivel 0** 

**Código y Nombre** CU-04: Configurar catálogos **Requisito** REQ-04 

**Actor(es)** Administrador de la Finca **Descripción** 

Módulo de parametrización del negocio encargado de gestionar las tablas maestras de control que nutren las interfaces dinámicas de campo (Lotes físicos, Campañas de cultivo y Clientes exportadores). 

Proyecto Jirah - Sistema de Gestión Agrícola 

14 

## **4.3 Maestros)** 

## **Especificaciones de Nivel 1 (CRUDs** 

|||
|---|---|
|**Código y Nombre**|CU-04.1: Gestionar campañas|
|||
|**Requisito**|REQ-04.1|
|||
|**Actor**|Administrador de la Finca|
|||
|Precondición|El administrador ha iniciado sesión con nivel de privilegios ADMIN.|
|||
|Descripción|Permite crear y confgurar los ciclos de cosecha (campañas), estableciendo el<br>código identfcador, el color de la funda protectora, el comprador de destno y el<br>peso estándar de la tara de la gaveta.|
|||
|**Código y Nombre**|CU-04.2: Gestionar lotes|
|||
|**Requisito**|REQ-04.2|
|||
|**Actor**|Administrador de la Finca|
|||
|**Precondición**|El administrador ha iniciado sesión con nivel de privilegios ADMIN.|
|||
|Descripción|Permite el mantenimiento del catálogo de áreas fsicas de cultvo, fundamental<br>para la trazabilidad de origen de cada cosecha registrada en campo.|
|||
|**Código y Nombre**|CU-04.3: Gestionar compradores|



Proyecto Jirah - Sistema de Gestión Agrícola 

15 

|||
|---|---|
|**Requisito**|REQ-04.3|
|||
|Actor|Administrador de la Finca|
|||
|Precondición|El administrador ha iniciado sesión con nivel de privilegios ADMIN.|
|||
|Descripción|1.<br>Permite administrar el directorio comercial de exportadores y mayoristas,<br>incluyendo la confguración de perfles de tolerancia de merma específcos para<br>cada cliente.|



## **4.3 Especificaciones de Nivel 2(CRUDs desglosados).** 

**[REQ-04.1] CU-04.01: Gestionar Campañas** 

|**Código**<br>**Nivel 2**|**Acción (Flujo Normal)**|**Excepciones (Flujos**<br>**Alternativos)**|
|---|---|---|
|**CU-04.1.1**<br>Registrar<br>Campaña|1. El actor selecciona<br>"Nueva Campaña".<br>2. El sistema solicita:<br>Código (Ej. 102024),<br>Color de Funda y<br>Comprador asignado.<br>3. El sistema precarga el<br>campo "Peso de Tara<br>(kg)" con el valor por<br>defecto: 1.70.<br>4. El actor guarda los<br>datos.<br>5. El sistema registra la<br>campaña como "Activa".|**E.1 Código duplicado:**El<br>sistema detecta que el código<br>ya pertenece a un ciclo<br>anterior. Muestra error:_"El_<br>_código de campaña ingresado_<br>_ya existe. Ingrese un_<br>_identificador único."_|



Proyecto Jirah - Sistema de Gestión Agrícola 

16 

|||||
|---|---|---|---|
|**Código**<br>**Nivel 2**|**Acción (Flujo Normal)**||**Excepciones (Flujos**<br>**Alternativos)**|
|**CU-04.1.2**<br>Consultar<br>Campaña|1. El actor ingresa al<br>submódulo "Campañas".<br>2. El sistema recupera de<br>la base de datos (vía<br>Prisma) y despliega el<br>historial completo de<br>campañas, ordenadas de<br>la más reciente a la más<br>antigua.||**E.1 Paginación vacía:**Si es la<br>primera vez que se usa el<br>sistema, muestra:_"No existen_<br>_campañas registradas."_|
|**CU-04.1.3**<br>Editar<br>Campaña|1. El actor selecciona una<br>campaña "Activa" y elige<br>"Editar".<br>2. El sistema precarga los<br>datos actuales.<br>3. El actor modifica<br>valores permitidos (ej.<br>cambia el comprador o<br>ajusta la tara) y guarda.<br>4. El sistema actualiza el<br>registro.||**E.1 Edición Bloqueada:**Si la<br>campaña ya tiene<br>transacciones de pesaje<br>registradas y sincronizadas, el<br>sistema bloquea la edición del<br>campo "Peso de Tara" para<br>evitar descuadres contables<br>históricos.|
|**CU-04.1.4**<br>Cerrar<br>Campaña<br>(Inactivar)|1. El actor selecciona una<br>campaña "Activa" y elige<br>"Cerrar/Finalizar".<br>2. El sistema pide<br>confirmación advirtiendo<br>que ya no se podrán<br>registrar más pesajes con<br>este código.||**E.1 Sincronización**<br>**Pendiente:**El sistema detecta<br>que hay dispositivos de campo<br>con pesajes de esta campaña<br>aún no sincronizados en<br>PostgreSQL. Muestra<br>advertencia:_"No se puede_<br>_cerrar la campaña. Existen_|



Proyecto Jirah - Sistema de Gestión Agrícola 

17 

|**Código**<br>**Nivel 2**|**Acción (Flujo Normal)**|**Excepciones (Flujos**<br>**Alternativos)**|
|---|---|---|
||3. El sistema cambia el<br>estado de la campaña a<br>"Cerrada" (Borrado<br>Lógico / Inactivo).|_transacciones pendientes de_<br>_sincronización."_|



**[REQ-04.2] CU-04.02: Gestionar Lotes** 

|**Código**<br>**Nivel 2**|**Acción (Flujo Normal)**|**Excepciones (Flujos**<br>**Alternativos)**|
|---|---|---|
|**CU-04.2.1**<br>Registrar<br>Lote|1. El actor selecciona "Nuevo<br>Lote".<br>2. El sistema solicita:<br>Nombre/Número del Lote,<br>Hectáreas, y Variedad de<br>Cultivo (ej. Pitahaya Amarilla).<br>3. El actor guarda los datos.<br>4. El sistema guarda y<br>muestra éxito.|**E.1 Nombre Duplicado:**El<br>sistema detecta que el<br>identificador del lote ya<br>existe. Muestra error:_"El_<br>_lote ingresado ya se_<br>_encuentra registrado."_|
|**CU-04.2.2**<br>Consultar<br>Lote|1. El actor ingresa al<br>submódulo "Lotes".<br>2. El sistema recupera de la<br>base de datos y despliega el<br>listado de todos los lotes<br>configurados, mostrando su<br>estado (Activo/Inactivo).|**E.1 Tabla Vacía:**Si no hay<br>lotes, el sistema muestra el<br>mensaje:_"No existen lotes_<br>_registrados. Comience_<br>_creando uno nuevo."_|
|**CU-04.2.3**<br>Editar<br>Lote|1. El actor selecciona un lote<br>de la lista y elige "Editar".<br>2. El sistema precarga los<br>datos actuales.|**E.1 Lote Protegido:**(Si<br>aplica) No se permite<br>modificar el identificador<br>principal si el lote ya tiene<br>cosechas históricas<br>asociadas.|



Proyecto Jirah - Sistema de Gestión Agrícola 

18 

|||||
|---|---|---|---|
|**Código**<br>**Nivel 2**|**Acción (Flujo Normal)**<br>3. El actor modifica los<br>valores (ej. actualiza las<br>hectáreas) y guarda.<br>4. El sistema actualiza el<br>registro.<br>1. El actor selecciona un lote<br>y elige Eliminar lote.<br>2. El sistema pide<br>confirmación.<br>3. El sistema cambia el<br>estado a Inactivo (Borrado<br>Lógico) para preservar el<br>historial de cosechas<br>pasadas.||**Excepciones (Flujos**<br>**Alternativos)**|
|||||
|**CU-04.2.4**<br>Eliminar<br>Lote|||**E.1 Lote en Uso:**Si hay<br>una campaña activa<br>operando sobre ese lote, el<br>sistema advierte que no se<br>puede inactivar hasta cerrar<br>el ciclo.|



**[REQ-04.3] CU-04.03: Gestionar compradores** 

|**Código**<br>**Nivel 2**|**Acción (Flujo Normal)**|**Excepciones (Flujos**<br>**Alternativos)**<br>**E.1 RUC Duplicado:**El<br>sistema detecta que la<br>identificación fiscal ya<br>existe. Muestra error:_"El_<br>_comprador ya se encuentra_<br>_en el directorio."_|
|---|---|---|
|**CU-04.3.1**<br>Registrar<br>Comprador|1. El actor selecciona<br>"Nuevo Comprador".<br>2. El sistema solicita:<br>RUC/Identificación, Razón<br>Social, Contacto, y Perfil de<br>Tolerancia (Estandar ±4% u<br>otro).<br>3. El actor guarda los datos.<br>4. El sistema registra al<br>cliente.||



Proyecto Jirah - Sistema de Gestión Agrícola 

19 

|**Código**<br>**Nivel 2**|**Acción (Flujo Normal)**|**Excepciones (Flujos**<br>**Alternativos)**|
|---|---|---|
|**CU-04.3.2**<br>Consultar<br>Comprador|1. El actor ingresa al<br>submódulo "Compradores".<br>2. El sistema despliega el<br>listado del directorio<br>comercial.|**E.1 Error de Conexión:**Si<br>el sistema no puede<br>recuperar la lista, muestra<br>una alerta genérica de<br>reintento.|
|**CU-04.3.3**<br>Editar<br>Comprador|1. El actor selecciona un<br>cliente y elige "Editar".<br>2. El sistema precarga los<br>datos comerciales actuales.<br>3. El actor modifica la<br>información (ej. actualiza el<br>contacto o cambia el perfil<br>de tolerancia) y guarda.|**E.1 Datos Incompletos:**El<br>actor deja vacío el campo<br>obligatorio de Razón<br>Social. El sistema bloquea<br>el guardado y resalta el<br>campo.|
|**CU-04.3.4**<br>Eliminar<br>Comprador|1. El actor selecciona un<br>comprador y elige "Eliminar".<br>2. El sistema pide<br>confirmación de la acción.<br>3. El sistema aplica un<br>borrado lógico, ocultándolo<br>de los menús desplegables<br>para futuras campañas.|**N/A**(El borrado lógico no<br>genera conflictos de<br>integridad referencial con<br>las ventas pasadas).|



Proyecto Jirah - Sistema de Gestión Agrícola 

20 

## **Módulo 5: Transacciones en Campo (Core del Negocio)** 

## **5.1 Diagrama de Casos de Uso (Estructura de Bloques)** 

## **5.2 Especificación Nivel 0** 

Proyecto Jirah - Sistema de Gestión Agrícola 

21 

|||
|---|---|
|**Código y Nombre**|CU-05: Registrar transacciones en campo|
|||
|**Requisito**|REQ-05|
|||
|**Actor(es)**|Agricultor , Administrador|
|||
|**Descripción**|Representa el núcleo operativo de la finca. Permite registrar la cosecha inicial en<br>bruto, su posterior desglose en categorías de exportación/nacional (aplicando<br>reglas matemáticas de tara y tolerancia de descuadre) y los ajustes finales del<br>comprador, con soporte para operaciones sin conexión a internet.|



Proyecto Jirah - Sistema de Gestión Agrícola 

22 

**5.3 Especificaciones de Nivel 1** 

|||
|---|---|
|**Código y Nombre**|CU-05.1: Registrar pesaje bruto (Cosecha)|
|||
|**Requisito**|REQ-05.1|
|||
|**Precondición**|Existen campañas y lotes configurados en el sistema.|
|||
|Actor|Agricultor|
|||
|**Flujo Normal**|1. El usuario accede al módulo "Nueva Cosecha".<br>2. El sistema despliega un formulario solicitando seleccionar: Campaña<br>actual y Lote.<br>3. El usuario ingresa la Cantidad Total de Gavetas recolectadas y el Peso<br>Bruto Total (marcado por la báscula).<br>4. El usuario presiona "Registrar Cosecha".<br>5. El sistema recupera el valor de la tara de la gaveta (1.70 kg) asociado a la<br>campaña seleccionada.<br>6. El sistema calcula internamente el Peso Neto Base de la cosecha usando<br>la fórmula:`Peso_Bruto - (Cantidad_Gavetas * Tara)`.<br>7. El sistema almacena la transacción generando un UUID único.<br>8. El sistema muestra:_"Cosecha registrada exitosamente"_.|
|||
|**Excepciones**|**E.1 Sin conexión de red (Paso 7): El sistema detecta ausencia de internet,**<br>**guarda el registro en IndexedDB localmente con estado PENDING y notifica:**<br>**_"Cosecha guardada localmente. Se sincronizará al detectar red"_.**|



Proyecto Jirah - Sistema de Gestión Agrícola 

23 

|||
|---|---|
|**Código y Nombre**|CU-05.3: Registrar ajuste de comprador|
|||
|**Requisito**|REQ-05.3|
|||
|Actor|Administrador / Agricultor|
|||
|**Precondición**|La clasificación del lote ha sido guardada y despachada al exportador<br>correspondiente.|
|||
|**Flujo Normal**|1. El usuario localiza la cosecha enviada en el historial.<br>2. Selecciona "Ingresar reporte de comprador".<br>3. El sistema solicita el peso exacto (en kg) rechazado por el comprador en<br>destino.<br>4. El usuario ingresa el valor y guarda.<br>5. El sistema recalcula automáticamente el Porcentaje de Fruta Efectiva,<br>descontando el rechazo del total de exportación inicial.<br>6. El sistema actualiza las métricas históricas de ese lote.|



Proyecto Jirah - Sistema de Gestión Agrícola 

24 

|||
|---|---|
|**Código y Nombre**|CU-05.2: Registrar clasificación poscosecha|
|||
|Excepciones (Flujo<br>~~Alternatvo)~~<br>**Requisito**|E.1 Rechazo excede exportación (Paso 5): El sistema valida que los kilos<br>rechazados no sean matemátcamente superiores a los kilos enviados. Si ocurre,<br>REQ-05.2|
||<br>blouea el reistro mostrando: "Error: El rechazo no uede ser maor al volumen|
|Actor|q  g      p  y<br>despachado".<br>Agricultor|
|||
|**Precondición**|Existe un registro previo de "Pesaje Bruto" para el lote en esa jornada.|
|||
|~~**Fl Nl**~~|~~" "~~|
|~~**ujo orma**~~|~~1. El usuario ingresa a Clasificar Producción y selecciona la~~<br>cosecha pendiente del día.<br>2. El sistema despliega la matriz de clasificación.<br>3. El usuario ingresa la Cantidad de Gavetas y el Peso Bruto para<br>**Exportación**(G: >=ge280g$, P: 180g-279g).<br>4. El usuario ingresa la Cantidad de Gavetas y el Peso Bruto para<br>**Nacional**(N1, N2, N3).<br>5. El usuario hace clic en "Calcular y Verificar".<br>6. El sistema calcula el Peso Neto de cada categoría restando la tara<br>correspondiente al número de gavetas ingresadas por categoría.<br>7. El sistema suma el total del Peso Neto Clasificado y lo compara<br>contra el Peso Neto Base (Registrado en CU-05.1).<br>8. El sistema valida que la diferencia porcentual entre ambos pesos<br>se encuentre dentro del rango de tolerancia del +- 4\%$.<br>9. El sistema muestra el % de exportación real y aprueba el cuadre.<br>10. El usuario presiona "Guardar Clasificación".|
|||
|**Excepciones**|**E.1 Descuadre fuera de límite (Paso 8): Si la diferencia es mayor al $\pm**<br>**4\%$, el sistema detiene el flujo normal, colorea el indicador en rojo y**<br>**muestra:****_"Alerta: El margen de error ($X\%$) supera el límite permitido._**<br>**_Verifique los pesos"_. El sistema requiere una confirmación forzada para**<br>**guardar y levanta una bandera de auditoría para el administrador.**|



Proyecto Jirah - Sistema de Gestión Agrícola 

25 

Proyecto Jirah - Sistema de Gestión Agrícola 

26 

||**Código y Nombre**|CU-05.4: Sincronizar datos offline||
|---|---|---|---|
|||||
||**Requisito**|REQ-05.4||
|||||



|||||
|---|---|---|---|
||**Código y Nombre**||CU-05.4: Sincronizar datos offline|
|||||
||**Requisito**||REQ-05.4|
|||||
|Actor||Sistema/ Agricultor (Manual)||
|||||
|**Precondición**||El dispositivo tiene registros en estado PENDING en su base de datos local y ha<br>recuperado la conexión a Internet.||
|||||
|**Flujo Normal**||1. El módulo_Service Worker_del sistema detecta el evento de restauración<br>de red (`navigator.onLine === true`).<br>2. El sistema recupera todos los registros transaccionales en estado`PENDING`<br>almacenados en`IndexedDB`.<br>3. El sistema empaqueta las transacciones y las envía mediante una petición<br>asíncrona a la API del servidor.<br>4. El servidor (PostgreSQL) valida los UUIDs para evitar duplicidad y<br>almacena la información.<br>5. El servidor responde con un código HTTP 200 (Éxito).<br>6. El sistema local cambia el estado de los registros de`PENDING`a`SYNCED`y<br>los elimina de la cola.<br>7. La interfaz muestra un indicador verde sutil:_"Sincronización_<br>_completada"_.||
|||||
|Excepciones (Flujo<br>Alternatvo)||E.1 Falla de Servidor (Paso 5): Si el servidor rechaza la conexión o arroja error 500,<br>el sistema mantene los datos en PENDING y reintenta la sincronización utlizando<br>un algoritmo de backof exponencial (ej. reintenta en 1 min, luego en 5 min, etc.).||



Proyecto Jirah - Sistema de Gestión Agrícola 

27 

## **Módulo 6: Análisis de Productividad** 

## **6.1 Diagrama de Casos de Uso (Estructura de Bloques)** 

## **6.2 Especificación Nivel 0** 

Proyecto Jirah - Sistema de Gestión Agrícola 

28 

## **6.3 Especificaciones de Nivel 1 y Nivel 2 (Módulo de Dashboard)** 

|||
|---|---|
|**Código y Nombre**|CU-06.1: Visualizar dashboard|
|||
|**Requisito**|REQ-06.1|
|||
|Actor|Administrador|
|||
|**Precondición**|Existen transacciones históricas de cosechas sincronizadas .|
|||
|**Flujo Normal**|1.<br>El administrador ingresa al panel principal de analíticas.<br>2.<br>El sistema procesa los gráficos dinámicos de producción agregada y<br>curvas de rendimiento.<br>3.<br>El administrador aplica filtros avanzados en la parte superior para aislar<br>variables estratégicas de productividad:<br>-<br>**CU-06.1.1 <<extend>>:**Filtrar por Rango de Fechas.<br>-<br>**CU-06.1.2 <<extend>>:**Filtrar por Lote Físico (permite evaluar<br>estadísticamente qué plantas tienen mejor rendimiento según su edad).     -<br>**CU-06.1.3 <<extend>>:**Filtrar por Campaña / Código / Color de Funda<br>(permite auditar si el color de funda incidió en proteger mejor la fruta de manchas<br>y daños mecánicos).<br>4.<br>El sistema recalcula y refresca los gráficos en pantalla.<br>5.<br>El administrador interactúa con el botón "Exportar Resultados"<br>**<<extend>> (CU-06.1.4)**.<br>6.<br>El sistema genera un reporte compilado con los filtros aplicados listo para<br>imprimir o enviar en formato pdf y excel|
|||
|**Excepciones**|**E.1 Filtro sin datos (Paso 4): Si la combinación de filtros no arroja ningún**<br>**resultado (Ej. Lote 2 en el año 2020), el sistema muestra las gráficas vacías**<br>**con el texto: "No existen registros de cosecha para los parámetros**<br>**seleccionados".**|



Proyecto Jirah - Sistema de Gestión Agrícola 

29 

