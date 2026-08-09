import { DashboardRepo } from '@/lib/repositories/DashboardRepository';

export class DashboardService {
  static async getDashboardStats(filtros: {
    fechaDesde?: string | null;
    fechaHasta?: string | null;
    loteId?: string;
    campanaId?: string;
  }) {
    const { fechaDesde, fechaHasta, loteId, campanaId } = filtros;
    
    // Preparar fechas
    const parseDate = (d?: string | null, isEnd?: boolean) => {
      if (!d) return undefined;
      return isEnd ? new Date(d + 'T23:59:59') : new Date(d);
    };

    const parsedFiltros = {
      fechaDesde: parseDate(fechaDesde, false),
      fechaHasta: parseDate(fechaHasta, true),
      loteId: loteId || undefined,
      campanaId: campanaId || undefined,
    };

    const [stats, campanas, lotes] = await Promise.all([
      DashboardRepo.getStats(parsedFiltros),
      DashboardRepo.getCampanas(),
      DashboardRepo.getLotes(),
    ]);

    return { ...stats, campanas, lotes };
  }
}
