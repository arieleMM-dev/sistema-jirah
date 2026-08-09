/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CAPA DE NEGOCIO — PesajeController / ClasificacionController║
 * ║  MVC: traduce errores de servicio a respuestas HTTP.        ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './AuthController';
import { PesajeService, ClasificacionService } from '@/lib/services/pesaje.service';

const ERROR_MAP: Record<string, [number, string]> = {
  PESO_BRUTO_INVALIDO:     [422, 'El peso bruto debe ser mayor a 0'],
  GAVETAS_INVALIDAS:       [422, 'El número de gavetas debe ser un entero positivo'],
  CAMPANA_NO_ENCONTRADA:   [404, 'Campaña no encontrada'],
  CAMPANA_CERRADA:         [409, 'La campaña seleccionada está cerrada. No se pueden registrar más pesajes.'],
  LOTE_NO_ENCONTRADO:      [404, 'Lote no encontrado'],
  LOTE_INACTIVO:           [409, 'El lote seleccionado está inactivo.'],
  PESO_NETO_NEGATIVO:      [422, 'El peso neto resulta negativo. Verifique el peso bruto y el número de gavetas.'],
  PESAJE_NO_ENCONTRADO:    [404, 'Pesaje no encontrado'],
  YA_CLASIFICADO:          [409, 'Este pesaje ya fue clasificado.'],
  NETO_EXPORTACION_NEGATIVO: [422, 'El peso neto de exportación es negativo. Verifique las gavetas y el peso bruto.'],
  NETO_NACIONAL_NEGATIVO:  [422, 'El peso neto nacional es negativo. Verifique las gavetas y el peso bruto.'],
};

function handleError(err: unknown) {
  if (err instanceof Error && err.message.startsWith('DESCUADRE:')) {
    const pct = err.message.split(':')[1];
    return NextResponse.json(
      { error: `Alerta: El margen de error (${pct}%) supera el límite permitido. Verifique los pesos.`, descuadre: true, margenPct: parseFloat(pct) },
      { status: 422 }
    );
  }
  const msg = err instanceof Error ? err.message : 'ERROR';
  const [status, detail] = ERROR_MAP[msg] ?? [500, 'Error interno del servidor'];
  return NextResponse.json({ error: detail }, { status });
}

async function getSession() {
  return getServerSession(authOptions);
}

// ═══════════════════════════════════════════════════
// PESAJE CONTROLLER
// ═══════════════════════════════════════════════════
export const PesajeController = {
  async list(req: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    try {
      const url = new URL(req.url);
      const campanaId = url.searchParams.get('campanaId') ?? undefined;
      const loteId    = url.searchParams.get('loteId')    ?? undefined;
      const pesajes = await PesajeService.listar({ campanaId, loteId });
      return NextResponse.json({ pesajes });
    } catch (e) { return handleError(e); }
  },

  async create(req: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    const user = session.user as any;
    try {
      const body = await req.json();
      const pesaje = await PesajeService.registrar({
        ...body,
        agricultorId: user.id,
      });
      return NextResponse.json({ pesaje }, { status: 201 });
    } catch (e) { return handleError(e); }
  },

  async get(req: NextRequest, id: string) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    try {
      const pesaje = await PesajeService.obtener(id);
      return NextResponse.json({ pesaje });
    } catch (e) { return handleError(e); }
  },
};

// ═══════════════════════════════════════════════════
// CLASIFICACION CONTROLLER
// ═══════════════════════════════════════════════════
export const ClasificacionController = {
  async listPendientes(_req: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    try {
      const pendientes = await ClasificacionService.listarPendientes();
      return NextResponse.json({ pendientes });
    } catch (e) { return handleError(e); }
  },

  async create(req: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    const user = session.user as any;
    try {
      const body = await req.json();
      const clasificacion = await ClasificacionService.registrar({
        ...body,
        clasificadorId: user.id,
      });
      return NextResponse.json({ clasificacion }, { status: 201 });
    } catch (e) { return handleError(e); }
  },
};
