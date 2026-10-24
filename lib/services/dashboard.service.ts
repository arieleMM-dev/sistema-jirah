import { DashboardRepo } from '@/lib/repositories/DashboardRepository';
import { rangoFechasFinca } from '@/lib/filtros-cosecha';

export class DashboardService {
  static async getDashboardStats(filtros: {
    fechaDesde?: string | null;
    fechaHasta?: string | null;
    loteId?: string;
    campanaId?: string;
  }) {
    const { fechaDesde, fechaHasta, loteId, campanaId } = filtros;
    
    const parsedFiltros = rangoFechasFinca({ fechaDesde, fechaHasta, loteId, campanaId });

    const [stats, campanas, lotes] = await Promise.all([
      DashboardRepo.getStats(parsedFiltros),
      DashboardRepo.getCampanas(),
      DashboardRepo.getLotes(),
    ]);

    return { ...stats, campanas, lotes };
  }
}
