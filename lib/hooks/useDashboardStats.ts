import { useState, useEffect, useCallback } from 'react';

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

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (fechaDesde) params.set('fechaDesde', fechaDesde);
      if (fechaHasta) params.set('fechaHasta', fechaHasta);
      if (loteId) params.set('loteId', loteId);
      if (campanaId) params.set('campanaId', campanaId);
      
      const res = await fetch(`/api/dashboard/stats?${params}`);
      if (!res.ok) {
        throw new Error('Error al cargar estadísticas');
      }
      const data = await res.json();
      setStats(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [fechaDesde, fechaHasta, loteId, campanaId]);

  const clearFilters = () => {
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
    setFilters: { setFechaDesde, setFechaHasta, setLoteId, setCampanaId, clearFilters },
    reload: load
  };
}
