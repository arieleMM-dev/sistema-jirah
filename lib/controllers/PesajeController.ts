/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CAPA DE NEGOCIO — PesajeController / ClasificacionController║
 * ║  MVC: traduce errores de servicio a respuestas HTTP.        ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/auth/session';
import { PesajeService, ClasificacionService } from '@/lib/services/pesaje.service';
import { paginaValida } from '@/lib/paginacion';

const ERROR_MAP: Record<string, [number, string]> = {
  PAGINACION_INVALIDA: [400, 'Página o tamaño de página inválidos.'],
  FECHA_INVALIDA: [422, 'La fecha de captura es inválida'],
  JORNADA_CERRADA: [409, 'La jornada ya fue clasificada. Revise el registro pendiente.'],
  TARA_JORNADA_CAMBIO: [409, 'La tara no coincide con la aplicada en esta jornada.'],
  PESAJE_AGRUPADO: [409, 'Clasifique la jornada completa desde la pantalla de clasificación.'],
  APROBACION_NO_AUTORIZADA: [403, 'Solo un administrador puede aprobar descuadres'],
  DATOS_INVALIDOS: [422, 'Revise los identificadores y los tipos de los datos enviados'],
  GAVETAS_CLASIFICACION_INVALIDAS: [422, 'Las gavetas por categoría deben ser enteros mayores o iguales a cero'],
  PESOS_CLASIFICACION_INVALIDOS: [422, 'Los pesos de clasificación deben ser números finitos mayores o iguales a cero'],
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
  if (err instanceof SyntaxError) return NextResponse.json({ error: 'Solicitud JSON inválida' }, { status: 400 });
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
  return getAuthenticatedSession();
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
      const pagina = paginaValida(url.searchParams.get('pagina') ?? 1);
      const limite = Number(url.searchParams.get('limite') ?? 25);
      const pesajes = await PesajeService.listar({ campanaId, loteId }, pagina, limite);
      return NextResponse.json({ pesajes, pagina, limite });
    } catch (e) { return handleError(e); }
  },

  async create(req: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    const user = session.user;
    try {
      const body = await req.json();
      const pesaje = await PesajeService.registrar({
        pesoBrutoKg: body?.pesoBrutoKg,
        numGavetas: body?.numGavetas,
        campanaId: body?.campanaId,
        loteId: body?.loteId,
        observaciones: body?.observaciones,
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
      if (session.user.rol !== 'ADMIN' && pesaje.clasificacion) {
        const clasificacion = { ...pesaje.clasificacion, ajusteComprador: undefined };
        return NextResponse.json({ pesaje: { ...pesaje, clasificacion } });
      }
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
    const user = session.user;
    try {
      const body = await req.json();
      const clasificacion = await ClasificacionService.registrar({
        pesajeBrutoId: body?.pesajeBrutoId,
        gavetasExportacion: body?.gavetasExportacion,
        pesoExportacionBruto: body?.pesoExportacionBruto,
        gavetasNacional: body?.gavetasNacional,
        pesoNacionalBruto: body?.pesoNacionalBruto,
        pesoDescarte: body?.pesoDescarte,
        observaciones: body?.observaciones,
        forzar: body?.forzar,
        clasificadorId: user.id,
      });
      return NextResponse.json({ clasificacion }, { status: 201 });
    } catch (e) { return handleError(e); }
  },
};
