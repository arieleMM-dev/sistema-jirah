# PLAN DE PRUEBAS DE CALIDAD (QA) - Finca Jirah

## 1. Resumen Ejecutivo y Alcance
Este documento establece la estrategia y el diseño de pruebas unitarias y de integración para el backend y lógica de negocio del proyecto "Finca Jirah", una aplicación agrícola PWA Offline-First.

**Alcance de las pruebas:**
- Lógica de Negocio (`lib/services`): `AgricultorService`, `AuthService`, `PesajeService`, `ClasificacionService`.
- Lógica de Sincronización y Patrones de Diseño (`lib/adapters`, `lib/state`, `lib/observers`, `lib/services/calculo`): `OfflinePayloadAdapter`, `SyncState`, `SyncObserver`, `CalculadoraCosecha`.
- Reglas de dominio puras (Cálculo de mermas, validación de cédulas, encriptación).

**Fuera de alcance:**
- UI/Componentes de React y hooks de presentación.
- Pruebas E2E (End-to-End) en navegador.

## 2. Entorno y Herramientas
- **Framework de Pruebas:** **Vitest** (Recomendado por su integración nativa con arquitecturas modernas basadas en Vite/Next.js y TypeScript).
- **Aserciones y Espías:** API integrada de Vitest (compatible con Jest).
- **Mocking de Base de Datos:** **`vitest-mock-extended`** para generar un Mock estricto y seguro de tipos (Type-safe) del `PrismaClient`. No se realizarán conexiones a bases de datos reales (SQLite o PostgreSQL) durante las pruebas unitarias.
- **Cobertura de Código:** Instambul (v8) integrado en Vitest, apuntando a un mínimo de 85% de cobertura en ramas críticas (`lib/services`).

## 3. Matriz de Trazabilidad

| Módulo | Descripción | ID Requisito | Clases Asociadas | Estado Cobertura |
|---|---|---|---|---|
| Acceso | Autenticación y Recuperación | CU-01 | `AuthService` | Pendiente |
| Perfil | Configuración de Usuario | CU-02 | `PerfilService` (por implem.) | Pendiente |
| Agricultores | Gestión del Padrón de Trabajadores | CU-03 | `AgricultorService` | Pendiente |
| Catálogos | Campañas, Lotes, Compradores | CU-04 | `CatalogoService`, `Repo` | Pendiente |
| Transacciones | Cosechas y Offline-First (Core) | CU-05 | `PesajeService`, `ClasificacionService`, `CalculadoraCosecha`, `OfflinePayloadAdapter`, `SyncState`, `SyncObserver` | Pendiente |
| Dashboard | Métricas de Productividad | CU-06 | `ReportesService` (Dashboard) | Pendiente |

## 4. Diseño Granular de Casos de Prueba

### CU-01: Acceder al Sistema
| ID Caso | Nombre | Precondiciones | Datos de Entrada | Pasos de Ejecución | Resultado Esperado | Estado |
|---|---|---|---|---|---|---|
| **TC-01.1.1** | Iniciar sesión (Flujo Normal) | Usuario registrado y activo | `email` y `password` correctos | 1. Llamar `AuthService.login(email, password)`. | Devuelve token JWT y datos básicos del usuario. | Pendiente |
| **TC-01.1.2** | Iniciar sesión (Credenciales inválidas) | Usuario registrado | `email` válido, `password` incorrecto | 1. Llamar `AuthService.login(email, password)`. | Lanza Excepción: "Correo o contraseña incorrectos". | Pendiente |
| **TC-01.1.3** | Iniciar sesión (Cuenta inactiva) | Usuario con `isActive = false` | `email` y `password` correctos | 1. Llamar `AuthService.login(email, password)`. | Lanza Excepción: "Su cuenta se encuentra desactivada". | Pendiente |
| **TC-01.2.1** | Recuperar contraseña (Flujo Normal) | Usuario existe en DB | `email` registrado | 1. Llamar `AuthService.generarTokenRecuperacion(email)`. | Genera token válido por 1 hora y envía correo. | Pendiente |
| **TC-01.2.2** | Recuperar contraseña (Correo inexistente) | Correo no registrado | `email` no registrado | 1. Llamar `AuthService.generarTokenRecuperacion(email)`. | Retorna null/silencioso por seguridad. | Pendiente |
| **TC-01.2.3** | Recuperar contraseña (Token caducado) | Token generado hace >1 hora | Token expirado | 1. Llamar validación de token. | Lanza Excepción: "El enlace expiró". | Pendiente |

