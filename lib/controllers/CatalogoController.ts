/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CAPA DE NEGOCIO — CatalogoController (MVC)                 ║
 * ║  Arquitectura de Tres Capas: Capa 2 (Negocio)               ║
 * ║                                                             ║
 * ║  Traduce errores de servicio a respuestas HTTP.             ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './AuthController';
import {
  CampanaService,
  LoteService,
  CompradorService,
} from '@/lib/services/catalogo.service';

// ── Error → HTTP status mapper ───────────────────────────────
const ERROR_MAP: Record<string, [number, string]> = {
  CODIGO_REQUERIDO:       [422, 'El código es obligatorio'],
  NOMBRE_REQUERIDO:       [422, 'El nombre/razón social es obligatorio'],
  FUNDA_REQUERIDA:        [422, 'El color de funda es obligatorio'],
  TARA_INVALIDA:          [422, 'El peso de tara debe estar entre 0 y 10 kg'],
  CODIGO_DUPLICADO:       [409, 'El código de campaña ingresado ya existe. Ingrese un identificador único.'],
  TARA_BLOQUEADA:         [409, 'No se puede modificar la tara porque ya existen pesajes registrados con esta campaña.'],
  CAMPANA_INACTIVA:       [409, 'La campaña ya está cerrada.'],
  CAMPANA_YA_CERRADA:     [409, 'La campaña ya está cerrada.'],
  CAMPANA_NO_ENCONTRADA:  [404, 'Campaña no encontrada'],
  SYNC_PENDIENTE:         [409, 'No se puede cerrar la campaña. Existen transacciones pendientes de sincronización.'],
  LOTE_NO_ENCONTRADO:     [404, 'Lote no encontrado'],
  LOTE_EN_USO:            [409, 'No se puede inactivar el lote. Hay una campaña activa operando sobre este lote.'],
  COMPRADOR_NO_ENCONTRADO:[404, 'Comprador no encontrado'],
  RUC_DUPLICADO:          [409, 'El comprador ya se encuentra en el directorio.'],
  TOLERANCIA_INVALIDA:    [422, 'La tolerancia debe ser un porcentaje entre 0 y 100'],
};

function handleError(err: unknown) {
  const msg = err instanceof Error ? err.message : 'ERROR_DESCONOCIDO';
  const [status, detail] = ERROR_MAP[msg] ?? [500, 'Error interno del servidor'];
  return NextResponse.json({ error: detail }, { status });
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const user = session.user as any;
  if (user.rol !== 'ADMIN') return null;
  return user;
}

// ═══════════════════════════════════════════════════
// CAMPAÑAS
// ═══════════════════════════════════════════════════
export const CampanaController = {
  async list(_req: NextRequest) {
    const user = await requireAdmin();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    try {
      const campanas = await CampanaService.listar();
      return NextResponse.json({ campanas });
    } catch (e) { return handleError(e); }
  },

  async create(req: NextRequest) {
    const user = await requireAdmin();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    try {
      const body = await req.json();
      const campana = await CampanaService.crear(body);
      return NextResponse.json({ campana }, { status: 201 });
    } catch (e) { return handleError(e); }
  },

  async update(req: NextRequest, id: string) {
    const user = await requireAdmin();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    try {
      const body = await req.json();
      const campana = await CampanaService.actualizar(id, body);
      return NextResponse.json({ campana });
    } catch (e) { return handleError(e); }
  },

  async close(_req: NextRequest, id: string) {
    const user = await requireAdmin();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    try {
      const campana = await CampanaService.cerrar(id);
      return NextResponse.json({ campana });
    } catch (e) { return handleError(e); }
  },
};

// ═══════════════════════════════════════════════════
// LOTES
// ═══════════════════════════════════════════════════
export const LoteController = {
  async list(_req: NextRequest) {
    const user = await requireAdmin();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    try {
      const lotes = await LoteService.listar();
      return NextResponse.json({ lotes });
    } catch (e) { return handleError(e); }
  },

  async create(req: NextRequest) {
    const user = await requireAdmin();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    try {
      const body = await req.json();
      const lote = await LoteService.crear(body);
      return NextResponse.json({ lote }, { status: 201 });
    } catch (e) { return handleError(e); }
  },

  async update(req: NextRequest, id: string) {
    const user = await requireAdmin();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    try {
      const body = await req.json();
      const lote = await LoteService.actualizar(id, body);
      return NextResponse.json({ lote });
    } catch (e) { return handleError(e); }
  },

  async remove(_req: NextRequest, id: string) {
    const user = await requireAdmin();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    try {
      await LoteService.eliminar(id);
      return NextResponse.json({ ok: true });
    } catch (e) { return handleError(e); }
  },
};

// ═══════════════════════════════════════════════════
// COMPRADORES
// ═══════════════════════════════════════════════════
export const CompradorController = {
  async list(_req: NextRequest) {
    const user = await requireAdmin();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    try {
      const compradores = await CompradorService.listar();
      return NextResponse.json({ compradores });
    } catch (e) { return handleError(e); }
  },

  async create(req: NextRequest) {
    const user = await requireAdmin();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    try {
      const body = await req.json();
      const nom = body.nombre?.trim() || '';
      const rucVal = body.ruc?.trim() || '';
      const contactoVal = body.contacto?.trim() || '';

      if (!nom || !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nom) || nom.length < 2 || nom.length > 50) {
        return NextResponse.json({ error: 'Razón Social inválida' }, { status: 400 });
      }
      if (rucVal && !/^\d{10}001$/.test(rucVal)) {
        return NextResponse.json({ error: 'El documento de identidad no es válido' }, { status: 400 });
      }
      if (contactoVal && !/^09\d{8}$/.test(contactoVal)) {
        return NextResponse.json({ error: 'Teléfono de contacto inválido' }, { status: 400 });
      }

      body.nombre = nom;
      if (rucVal) body.ruc = rucVal;
      if (contactoVal) body.contacto = contactoVal;

      const comprador = await CompradorService.crear(body);
      return NextResponse.json({ comprador }, { status: 201 });
    } catch (e) { return handleError(e); }
  },

  async update(req: NextRequest, id: string) {
    const user = await requireAdmin();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    try {
      const body = await req.json();
      const nom = body.nombre?.trim() || '';
      const rucVal = body.ruc?.trim() || '';
      const contactoVal = body.contacto?.trim() || '';

      if (!nom || !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nom) || nom.length < 2 || nom.length > 50) {
        return NextResponse.json({ error: 'Razón Social inválida' }, { status: 400 });
      }
      if (rucVal && !/^\d{10}001$/.test(rucVal)) {
        return NextResponse.json({ error: 'El documento de identidad no es válido' }, { status: 400 });
      }
      if (contactoVal && !/^09\d{8}$/.test(contactoVal)) {
        return NextResponse.json({ error: 'Teléfono de contacto inválido' }, { status: 400 });
      }

      body.nombre = nom;
      if (rucVal) body.ruc = rucVal;
      if (contactoVal) body.contacto = contactoVal;

      const comprador = await CompradorService.actualizar(id, body);
      return NextResponse.json({ comprador });
    } catch (e) { return handleError(e); }
  },

  async remove(_req: NextRequest, id: string) {
    const user = await requireAdmin();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    try {
      await CompradorService.eliminar(id);
      return NextResponse.json({ ok: true });
    } catch (e) { return handleError(e); }
  },
};
