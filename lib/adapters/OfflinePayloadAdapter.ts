// ============================================================
// PATRÓN ADAPTER — Transforma datos de IndexedDB a Prisma
// ============================================================
// Convierte el JSON crudo almacenado en el dispositivo offline
// al formato relacional que esperan las tablas de PostgreSQL/SQLite.

export interface OfflinePesajePayload {
  localId: string;
  timestamp: string;
  peso_bruto: number;
  num_gavetas: number;
  agricultor_id: string;
  campana_codigo: string;
  lote_codigo: string;
  observaciones?: string;
  syncStatus: 'PENDING' | 'SYNCING';
}

export interface OfflineClasificacionPayload {
  localId: string;
  pesaje_local_id: string;
  timestamp: string;
  exportacion_kg: number;
  nacional_kg: number;
  descarte_kg: number;
  clasificador_id: string;
  observaciones?: string;
}

// Formato esperado por Prisma (estructura relacional limpia)
export interface PrismaCreatePesajeInput {
  pesoBrutoKg: number;
  numGavetas: number;
  taraTotal: number;
  pesoNetoKg: number;
  observaciones?: string;
  agricultorId: string;
  campanaId: string;
  loteId: string;
  syncStatus: 'PENDING' | 'SYNCING' | 'SYNCED';
}

export interface PrismaCreateClasificacionInput {
  pesoExportacionKg: number;
  pesoNacionalKg: number;
  pesoDescarte: number;
  totalClasificado: number;
  margenErrorPct: number;
  dentroDelMargen: boolean;
  observaciones?: string;
  pesajeBrutoId: string;
  clasificadorId: string;
}

// ─────────────────────────────────────────────
// Adapter concreto
// ─────────────────────────────────────────────
export class OfflinePayloadAdapter {
  private readonly PESO_GAVETA_KG = 1.70;
  private readonly MARGEN_PERMITIDO = 0.04; // 4%

  /**
   * Adapta un payload de pesaje offline al formato de Prisma.
   * Resuelve FKs (campanaId, loteId) desde sus códigos.
   */
  adaptPesaje(
    payload: OfflinePesajePayload,
    resolvedIds: { campanaId: string; loteId: string }
  ): PrismaCreatePesajeInput {
    const taraTotal = payload.num_gavetas * this.PESO_GAVETA_KG;
    const pesoNetoKg = payload.peso_bruto - taraTotal;

    return {
      pesoBrutoKg: payload.peso_bruto,
      numGavetas: payload.num_gavetas,
      taraTotal,
      pesoNetoKg,
      observaciones: payload.observaciones,
      agricultorId: payload.agricultor_id,
      campanaId: resolvedIds.campanaId,
      loteId: resolvedIds.loteId,
      syncStatus: 'SYNCED',
    };
  }

  /**
   * Adapta un payload de clasificación offline al formato de Prisma.
   * Calcula el margen de error con la regla del ±4%.
   */
  adaptClasificacion(
    payload: OfflineClasificacionPayload,
    pesajeBrutoId: string,
    pesoBrutoKg: number
  ): PrismaCreateClasificacionInput {
    const totalClasificado = payload.exportacion_kg + payload.nacional_kg + payload.descarte_kg;
    const diferencia = Math.abs(pesoBrutoKg - totalClasificado);
    const margenErrorPct = pesoBrutoKg > 0 ? (diferencia / pesoBrutoKg) * 100 : 0;
    const dentroDelMargen = margenErrorPct <= this.MARGEN_PERMITIDO * 100;

    return {
      pesoExportacionKg: payload.exportacion_kg,
      pesoNacionalKg: payload.nacional_kg,
      pesoDescarte: payload.descarte_kg,
      totalClasificado,
      margenErrorPct: Math.round(margenErrorPct * 100) / 100,
      dentroDelMargen,
      observaciones: payload.observaciones,
      pesajeBrutoId,
      clasificadorId: payload.clasificador_id,
    };
  }
}