### CU-02: Configurar Perfil de Usuario
| ID Caso | Nombre | Precondiciones | Datos de Entrada | Pasos de Ejecución | Resultado Esperado | Estado |
|---|---|---|---|---|---|---|
| **TC-02.1.1** | Actualizar datos (Flujo Normal) | Usuario autenticado | `telefono` válido | 1. Llamar `PerfilService.actualizarDatos(id, {telefono})`. | Los datos se actualizan, campos sensibles bloqueados. | Pendiente |
| **TC-02.2.1** | Modificar contraseña (Flujo Normal) | Usuario autenticado | `claveActual` válida, `nuevaClave` segura | 1. Llamar `PerfilService.modificarContrasena(id, actual, nueva)`. | Se actualiza el hash en la DB correctamente. | Pendiente |
| **TC-02.2.2** | Modificar contraseña (Actual errónea) | Usuario autenticado | `claveActual` incorrecta | 1. Llamar `PerfilService.modificarContrasena(id, actual, nueva)`. | Lanza Excepción por contraseña actual inválida. | Pendiente |
| **TC-02.3.1** | Modificar preferencias (Flujo Normal) | Dispositivo con red | `tema` = "Oscuro" | 1. Llamar guardado de preferencias. | Se guarda en base de datos. | Pendiente |
| **TC-02.3.2** | Modificar preferencias (Sin red) | Dispositivo offline | `tema` = "Oscuro" | 1. Detectar estado offline.<br>2. Guardar preferencia local. | Se guarda en localStorage sin invocar API. | Pendiente |

### CU-03: Gestionar Agricultores
| ID Caso | Nombre | Precondiciones | Datos de Entrada | Pasos de Ejecución | Resultado Esperado | Estado |
|---|---|---|---|---|---|---|
| **TC-03.1.1** | Crear agricultor (Flujo Normal) | Sin duplicados | Nombres, Cédula válida, Email | 1. Llamar `AgricultorService.crear(input)`. | Retorna el objeto `user` y `_dev_password`. | Pendiente |
| **TC-03.1.2** | Crear agricultor (Cédula duplicada) | Cédula ya existe | Cédula existente | 1. Llamar `AgricultorService.crear(input)`. | Lanza Excepción: `CEDULA_EN_USO`. | Pendiente |
| **TC-03.2.1** | Consultar agricultor (Flujo Normal) | Agricultores en DB | Query = nombre o cédula | 1. Llamar `AgricultorService.buscar(query)`. | Devuelve listado de coincidencias. | Pendiente |
| **TC-03.3.1** | Editar agricultor (Flujo Normal) | Agricultor existente | Nombres modificados | 1. Llamar `AgricultorService.editar(id, input)`. | Retorna agricultor actualizado, Cédula intacta. | Pendiente |
| **TC-03.3.2** | Editar agricultor (Correo duplicado) | Correo asignado a otro | Email de otro usuario | 1. Llamar `AgricultorService.editar(id, input)`. | Lanza Excepción: `EMAIL_EN_USO`. | Pendiente |
| **TC-03.4.1** | Desactivar agricultor (Flujo Normal) | Agricultor existente | ID válido | 1. Llamar `AgricultorService.desactivar(id, adminId)`. | Soft-delete exitoso (`isActive` = false). | Pendiente |
| **TC-03.4.2** | Desactivar agricultor (Auto-desactivación) | Admin logueado | ID = adminId | 1. Llamar `AgricultorService.desactivar(id, adminId)`. | Lanza Excepción: `SELF_DEACTIVATION`. | Pendiente |

