import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/auth/session';
import { ReporteService } from '@/lib/services/reporte.service';

export const ReporteController = {
  async obtener(req: NextRequest) {
    const session = await getAuthenticatedSession();
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    if (session.user.rol !== 'ADMIN') return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    const params = new URL(req.url).searchParams;
    try {
      return NextResponse.json(await ReporteService.obtener({ fechaDesde: params.get('fechaDesde'), fechaHasta: params.get('fechaHasta'),
        campanaId: params.get('campanaId') ?? undefined, loteId: params.get('loteId') ?? undefined }));
    } catch (error) {
      if (error instanceof Error && error.message === 'FILTROS_INVALIDOS') return NextResponse.json({ error: 'Revise las fechas y el período seleccionado.' }, { status: 422 });
      console.error('[Reporte] No se pudo consultar el reporte.');
      return NextResponse.json({ error: 'No se pudo obtener el reporte.' }, { status: 500 });
    }
  },
};
