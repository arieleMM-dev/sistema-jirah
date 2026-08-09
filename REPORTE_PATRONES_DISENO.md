# Informe de Implementación de Patrones de Diseño
**Proyecto:** Sistema de Gestión Agrícola Finca JIRAH

Este informe detalla exhaustivamente los patrones de diseño arquitectónicos y de software que se han implementado en el desarrollo del sistema Finca JIRAH. Cada patrón resuelve un problema específico del dominio agrícola, garantizando escalabilidad, bajo acoplamiento y un soporte robusto para la naturaleza Offline-First de la aplicación.

---

## 1. Patrón Strategy (Estrategia)

> [!NOTE]
> **Propósito General:** Permite definir una familia de algoritmos, encapsular cada uno de ellos y hacerlos intercambiables. Permite que el algoritmo varíe independientemente de los clientes que lo utilizan.

**Ubicación en el Proyecto:** `lib/services/calculo/ICalculoMargen.ts`

### ¿Para qué se usó profundamente en Finca JIRAH?
En el entorno agrícola de la pitahaya, las reglas de clasificación y las normativas de error varían dependiendo del tipo de cosecha o el estándar de venta (Nacional vs Exportación). El patrón Strategy se implementó para **desacoplar el cálculo matemático de las mermas y taras de los controladores**.

*   **Algoritmos de Margen de Error (`ICalculoMargenError`):**
    *   `CalculoMargenPitahayaNormalStrategy`: Aplica una regla estricta de ±4% de diferencia máxima permitida entre el peso bruto ingresado en campo y el total clasificado.
    *   `CalculoMargenPitahayaExportacionStrategy`: Preparada para requerimientos futuros más estrictos (±2%).
*   **Algoritmos de Tara (`ICalculoTara`):**
    *   `CalculoTaraGavetaStrategy`: Abstrae el peso base de la gaveta plástica utilizada en la recolección, fijándolo de manera estándar en 1.70 kg por unidad.

**Impacto Arquitectónico:** La clase contexto `CalculadoraCosecha` orquesta estas estrategias. Si mañana Finca JIRAH decide usar canastos de 2.0 kg o admitir un 5% de merma, solo se crea una nueva estrategia (nueva clase) sin tocar ni romper el controlador de pesaje ni la base de datos. Se cumple el principio Abierto/Cerrado (Open/Closed Principle).

---

## 2. Patrón State (Estado)

> [!IMPORTANT]
> **Propósito General:** Permite que un objeto altere su comportamiento cuando su estado interno cambia. El objeto parecerá haber cambiado de clase.

**Ubicación en el Proyecto:** `lib/state/SyncState.ts`

### ¿Para qué se usó profundamente en Finca JIRAH?
El núcleo operativo del sistema es **Offline-First**, lo que significa que los pesajes se realizan en zonas sin internet y se envían después. El patrón State modela la máquina de estados de vida de cada registro (Pesaje/Clasificación), controlando estrictamente qué acciones están permitidas según el momento de sincronización.

*   **`PendingState` (Pendiente - Naranja):** El dato solo vive en la base local del celular (`IndexedDB`). Permite edición completa y se considera apto para encolarse en sincronización.
*   **`SyncingState` (Sincronizando - Azul):** El Service Worker está intentando negociar con el servidor. Se **bloquea la edición** para evitar colisiones o pérdida de datos en tránsito.
*   **`SyncedState` (Sincronizado - Verde):** El registro ya está respaldado exitosamente en PostgreSQL (Nube). El estado hace que el registro se vuelva completamente **inmutable** (solo lectura).

**Impacto Arquitectónico:** Evita usar estructuras complejas de múltiples `if-else` (ej. `if(status === 'PENDING') edit() else...`). Al delegar el comportamiento a la clase de estado actual a través del contexto `SyncStateContext`, la lógica de interfaz de usuario y permisos se vuelve trivial, centralizada y libre de errores críticos de sincronización.

---

## 3. Patrón Observer (Observador / Publicador-Suscriptor)

> [!TIP]
> **Propósito General:** Define una dependencia de uno-a-muchos entre objetos, de forma que cuando el estado de un objeto cambia, todos sus dependientes son notificados y actualizados automáticamente.

**Ubicación en el Proyecto:** `lib/observers/SyncObserver.ts`

### ¿Para qué se usó profundamente en Finca JIRAH?
La experiencia de usuario exige que la interfaz de React sepa en tiempo real si el dispositivo recuperó la conexión y si se enviaron los datos pendientes, pero sin que los componentes visuales estén preguntando (polling) constantemente a la red.

*   **Sujeto (`NetworkSyncSubject`):** Actúa como el publicador central que monitorea la conexión y los eventos de red del Service Worker. Mantiene una lista (`Set`) de todos los componentes suscritos.
*   **Observadores (`ISyncObserver`):** Son los componentes visuales (mediante un Hook de React) que necesitan reaccionar (mostrar notificaciones de éxito, cambiar contadores de pesajes pendientes, etc.).

**Impacto Arquitectónico:** Desacopla la capa de red/infraestructura de la capa de renderizado. El Service Worker solo emite una notificación de evento (ej. "Sincronización Exitosa"), y el patrón se encarga de que cualquier tabla, botón o dashboard que esté observando este evento se redibuje automáticamente sin dependencias mutuas de código espagueti.

---

## 4. Patrón Adapter (Adaptador)

> [!NOTE]
> **Propósito General:** Convierte la interfaz de una clase en otra interfaz que esperan los clientes. Permite que clases con interfaces incompatibles trabajen juntas.

**Ubicación en el Proyecto:** `lib/adapters/OfflinePayloadAdapter.ts`

### ¿Para qué se usó profundamente en Finca JIRAH?
Existe una brecha estructural entre los datos generados por el frontend offline (`IndexedDB`) y la estructura estricta que exige el ORM Prisma para la base de datos SQL.

*   **Estructura Origen (Offline):** JSONs planos optimizados para almacenamiento veloz en el navegador (`OfflinePesajePayload`), donde las referencias foráneas o cálculos no están completos.
*   **Estructura Destino (Backend):** Entidades relacionales complejas (`PrismaCreatePesajeInput`), que requieren cálculos en el vuelo (Tara, Peso Neto) e inserción con llaves foráneas estrictas (UUIDs).
*   **El Adaptador (`OfflinePayloadAdapter`):** Intercepta la carga útil JSON que llega desde el dispositivo móvil y la transforma, inyectando cálculos (usando el patrón Strategy internamente) y traduciendo los identificadores temporales locales a IDs relacionales definitivos.

**Impacto Arquitectónico:** Permite que los Repositorios de base de datos sigan siendo "puros" e ignorantes sobre el contexto offline. El repositorio solo espera un input válido de Prisma, y el Adapter asume toda la responsabilidad de traducir el lenguaje "Offline/IndexedDB" al lenguaje "SQL/Prisma", facilitando pruebas unitarias y manteniendo la separación de responsabilidades limpia.
