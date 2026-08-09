# Reporte de Trazabilidad: Documentación vs. Código Fuente

**Fecha de Auditoría:** 12 de Julio de 2026
**Objetivo:** Verificar la correspondencia estricta entre las reglas de negocio descritas en `Especificacion_Casos_Uso_Jirah.md` y la implementación actual en el código fuente (específicamente la capa de negocio en `@lib`, el esquema de base de datos `@prisma` y las rutas).

---

## 1. Resumen de Cobertura

Tras la reciente fase de desarrollo y refactorización, el diagnóstico de los módulos es el siguiente:

- **Módulo 1 (Acceso):** 100% Completo.
- **Módulo 2 (Perfil):** 100% Completo.
- **Módulo 3 (Agricultores):** 100% Completo.
- **Módulo 4 (Catálogos):** 100% Completo.
- **Módulo 5 (Transacciones en Campo):** 100% Completo.
- **Módulo 6 (Productividad):** 100% Completo.

**Estado global:** El sistema se encuentra totalmente alineado a las reglas de negocio y arquitectónicas establecidas.

---

## 2. Matriz de Trazabilidad Directa

| ID Caso de Uso | Descripción | Archivo/Clase/Método Implementado | Estado |
| :--- | :--- | :--- | :--- |
| **CU-01.1** | Iniciar sesión y redirección por rol | `app/api/auth/[...nextauth]/route.ts`<br>`app/login/page.tsx` | Completo |
| **CU-01.2** | Recuperar contraseña con token de 1h | `lib/services/auth.service.ts` (generarTokenRecuperacion, resetearPassword)<br>`lib/controllers/AuthController.ts` | Completo |
| **CU-02.1** | Actualizar datos y Avatar (PNG/JPG <2MB) | `lib/controllers/PerfilController.ts` (actualizar)<br>`app/dashboard/perfil/page.tsx` | Completo |
| **CU-02.2** | Modificar contraseña con política fuerte | `lib/controllers/PerfilController.ts` (cambiarPassword)<br>`lib/services/auth.service.ts` (validarFortaleza) | Completo |
| **CU-02.3** | Modificar preferencias (Tema y local fallback) | `lib/controllers/PerfilController.ts` (actualizar)<br>`app/dashboard/layout.tsx` | Completo |
| **CU-03.1** | Crear agricultor (Valida Cédula EC) | `lib/services/agricultor.service.ts` (crear, validarCedulaEC) | Completo |
| **CU-03.2** | Consultar agricultor (Búsqueda en tiempo real) | `lib/services/agricultor.service.ts` (buscar) | Completo |
| **CU-03.3** | Editar agricultor (Evita duplicidad de correo) | `lib/services/agricultor.service.ts` (editar) | Completo |
| **CU-03.4** | Desactivar agricultor (Soft-delete y revocación) | `lib/services/agricultor.service.ts` (desactivar)<br>`lib/services/auth.service.ts` (revokeUser) | Completo |
| **CU-04.1.1** | Registrar Campaña con tara base de 1.70kg | `lib/services/catalogo.service.ts` (crearCampana) | Completo |
| **CU-04.1.3** | Editar Campaña y bloqueo de Tara | `lib/services/catalogo.service.ts` (actualizarCampana) | Completo |
| **CU-04.2.1** | Registrar Lote con variedad de cultivo | `prisma/schema.prisma` (Lote.variedad)<br>`lib/services/catalogo.service.ts` | Completo |
| **CU-04.3.1** | Registrar Comprador (Tolerancia) | `lib/services/catalogo.service.ts` (crearComprador) | Completo |
| **CU-05.1** | Registrar pesaje bruto (Cosecha cruda) | `lib/services/pesaje.service.ts` (crearPesajeBruto) | Completo |
| **CU-05.2** | Clasificación poscosecha y tolerancia ±4% | `lib/services/calculo/ICalculoMargen.ts` (Estrategia 4%)<br>`lib/services/clasificacion.service.ts` | Completo |
| **CU-05.3** | Registro ajuste comprador y fruta efectiva | `lib/services/ajuste.service.ts` (registrar)<br>`lib/controllers/AjusteController.ts` | Completo |
| **CU-05.4** | Sync Offline a PostgreSQL con Backoff 500 | `lib/hooks/useSyncManager.ts`<br>`public/sw.js`<br>`lib/observers/SyncObserver.ts` | Completo |
| **CU-06.1** | Dashboard interactivo y filtros (Fechas/Lote) | `app/api/dashboard/stats/route.ts`<br>`app/dashboard/page.tsx` | Completo |
| **CU-06.1.4** | Generar reporte exportable (PDF/Excel) | `app/dashboard/page.tsx` (exportarPDF, exportarExcel) | Completo |

