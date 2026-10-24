import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/auth/session';
import { RevisionJornadaService } from '@/lib/services/revision-jornada.service';
import { RevisionJornadaRepo } from '@/lib/repositories/RevisionJornadaRepository';
import { errorComercial } from '@/lib/controllers/ComercialController';

export async function GET(req: NextRequest) {
  const session = await getAuthenticatedSession();
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (session.user.rol !== 'ADMIN') return NextResponse.json({ error: 'Solo el administrador puede consultar correcciones.' }, { status: 403 });
  const id = req.nextUrl.searchParams.get('jornadaId');
  if (!id || id.length > 1000) return NextResponse.json({ error: 'Jornada requerida.' }, { status: 422 });
  try { return NextResponse.json({ revisiones: await RevisionJornadaRepo.list(id) }); } catch (error) { return errorComercial(error); }
}
export async function POST(req: NextRequest) {
  const session = await getAuthenticatedSession();
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (session.user.rol !== 'ADMIN') return NextResponse.json({ error: 'Solo el administrador puede corregir jornadas.' }, { status: 403 });
  try { return NextResponse.json(await RevisionJornadaService.corregir(await req.json(), session.user.id), { status: 201 }); }
  catch (error) { return errorComercial(error); }
}
