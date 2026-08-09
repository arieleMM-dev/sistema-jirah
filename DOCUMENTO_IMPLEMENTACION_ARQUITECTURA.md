# DOCUMENTO DE IMPLEMENTACIÓN DE ARQUITECTURA
**Proyecto:** Sistema de Gestión Agrícola Finca JIRAH

Este documento describe el "Cómo" y el "Dónde" del estado actual del sistema, mapeando la arquitectura lógica propuesta directamente contra la estructura de directorios, carpetas y archivos desarrollados en el código fuente actual del proyecto Finca JIRAH.

---

## 1. Visión General de la Implementación Actual

El sistema se encuentra con su base de datos principal modelada en el `schema.prisma` y migraciones iniciales aplicadas sobre SQLite (`dev.db`). Las capas backend (BFF) están segmentadas limpiamente bajo `lib/` y conectadas a la aplicación mediante los Route Handlers de la carpeta `app/`. 

Ya se encuentran codificados y disponibles los servicios para autenticación, gestión de personal/agricultores, catálogos paramétricos (compradores, lotes, campañas), la lógica central de pesajes de campo y el núcleo base para la resolución Offline-First.

---

## 2. Mapeo de la Arquitectura Interna en Capas

El backend y las reglas de negocio han sido aisladas cuidadosamente en el directorio raíz `@lib`, logrando total independencia de los componentes visuales de React.

* **Capa de Controladores (`lib/controllers/`)**
  * `AgricultorController.ts`: Gestión de los usuarios de campo.
  * `AjusteController.ts`: Manejo de ajustes posteriores.
  * `AuthController.ts`: Lógica de acceso y sesiones.
  * `CatalogoController.ts`: Parametrización y listados para el dashboard.
  * `PerfilController.ts`: Gestión del usuario logueado.
  * `PesajeController.ts`: Controlador de transacciones operativas.

* **Capa de Servicios de Negocio (`lib/services/`)**
  * `agricultor.service.ts`
  * `ajuste.service.ts`
  * `auth.service.ts`
  * `catalogo.service.ts`
  * `offline.service.ts`: Coordina y encola las peticiones diferidas.
  * `pesaje.service.ts`

* **Capa de Acceso a Datos / Repositorios (`lib/repositories/`)**
  * `UserRepository.ts`
  * `AjusteRepository.ts`
  * `CampanaRepository.ts`
  * `CatalogoRepository.ts`
  * `DashboardRepository.ts`
  * `PesajeRepository.ts`

---

## 3. Implementación de Patrones de Diseño (Evidencia en Código)

Los patrones de diseño arquitectónicos están explícitamente desarrollados y pueden auditarse en sus rutas correspondientes:

### Patrón Strategy (Reglas Intercambiables)
* **Ubicación:** `lib/services/calculo/ICalculoMargen.ts`
* **Implementación:** La interfaz `ICalculoMargenError` expone un contrato para algoritmos intercambiables. Se encuentra codificada la regla de negocio concreta en `CalculoMargenPitahayaNormalStrategy`, controlando el **Margen de Error del ±4%** entre el pesaje bruto y el neto clasificado. También se define `CalculoTaraGavetaStrategy` que establece el peso estándar de gaveta en **1.70kg**.

### Patrón State (Máquina de Estados de Sincronización)
* **Ubicación:** `lib/state/SyncState.ts`
* **Implementación:** A través de la clase contexto `SyncStateContext` y la interfaz `ISyncState`, se controlan los estados de sincronización:
  * `PendingState`: Etiqueta amarilla, el registro es editable.
  * `SyncingState`: Etiqueta azul, se bloquea la edición.
  * `SyncedState`: Etiqueta verde, inmutable respaldado en BD.

### Patrón Observer (Reactividad de Conexión)
* **Ubicación:** `lib/observers/SyncObserver.ts`
* **Implementación:** Actúa mediante `NetworkSyncSubject` (Publisher/Subject) que mantiene un registro de los componentes que observan (`Set<ISyncObserver>`). Cuando la red cambia a 'online' o 'offline', notifica a todos los componentes React suscritos a través de `onSyncEvent`.

### Patrón Adapter (Transformación Offline -> Relacional)
* **Ubicación:** `lib/adapters/OfflinePayloadAdapter.ts`
* **Implementación:** La clase concreta `OfflinePayloadAdapter` expone métodos como `adaptPesaje` y `adaptClasificacion`. Su regla de negocio en el código convierte un JSON plano `OfflinePesajePayload` que vino desde IndexedDB local, a una estructura `PrismaCreatePesajeInput` válida (calculando en el vuelo la Tara Total), permitiendo al Repositorio guardarlo en el esquema SQL sin esfuerzo.

---

## 4. Evidencia de Casos de Uso Codificados

Los siguientes módulos y flujos ya se encuentran referenciados funcionalmente en la estructura del código y presentación (`app/` y controladores):

1. **Módulo de Acceso:** Existe la estructura en `app/login/` y `app/recuperar/` soportado por el `AuthController.ts` para validación de ingresos y recuperación de cuentas.
2. **Módulo de Perfil:** Accesible desde `app/dashboard/perfil/page.tsx` conectado lógicamente a `PerfilController.ts`.
3. **Módulo de Gestión de Personal:** Referenciado en `app/dashboard/personal/nuevo/page.tsx`, soportado por la tríada `AgricultorController` / `agricultor.service` / `UserRepository`.
4. **Módulo de Catálogos:** Operativo bajo `app/dashboard/catalogos/compradores/page.tsx`, respaldado por `catalogo.service.ts` y repositorios parametrizados (`CampanaRepository`).
5. **Módulo Transaccional (Pesajes y Ajustes):** Componente central gobernado por `PesajeController.ts` y las reglas dinámicas del paquete de cálculos y servicios offline.
