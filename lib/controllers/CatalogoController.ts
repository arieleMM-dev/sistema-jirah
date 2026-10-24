/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CAPA DE NEGOCIO — CatalogoController (MVC)                 ║
 * ║  Arquitectura de Tres Capas: Capa 2 (Negocio)               ║
 * ║                                                             ║
 * ║  Traduce errores de servicio a respuestas HTTP.             ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/auth/session';
import {
  CampanaService,
  LoteService,
  CompradorService,
} from '@/lib/services/catalogo.service';

// ── Error → HTTP status mapper ───────────────────────────────
const ERROR_MAP: Record<string, [number, string]> = {
  DATOS_INVALIDOS: [422, 'Revise los tipos, longitudes y valores de los datos del catálogo.'],
  CULTIVO_BLOQUEADO: [409, 'El cultivo no puede cambiar si la campaña ya tiene pesajes. Cree una campaña para el nuevo cultivo.'],
  PARAMETROS_INVALIDOS: [422, 'Los límites deben ser números positivos y el mínimo G debe superar al mínimo P'],
  FECHA_NACIMIENTO_INVALIDA: [422, 'La fecha de nacimiento debe ser una fecha válida'],
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
  TOLERANCIA_INVALIDA:    [422, 'El cuadre usa el margen fijo de ±4 % aprobado para la finca. No se configura por comprador.'],
};

function handleError(err: unknown) {
  if (err instanceof SyntaxError) return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  if (err && typeof err === 'object' && 'code' in err) {
    if (err.code === 'P2002') return NextResponse.json({ error: 'El identificador ya existe.' }, { status: 409 });
    if (err.code === 'P2003') return NextResponse.json({ error: 'La referencia seleccionada no existe.' }, { status: 422 });
  }
  const msg = err instanceof Error ? err.message : 'ERROR_DESCONOCIDO';
  const [status, detail] = ERROR_MAP[msg] ?? [500, 'Error interno del servidor'];
  return NextResponse.json({ error: detail }, { status });
}

async function leerDatos(req: NextRequest) {
  const body = await req.json();
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('DATOS_INVALIDOS');
  for (const campo of ['nombre', 'codigo', 'funda', 'cultivo', 'variedad', 'descripcion', 'ruc', 'contacto']) {
    if (body[campo] !== undefined && typeof body[campo] !== 'string') throw new Error('DATOS_INVALIDOS');
  }
  return body;
}

async function requireAdmin() {
  const session = await getAuthenticatedSession();
  if (!session) return null;
  const user = session.user;
  if (user.rol !== 'ADMIN') return null;
  return user;
}

// ═══════════════════════════════════════════════════
// CAMPAÑAS
// ═══════════════════════════════════════════════════
export const CampanaController = {
  async list(_req: NextRequest) {
    const session = await getAuthenticatedSession();
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    try {
      const campanas = await CampanaService.listar();
      return NextResponse.json({ campanas: session.user.rol === 'ADMIN' ? campanas : campanas
        .filter(c => c.isActive)
        .map(({ id, codigo, nombre, taraBase, isActive, minimoPGr, minimoGGr, versionParametros }) => ({ id, codigo, nombre, taraBase, isActive, minimoPGr, minimoGGr, versionParametros })) });
    } catch (e) { return handleError(e); }
  },

  async create(req: NextRequest) {
    const user = await requireAdmin();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    try {
      const body = await leerDatos(req);
      const campana = await CampanaService.crear(body);
      return NextResponse.json({ campana }, { status: 201 });
    } catch (e) { return handleError(e); }
  },

  async update(req: NextRequest, id: string) {
    const user = await requireAdmin();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    try {
      const body = await leerDatos(req);
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
    const session = await getAuthenticatedSession();
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    try {
      const lotes = await LoteService.listar();
      return NextResponse.json({ lotes: session.user.rol === 'ADMIN' ? lotes : lotes
        .filter(l => l.isActive)
        .map(({ id, codigo, nombre, isActive }) => ({ id, codigo, nombre, isActive })) });
    } catch (e) { return handleError(e); }
  },

  async create(req: NextRequest) {
    const user = await requireAdmin();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    try {
      const body = await leerDatos(req);
      const lote = await LoteService.crear(body);
      return NextResponse.json({ lote }, { status: 201 });
    } catch (e) { return handleError(e); }
  },

  async update(req: NextRequest, id: string) {
    const user = await requireAdmin();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    try {
      const body = await leerDatos(req);
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
      const body = await leerDatos(req);
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
      const body = await leerDatos(req);
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