### CU-04: Configurar Catálogos de la Finca
| ID Caso | Nombre | Precondiciones | Datos de Entrada | Pasos de Ejecución | Resultado Esperado | Estado |
|---|---|---|---|---|---|---|
| **TC-04.1.1** | Registrar Campaña (Éxito) | No existe código en DB | `codigo` = "102026", `comprador` = "ID-1" | 1. Llamar `CampanaService.crear(input)`. | Retorna campaña con `taraBase` a 1.70. | Pendiente |
| **TC-04.1.2** | Registrar Campaña (Duplicado) | Campaña ya existe | `codigo` = "102026" | 1. Llamar `CampanaService.crear(input)`. | Lanza Excepción: `CODIGO_DUPLICADO`. | Pendiente |
| **TC-04.1.3** | Consultar Campañas | Campañas creadas | N/A | 1. Llamar `CampanaService.listar()`. | Devuelve array de campañas. | Pendiente |
| **TC-04.1.4** | Editar Campaña (Éxito) | Campaña sin pesajes | Modificación general | 1. Llamar `CampanaService.actualizar(id, input)`. | Actualiza datos de la campaña. | Pendiente |
| **TC-04.1.5** | Editar Campaña (Bloqueo tara) | Campaña con pesajes | `taraBase` modificada | 1. Llamar `CampanaService.actualizar(id, input)`. | Lanza Excepción: `TARA_BLOQUEADA`. | Pendiente |
| **TC-04.1.6** | Cerrar Campaña (Éxito) | Sin pesajes PENDING | ID campaña | 1. Llamar `CampanaService.cerrar(id)`. | Cambia estado a cerrada. | Pendiente |
| **TC-04.1.7** | Cerrar Campaña (Sync pendiente) | Pesajes PENDING | ID campaña | 1. Llamar `CampanaService.cerrar(id)`. | Lanza Excepción: `SYNC_PENDIENTE`. | Pendiente |
| **TC-04.2.1** | Registrar Lote (Éxito) | Nombre único en DB | `nombre` = "Lote Norte" | 1. Llamar `LoteService.crear(input)`. | Lote persistido correctamente. | Pendiente |
| **TC-04.2.2** | Registrar Lote (Duplicado) | Lote ya existe | `codigo` duplicado | 1. Llamar `LoteService.crear(input)`. | Lanza Excepción: `CODIGO_DUPLICADO`. | Pendiente |
| **TC-04.2.3** | Consultar Lotes | Lotes registrados | N/A | 1. Llamar `LoteService.listar()`. | Devuelve listado de áreas. | Pendiente |
| **TC-04.2.4** | Editar Lote | Lote existente | `hectareas` = 10 | 1. Llamar `LoteService.actualizar(id, input)`. | Retorna lote modificado. | Pendiente |
| **TC-04.2.5** | Inactivar Lote (Éxito) | Lote sin campaña activa | ID lote | 1. Llamar `LoteService.eliminar(id)`. | Soft-delete exitoso. | Pendiente |
| **TC-04.2.6** | Inactivar Lote (En uso) | Campaña activa asociada | ID lote | 1. Llamar `LoteService.eliminar(id)`. | Lanza Excepción: `LOTE_EN_USO`. | Pendiente |
| **TC-04.3.1** | Registrar Comprador (Éxito) | RUC único | `ruc` = "17900", `tipo` | 1. Llamar `CompradorService.crear(input)`. | Crea comprador con perfil de tolerancia. | Pendiente |
| **TC-04.3.2** | Registrar Comprador (Duplicado) | RUC existente | `ruc` duplicado | 1. Llamar `CompradorService.crear(input)`. | Lanza Excepción: `RUC_DUPLICADO`. | Pendiente |
| **TC-04.3.3** | Consultar Compradores | Compradores activos | N/A | 1. Llamar `CompradorService.listar()`. | Devuelve listado comercial. | Pendiente |
| **TC-04.3.4** | Editar Comprador | Comprador existente | `contacto` nuevo | 1. Llamar `CompradorService.actualizar(id, input)`. | Retorna datos actualizados. | Pendiente |
| **TC-04.3.5** | Eliminar Comprador | Comprador existente | ID comprador | 1. Llamar `CompradorService.eliminar(id)`. | Soft-Delete exitoso. | Pendiente |

