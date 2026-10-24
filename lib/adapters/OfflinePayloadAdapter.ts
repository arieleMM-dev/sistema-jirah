// Contratos persistidos en IndexedDB. Los campos opcionales permiten detectar colas antiguas sin inventar datos.
export interface EstadoOperacionLocal { error?: string; intentadoEn?: string; pausada?: boolean }
export interface OfflinePesajePayload {
  _sync?: EstadoOperacionLocal;
  localId: string;
  timestamp: string;
  peso_bruto: number;
  num_gavetas: number;
  agricultor_id: string;
  campana_codigo: string;
  lote_codigo: string;
  observaciones?: string;
  tara_base?: number;
  version_parametros?: number;
  minimo_p_gr?: number;
  minimo_g_gr?: number;
  syncStatus: 'PENDING' | 'SYNCING';
}

export interface OfflineClasificacionAnterior {
  _sync?: EstadoOperacionLocal;
  localId: string;
  pesaje_local_id: string;
  timestamp: string;
  exportacion_kg: number;
  nacional_kg: number;
  descarte_kg: number;
  clasificador_id: string;
  observaciones?: string;
  gavetas_exportacion?: number;
  peso_exportacion_bruto?: number;
  gavetas_nacional?: number;
  peso_nacional_bruto?: number;
  forzar?: boolean;
}

export interface OfflineClasificacionJornada {
  revisionLocal?: { operacionAnteriorId: string; motivo: string; fechaRevision: string; contenidoAnterior: OfflineClasificacionPayload };
  _sync?: EstadoOperacionLocal;
  localId: string;
  timestamp: string;
  versionFormato: 2;
  jornadaId: string;
  version: number;
  pesajeIds: string[];
  detalles: import('@/lib/cosecha').PesoCategoria[];
  clasificador_id: string;
  observaciones?: string;
}

export type OfflineClasificacionPayload = OfflineClasificacionAnterior | OfflineClasificacionJornada;
