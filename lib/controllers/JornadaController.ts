import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/auth/session';
import { JornadaService } from '@/lib/services/jornada.service';
import { mensajeCosecha } from '@/lib/cosecha';

function failure(error: unknown) {
  if (error instanceof SyntaxError) return NextResponse.json({ error: 'Solicitud JSON inválida.' }, { status: 400 });
  const code = error instanceof Error ? error.message : '';
  if (['PAGINACION_INVALIDA', 'FILTRO_INVALIDO'].includes(code)) return NextResponse.json({ error: 'Página o filtro inválido.' }, { status: 400 });
  const message = mensajeCosecha(error);
  const status = code === 'APROBACION_NO_AUTORIZADA' ? 403 : code === 'JORNADA_NO_ENCONTRADA' ? 404
    : ['JORNADA_MODIFICADA', 'JORNADA_CERRADA', 'CLASIFICACION_EXISTENTE', 'IDENTIDAD_CONFLICTIVA', 'NO_REQUIERE_APROBACION'].includes(code) ? 409
    : message.startsWith('No se pudo') ? 500 : 422;
  return NextResponse.json({ error: message }, { status });
}

export const JornadaController = {
  async list(req: NextRequest) {
    if (!await getAuthenticatedSession()) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    try {
      const p = new URL(req.url).searchParams;
      return NextResponse.json(await JornadaService.listar({ pagina: p.get('pagina') ?? 1, id: p.get('id') ?? undefined,
        campanaId: p.get('campanaId') ?? undefined, loteId: p.get('loteId') ?? undefined, pesajeId: p.get('pesajeId') ?? undefined }));
    } catch (error) { return failure(error); }
  },
  async classify(req: NextRequest) {
    const session = await getAuthenticatedSession();
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    try { return NextResponse.json({ clasificacion: await JornadaService.clasificar(await req.json(), session.user.id) }, { status: 201 }); }
    catch (error) { return failure(error); }
  },
  async approve(req: NextRequest) {
    const session = await getAuthenticatedSession();
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    if (session.user.rol !== 'ADMIN') return NextResponse.json({ error: 'Solo el administrador puede aprobar descuadres.' }, { status: 403 });
    try {
      const body = await req.json();
      return NextResponse.json({ clasificacion: await JornadaService.aprobar(body?.jornadaId, body?.version, body?.motivo, session.user.id) });
    } catch (error) { return failure(error); }
  },
};
