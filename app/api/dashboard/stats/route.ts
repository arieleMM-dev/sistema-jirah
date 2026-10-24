import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/auth/session';
import { DashboardService } from '@/lib/services/dashboard.service';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthenticatedSession();
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    if (session.user.rol !== 'ADMIN') return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });

    const url = new URL(req.url);
    const result = await DashboardService.getDashboardStats({
      fechaDesde: url.searchParams.get('fechaDesde'),
      fechaHasta: url.searchParams.get('fechaHasta'),
      loteId: url.searchParams.get('loteId') ?? undefined,
      campanaId: url.searchParams.get('campanaId') ?? undefined,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'FILTROS_INVALIDOS') return NextResponse.json({ error: 'Revise las fechas del período.' }, { status: 422 });
    console.error('[Dashboard API Error]', error);
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 });
  }
}