---

## 3. Auditoría de Excepciones (Flujos Alternativos)

Se verificó la existencia en código de los manejos de errores obligatorios estipulados en los Casos de Uso.

1. **(E.1) Cuenta inactiva o credenciales inválidas (CU-01.1):** 
   - *Validación:* Implementado en `authOptions.authorize`. Retorna códigos de error específicos que son interpretados en `app/login/page.tsx`.
2. **(E.1) Cédula o correo duplicado (CU-03.1):** 
   - *Validación:* Implementado en `AgricultorService.crear`. Lanza `EMAIL_EN_USO` o `CEDULA_EN_USO`.
3. **(E.1) Auto-desactivación (CU-03.4):** 
   - *Validación:* Implementado en `AgricultorService.desactivar`. `if (id === adminId) throw new Error('SELF_DEACTIVATION');`.
4. **(E.1) Tara bloqueada por pesajes existentes (CU-04.1.3):**
   - *Validación:* Implementado en `catalogo.service.ts`. Arroja `TARA_BLOQUEADA` si la campaña ya tiene `_count.pesajes > 0` y se intenta cambiar `taraBase`.
5. **(E.1) Límite de Tolerancia de descuadre (CU-05.2):**
   - *Validación:* Implementado con el Patrón Strategy en `ICalculoMargen.ts`. Valida estrictamente el ±4%. El guardado bloquea si excede el límite y exige autorización.
6. **(E.1) Rechazo excede volumen despachado (CU-05.3):**
   - *Validación:* Implementado en `ajuste.service.ts`. `if (pesoRechazado > clasificacion.pesoExportacionKg) throw new Error('RECHAZO_EXCEDE_EXPORTACION');`.
7. **(E.1) Fallo 500 y Backoff Exponencial (CU-05.4):**
   - *Validación:* Implementado en `useSyncManager.ts`. Multiplica el delay `backoffRef.current * 2` hasta un tope máximo (`MAX_BACKOFF = 60000ms`) si `fetch` retorna `res.status >= 500`.

---

## 4. Análisis de Brechas (Gaps) y Discrepancias

**Brechas Detectadas (Faltantes):**
*NINGUNA*. Tras la última iteración de desarrollo guiada por Arquitectura Limpia, todas las brechas detectadas previamente han sido resueltas.

**Discrepancias (Reglas que contradicen el .md):**
*NINGUNA*. 
- El esquema de base de datos soporta los campos necesarios (`Lote.variedad`).
- Las políticas estrictas (como revocación de JWT tras eliminación lógica) están operando mediante la _blacklist_ en memoria en `AuthService`.
- La tara base por defecto asignada vía código se mantiene en 1.70kg.
- El cálculo de porcentaje de Fruta Efectiva respeta la fórmula al restar el peso rechazado del peso de exportación.

**Conclusión Final:**
El aplicativo de Finca Jirah cumple al 100% con los requerimientos documentados en la Especificación de Casos de Uso y respeta los Patrones de Diseño exigidos (Strategy, Observer, State). No existen deudas técnicas críticas pendientes con respecto al documento.
