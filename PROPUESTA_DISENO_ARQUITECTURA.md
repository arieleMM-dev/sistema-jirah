# PROPUESTA DE DISEÑO Y ARQUITECTURA TÉCNICA
**Proyecto:** Sistema de Gestión Agrícola Finca JIRAH

Este documento técnico fundamenta y justifica las decisiones arquitectónicas del sistema Finca JIRAH, enfocándose en resolver los desafíos particulares de la operación agrícola en campo (ej. conectividad intermitente, pesaje y clasificación en tiempo real) y asegurar la escalabilidad del producto.

---

## 1. Enfoque Arquitectónico Global

### Arquitectura de Cliente Pesado y Offline-First con Sincronización Diferida
El corazón de la operativa de la Finca JIRAH se encuentra en el campo, donde la disponibilidad de red (internet o datos móviles) es inestable o nula. Por esta razón, el sistema ha sido diseñado bajo un enfoque **Offline-First**. 

**Justificación de la Sincronización Diferida:**
* Permite al Agricultor y al Clasificador continuar operando, registrando pesajes brutos, gavetas y clasificaciones localmente en el dispositivo (IndexedDB).
* Cuando el dispositivo recupera la conexión a internet, el sistema aplica la **Sincronización Diferida** mediante Service Workers, enviando los registros encolados en background hacia el servidor central, evitando pérdida de datos por cortes abruptos en medio de las cosechas.

---

## 2. Justificación del Stack Tecnológico

El stack tecnológico se seleccionó basándose en el ecosistema de TypeScript para garantizar una curva de aprendizaje reducida (mismo lenguaje en frontend y backend) y seguridad de tipado (Type-Safety) de extremo a extremo.

* **Next.js (App Router):** Actúa como el núcleo de presentación (SSR/SSG y Client Components en `app/dashboard`) y provee la capacidad de orquestar el backend For Frontend (BFF) utilizando Route Handlers (`app/api`). Se eligió Next.js por su optimización de renderizado y enrutamiento integrado, eliminando la necesidad de levantar un servicio de backend separado para la capa REST.
* **Prisma ORM + SQLite (Desarrollo):** Prisma se utiliza como la capa de persistencia por su integración nativa con TypeScript y generación de tipos basados en el esquema. Para la etapa de desarrollo y pruebas locales se utiliza **SQLite**, permitiendo un entorno autocontenido y ágil (`prisma/dev.db`).
* **PostgreSQL (Producción):** Dado el diseño relacional robusto (`schema.prisma` evidencia múltiples cruces y constraints), PostgreSQL está proyectado como el motor de producción, capaz de manejar la concurrencia de la sincronización offline masiva y bloqueos transaccionales a gran escala.

---

## 3. Estructura de Capas (Clean Architecture)

El código fuente actual implementa una separación de responsabilidades estricta siguiendo principios de *Clean Architecture* orientados a la web:

1. **Capa de Presentación y Rutas (`app/`)**: Contiene las interfaces de usuario (React Components) y los *Route Handlers* de API de Next.js. Delega toda la lógica compleja a los Controladores.
2. **Capa de Controladores (`lib/controllers/`)**: Orquestadores de las solicitudes HTTP entrantes. Validan los parámetros y formatean la respuesta hacia el cliente. Extraen los datos y se los entregan a los Servicios.
3. **Capa de Lógica de Negocio (`lib/services/`)**: Centraliza las reglas fundamentales del negocio agrícola. Aquí residen servicios como `pesaje.service.ts` o `offline.service.ts` encargados de coordinar y validar que se cumplan las normativas de la Finca.
4. **Capa de Acceso a Datos (`lib/repositories/`)**: Encapsulan la lógica directa de base de datos. Repositorios como `PesajeRepository.ts` dialogan directamente con Prisma y evitan que la lógica de ORM se fugue a los Servicios.
5. **Capa de Persistencia y Modelado (`prisma/`)**: Definición del esquema agnóstico a la lógica de aplicación (`schema.prisma`), albergando las tablas y relaciones normalizadas.

---

## 4. Justificación de Patrones de Diseño (GoF)

Para manejar la alta variabilidad en el flujo Offline-First y en las reglas de cálculo de fruta agrícola, se han implementado estratégicamente varios patrones del *Gang of Four (GoF)*.

* **Patrón Strategy:** Seleccionado para desacoplar el algoritmo de cálculo de márgenes de error (y taras de gaveta) del controlador principal. Dado que la Finca puede procesar fruta de Exportación con tolerancias distintas a la fruta Nacional, *Strategy* permite inyectar la fórmula de cálculo dinámicamente (`CalculadoraCosecha`) sin modificar el código de los servicios.
* **Patrón State:** Justificado para gestionar de forma segura e inmutable el ciclo de vida de los registros offline. Un pesaje bruto debe fluir de forma controlada (`PENDING` -> `SYNCING` -> `SYNCED`). *State* garantiza que un registro en estado sincronizado bloquee automáticamente cualquier edición posterior para proteger la integridad contable.
* **Patrón Observer:** La intermitencia de la red requiere una UI reactiva. Se justifica usar el patrón *Observer* para establecer un canal publicador/suscriptor donde los componentes de React se enteren en tiempo real de los cambios detectados por el Service Worker y actualicen visualmente si el usuario está conectado o desconectado.
* **Patrón Adapter:** Necesario para compatibilizar la representación de datos del dispositivo móvil (Payloads planos/crudos en IndexedDB) con la capa relacional jerárquica de la Base de Datos central. El Adaptador transforma el JSON móvil hacia la forma de `PrismaCreateInput` resolviendo relaciones (llaves foráneas).
