import { useState, useEffect } from 'react';

export type KgPorLote = { codigo: string; kg: number; alertas: number };
export type Actividad = {
  id: string; fechaRegistro: string; pesoNetoKg: number; pesoBrutoKg: number;
  lote: { codigo: string; nombre: string }; campana: { codigo: string };
  agricultor: { nombres: string; apellidos: string };
  clasificacion: { dentroDelMargen: boolean; auditFlag: boolean } | null;
};
export type Stats = {
  kgTotal: number; totalPesajes: number; alertasMargen: number;
  lotesConActividad: number;
  campanaActiva: { codigo: string; nombre: string; funda: string } | null;
  actividadReciente: Actividad[];
  kgPorLote: KgPorLote[];
  campanas: { id: string; codigo: string; nombre: string; isActive: boolean }[];
  lotes: { id: string; codigo: string; nombre: string }[];
};

export function useDashboardStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [loteId, setLoteId] = useState('');
  const [campanaId, setCampanaId] = useState('');

  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams(Object.entries({ fechaDesde, fechaHasta, loteId, campanaId }).filter(([, value]) => value));
    void fetch('/api/dashboard/stats?' + params, { signal: controller.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'No se pudieron cargar los indicadores.');
      setStats(data); setError(null);
    }).catch((e: unknown) => {
      if (!controller.signal.aborted) { setStats(null); setError(e instanceof Error ? e.message : 'Error de conexión'); }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [fechaDesde, fechaHasta, loteId, campanaId, revision]);

  const changed = (setter: (value: string) => void) => (value: string) => { setLoading(true); setError(null); setter(value); };
  const clearFilters = () => {
    setLoading(true);
    setFechaDesde('');
    setFechaHasta('');
    setLoteId('');
    setCampanaId('');
  };

  return {
    stats,
    loading,
    error,
    filters: { fechaDesde, fechaHasta, loteId, campanaId },
    setFilters: { setFechaDesde: changed(setFechaDesde), setFechaHasta: changed(setFechaHasta), setLoteId: changed(setLoteId), setCampanaId: changed(setCampanaId), clearFilters },
    reload: () => { setLoading(true); setRevision(n => n + 1); }
  };
}
