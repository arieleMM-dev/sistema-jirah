import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/controllers/AuthController';
import { DashboardService } from '@/lib/services/dashboard.service';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const url = new URL(req.url);
    const result = await DashboardService.getDashboardStats({
      fechaDesde: url.searchParams.get('fechaDesde'),
      fechaHasta: url.searchParams.get('fechaHasta'),
      loteId: url.searchParams.get('loteId') ?? undefined,
      campanaId: url.searchParams.get('campanaId') ?? undefined,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Dashboard API Error]', error);
    return NextResponse.json({ error: error.message || 'Error al obtener estadísticas' }, { status: 500 });
  }
}
