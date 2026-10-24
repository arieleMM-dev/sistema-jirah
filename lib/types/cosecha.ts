import type { PesoCategoria } from '@/lib/cosecha';
export type CampanaCampo = { id: string; codigo: string; nombre: string; taraBase: number; isActive: boolean; minimoPGr: number; minimoGGr: number; versionParametros: number };
export type LoteCampo = { id: string; codigo: string; nombre: string; isActive: boolean };
export type JornadaVista = {
  id: string; fecha: string; campanaId: string; loteId: string; version: number;
  taraBase: number; minimoPGr: number; minimoGGr: number;
  estado: 'ABIERTA' | 'CLASIFICADA' | 'PENDIENTE_APROBACION' | 'APROBADA';
  campana: { id: string; codigo: string; nombre: string };
  lote: { id: string; codigo: string; nombre: string };
  pesajes: { id: string; numGavetas: number; pesoBrutoKg: number; pesoNetoKg: number; fechaRegistro: string;
    agricultor: { id: string; nombres: string; apellidos: string } }[];
  pesoNetoKg: number; pesoBrutoKg: number; numGavetas: number;
  clasificacion: null | {
    id: string; fechaRegistro: string; detalles: (PesoCategoria & { pesoNetoKg: number })[];
    pesoExportacionKg: number; pesoNacionalKg: number; totalClasificado: number;
    diferenciaKg: number; margenErrorPct: number; dentroDelMargen: boolean;
    observaciones: string | null; motivoAprobacion: string | null; fechaAprobacion: string | null;
    clasificador: { nombres: string; apellidos: string };
    aprobador: { nombres: string; apellidos: string } | null;
  };
  pendienteLocal?: boolean;
};
export type ContextoCampo = { userId: string; campanas?: CampanaCampo[]; lotes?: LoteCampo[];
  jornadas?: JornadaVista[]; registrosAnteriores?: number };