### CU-05: Registrar transacciones en campo (CORE y Patrones)
| ID Caso | Nombre | Precondiciones | Datos de Entrada | Pasos de Ejecución | Resultado Esperado | Estado |
|---|---|---|---|---|---|---|
| **TC-05.1.1** | Registrar pesaje bruto (Flujo Normal) | Campaña y lote activos | `pesoBrutoKg`, `gavetas` | 1. Llamar `PesajeService.registrar(input)`. | Retorna pesaje con `pesoNetoKg` base. | Pendiente |
| **TC-05.1.2** | Registrar pesaje bruto (Sin red) | Dispositivo offline | `pesoBrutoKg`, `gavetas` | 1. Llamar adapter offline. | Guarda en SQLite con estado PENDING. | Pendiente |
| **TC-05.2.1** | Registrar clasificación (Flujo Normal) | Pesaje bruto existe | Categorías desglosadas | 1. Llamar `ClasificacionService.registrar(input)`. | Guarda clasificación validando suma. | Pendiente |
| **TC-05.2.2** | Registrar clasificación (Descuadre supera ±4%) | Diferencia > 4% | Suma incoherente | 1. Instanciar `CalculadoraCosecha`.<br>2. Llamar `ClasificacionService.registrar()`. | Lanza Excepción exigiendo confirmación forzada. | Pendiente |
| **TC-05.3.1** | Registrar ajuste de comprador | Clasificación existe | `kg_rechazados` | 1. Llamar ajuste en servicio. | Recalcula fruta efectiva. | Pendiente |
| **TC-05.4.1** | Sincronizar datos (Flujo Normal) | Datos PENDING, Hay red | Estado SYNC | 1. Ejecutar `OfflinePayloadAdapter.adaptToPostgres()`. | Respuesta 200 OK, cambia estado local a SYNCED. | Pendiente |
| **TC-05.4.2** | Sincronizar datos (Falla 500) | Datos PENDING, Falla API | Estado SYNC | 1. Ejecutar sincronización. | Mantiene PENDING e inicia reintentos (backoff). | Pendiente |

### CU-06: Analizar Productividad
| ID Caso | Nombre | Precondiciones | Datos de Entrada | Pasos de Ejecución | Resultado Esperado | Estado |
|---|---|---|---|---|---|---|
| **TC-06.1.1** | Dashboard interactivo (Flujo Normal) | Existen pesajes | N/A | 1. Llamar servicio de Dashboard. | Devuelve agregaciones estadísticas. | Pendiente |
| **TC-06.1.2** | Filtrar por fechas (Flujo Normal) | Fechas válidas | Rango correcto | 1. Llamar filtrado de fechas. | Devuelve métricas del rango. | Pendiente |
| **TC-06.1.3** | Filtrar por fechas (Incongruente) | Fecha inicio > fin | Rango inválido | 1. Llamar filtrado de fechas. | Lanza Excepción de rango inválido. | Pendiente |
| **TC-06.1.4** | Filtrar por Lote físico | Lote válido | ID lote | 1. Llamar filtrado por lote. | Devuelve rendimiento de plantas del lote. | Pendiente |
| **TC-06.1.5** | Filtrar por Campaña/Funda | Campaña válida | Filtro campaña | 1. Llamar filtrado por campaña. | Devuelve métricas específicas. | Pendiente |
| **TC-06.1.6** | Generar reporte exportable | Datos procesados | Formato PDF/Excel | 1. Llamar generación de reporte. | Retorna buffer del archivo. | Pendiente |

## 5. Criterios de Aceptación y Suspensión

### Criterios de Aceptación
- **100% de los Casos de Prueba Críticos (CU-03 y CU-05) ejecutan exitosamente (Pass).**
- Cobertura de pruebas (Code Coverage) igual o mayor al 85% para los servicios en `lib/services`.
- Todos los mocks de base de datos no presentan fugas (leaks) que intenten conexiones reales.
- Se valida la mutabilidad dinámica del Patrón Strategy (`CalculadoraCosecha.setEstrategiaMargen`).

### Criterios de Suspensión
- Si se detecta que las pruebas dependen de una instancia local o remota de base de datos en ejecución (violación de principio de aislamiento unitario).
- Fallas de compilación en TypeScript que bloqueen la ejecución de Vitest.
- Si las reglas de negocio del CU-05 (Pesajes y tolerancias) fallan en más de 2 casos, se suspenden las pruebas de integración hasta corrección arquitectónica.
