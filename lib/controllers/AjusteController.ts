/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CAPA DE NEGOCIO — AjusteController (CU-05.3)               ║
 * ║  MVC: traduce errores de servicio a respuestas HTTP.        ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './AuthController';
import { AjusteService } from '@/lib/services/ajuste.service';

const ERROR_MAP: Record<string, [number, string]> = {
  CLASIFICACION_NO_ENCONTRADA: [404, 'Clasificación no encontrada'],
  AJUSTE_YA_REGISTRADO:        [409, 'Ya existe un ajuste registrado para esta clasificación.'],
  PESO_RECHAZADO_INVALIDO:     [422, 'El peso rechazado debe ser mayor o igual a 0.'],
  RECHAZO_EXCEDE_EXPORTACION:  [422, 'Error: El rechazo no puede ser mayor al volumen despachado.'],
  COMPRADOR_NO_ENCONTRADO:     [404, 'Comprador no encontrado'],
  AJUSTE_NO_ENCONTRADO:        [404, 'Ajuste no encontrado'],
};

function handleError(err: unknown) {
  const msg = err instanceof Error ? err.message : 'ERROR';
  const [status, detail] = ERROR_MAP[msg] ?? [500, 'Error interno del servidor'];
  return NextResponse.json({ error: detail }, { status });
}

export const AjusteController = {
  /**
   * GET /api/campo/ajustes
   * CU-05.3 — Listar historial de ajustes de comprador.
   */
  async list(_req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    try {
      const ajustes = await AjusteService.listar();
      return NextResponse.json({ ajustes });
    } catch (e) { return handleError(e); }
  },

  /**
   * POST /api/campo/ajustes
   * CU-05.3 — Registrar ajuste de comprador (peso rechazado).
   */
  async create(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    try {
      const body = await req.json();

      if (!body.clasificacionId || !body.compradorId) {
        return NextResponse.json(
          { error: 'clasificacionId y compradorId son obligatorios' },
          { status: 400 }
        );
      }

      if (body.pesoRechazado === undefined || body.pesoRechazado === null) {
        return NextResponse.json(
          { error: 'pesoRechazado es obligatorio' },
          { status: 400 }
        );
      }

      const resultado = await AjusteService.registrar({
        clasificacionId: body.clasificacionId,
        compradorId: body.compradorId,
        pesoRechazado: Number(body.pesoRechazado),
        motivoRechazo: body.motivoRechazo,
        observaciones: body.observaciones,
      });

      return NextResponse.json(resultado, { status: 201 });
    } catch (e) { return handleError(e); }
  },

  /**
   * GET /api/campo/ajustes/[id]
   * CU-05.3 — Obtener detalle de un ajuste.
   */
  async get(_req: NextRequest, id: string) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    try {
      const ajuste = await AjusteService.obtener(id);
      return NextResponse.json({ ajuste });
    } catch (e) { return handleError(e); }
  },
};
