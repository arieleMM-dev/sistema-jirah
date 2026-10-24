import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/auth/session';
import { ComercialService } from '@/lib/services/comercial.service';
import { AnulacionComercialService } from '@/lib/services/anulacion-comercial.service';
import { mensajesComerciales } from '@/lib/comercial';
import { paginaValida } from '@/lib/paginacion';

export function errorComercial(error: unknown) {
  if (error instanceof Error && error.message === 'PAGINACION_INVALIDA') return NextResponse.json({ error: 'Página inválida.' }, { status: 400 });
  if (error instanceof SyntaxError) return NextResponse.json({ error: 'Solicitud JSON inválida.' }, { status: 400 });
  const code = error instanceof Error ? error.message : '';
  const status = code === 'NO_AUTORIZADO' ? 403 : code === 'MOVIMIENTO_NO_ENCONTRADO' ? 404 : ['DEPENDENCIAS_ACTIVAS', 'MOVIMIENTO_ANULADO', 'CONFLICTO_COMERCIAL', 'IDENTIDAD_CONFLICTIVA', 'STOCK_INSUFICIENTE', 'RECHAZO_EXCESIVO', 'JORNADA_MODIFICADA', 'CORRECCION_NO_PERMITIDA'].includes(code) ? 409 : mensajesComerciales[code] ? 422 : 500;
  if (status === 500) console.error('[Comercial] Operación fallida:', error instanceof Error ? error.name : 'Error desconocido');
  return NextResponse.json({ error: mensajesComerciales[code] ?? 'No se pudo completar la operación. Intente nuevamente.' }, { status });
}
export const ComercialController = {
  async list(req: NextRequest) {
    const session = await getAuthenticatedSession();
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    if (session.user.rol !== 'ADMIN') return NextResponse.json({ error: 'Solo el administrador puede gestionar entregas.' }, { status: 403 });
    try { return NextResponse.json(await ComercialService.listar(paginaValida(new URL(req.url).searchParams.get('pagina') ?? 1))); } catch (error) { return errorComercial(error); }
  },
  async create(req: NextRequest, kind: 'entrega' | 'devolucion' | 'anulacion') {
    const session = await getAuthenticatedSession();
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    if (session.user.rol !== 'ADMIN') return NextResponse.json({ error: 'Solo el administrador puede gestionar entregas.' }, { status: 403 });
    try { return NextResponse.json(await (kind === 'entrega' ? ComercialService.entregar : kind === 'devolucion' ? ComercialService.devolver : AnulacionComercialService.anular)(await req.json(), session.user.id), { status: 201 }); }
    catch (error) { return errorComercial(error); }
  },
};
