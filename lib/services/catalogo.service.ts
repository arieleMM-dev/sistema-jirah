/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CAPA DE NEGOCIO — CatalogoService                          ║
 * ║  Arquitectura de Tres Capas: Capa 2 (Negocio)               ║
 * ║                                                             ║
 * ║  Reglas de negocio para CU-04:                              ║
 * ║  · Código/RUC único                                         ║
 * ║  · Bloquear tara si ya hay pesajes                          ║
 * ║  · No cerrar campaña con pesajes PENDING                    ║
 * ║  · No inactivar lote con campaña activa usando ese lote     ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { CampanaRepo, LoteRepo, CompradorRepo } from '@/lib/repositories/CatalogoRepository';
import type { TipoComprador } from '@prisma/client';

function texto(value: unknown, requerido = false, max = 200) {
  if (value === undefined && !requerido) return;
  if (typeof value !== 'string' || value.length > max || (requerido && !value.trim())) throw new Error('DATOS_INVALIDOS');
}
function validarBase(data: { nombre?: string }, crear: boolean) { texto(data.nombre, crear || data.nombre !== undefined); }

function validarParametros(minimoPGr: number, minimoGGr: number, fechaNacimiento?: string | null) {
  if (!Number.isFinite(minimoPGr) || !Number.isFinite(minimoGGr) || minimoPGr <= 0 || minimoGGr <= minimoPGr) throw new Error('PARAMETROS_INVALIDOS');
  if (fechaNacimiento != null && (typeof fechaNacimiento !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento) ||
    !Number.isFinite(new Date(fechaNacimiento).getTime()) || new Date(fechaNacimiento).toISOString().slice(0, 10) !== fechaNacimiento)) throw new Error('FECHA_NACIMIENTO_INVALIDA');
}

// ─── CAMPAÑAS ───────────────────────────────────────────────────
export const CampanaService = {
  async listar() {
    return CampanaRepo.findAll();
  },

  async obtener(id: string) {
    const c = await CampanaRepo.findById(id);
    if (!c) throw new Error('CAMPANA_NO_ENCONTRADA');
    return c;
  },

  async crear(input: {
    codigo: string;
    nombre: string;
    funda: string;
    cultivo?: string;
    taraBase?: number;
    compradorId?: string | null;
    minimoPGr?: number;
    minimoGGr?: number;
    fechaNacimiento?: string | null;
  }) {
    validarBase(input, true); texto(input.codigo, true); texto(input.funda, true); texto(input.cultivo, input.cultivo !== undefined);
    if (input.compradorId !== null) texto(input.compradorId);
    if (!input.codigo.trim()) throw new Error('CODIGO_REQUERIDO');
    if (!input.nombre.trim()) throw new Error('NOMBRE_REQUERIDO');
    if (!input.funda.trim())  throw new Error('FUNDA_REQUERIDA');

    const existente = await CampanaRepo.findByCodigo(input.codigo.trim().toUpperCase());
    if (existente) throw new Error('CODIGO_DUPLICADO');

    const tara = input.taraBase ?? 1.70;
    if (!Number.isFinite(tara) || tara <= 0 || tara > 10) throw new Error('TARA_INVALIDA');
    const minimoPGr = input.minimoPGr ?? 180;
    const minimoGGr = input.minimoGGr ?? 280;
    validarParametros(minimoPGr, minimoGGr, input.fechaNacimiento);

    return CampanaRepo.create({
      compradorId: input.compradorId,
      minimoPGr, minimoGGr, fechaNacimiento: input.fechaNacimiento,
      codigo: input.codigo.trim().toUpperCase(),
      nombre: input.nombre.trim(),
      funda:  input.funda.trim(),
      cultivo: input.cultivo?.trim() ?? 'Pitahaya',
      taraBase: tara,
    });
  },

  async actualizar(id: string, data: {
    nombre?: string;
    funda?: string;
    cultivo?: string;
    taraBase?: number;
    compradorId?: string | null;
    minimoPGr?: number;
    minimoGGr?: number;
    fechaNacimiento?: string | null;
  }) {
    validarBase(data, false); texto(data.funda, data.funda !== undefined); texto(data.cultivo, data.cultivo !== undefined);
    if (data.compradorId !== null) texto(data.compradorId);
    if (data.taraBase !== undefined && (!Number.isFinite(data.taraBase) || data.taraBase <= 0 || data.taraBase > 10)) {
      throw new Error('TARA_INVALIDA');
    }
    const campana = await CampanaRepo.findById(id);
    if (!campana) throw new Error('CAMPANA_NO_ENCONTRADA');
    if (!campana.isActive) throw new Error('CAMPANA_INACTIVA');
    if (data.cultivo !== undefined && data.cultivo.trim() !== campana.cultivo && await CampanaRepo.countPesajes(id) > 0) throw new Error('CULTIVO_BLOQUEADO');
    validarParametros(data.minimoPGr ?? campana.minimoPGr, data.minimoGGr ?? campana.minimoGGr, data.fechaNacimiento);

    // Bloquear taraBase si ya hay pesajes registrados
    if (data.taraBase !== undefined && data.taraBase !== campana.taraBase) {
      const cnt = await CampanaRepo.countPesajes(id);
      if (cnt > 0) throw new Error('TARA_BLOQUEADA');
    }

    // Filtrar estrictamente solo los campos mutables y excepcionales
    const updateData = {
      ...(data.nombre !== undefined && { nombre: data.nombre.trim() }),
      ...(data.funda !== undefined && { funda: data.funda.trim() }),
      ...(data.cultivo !== undefined && { cultivo: data.cultivo.trim() }),
      ...(data.taraBase !== undefined && { taraBase: data.taraBase }),
      ...(data.compradorId !== undefined && { compradorId: data.compradorId }),
      ...(data.minimoPGr !== undefined && { minimoPGr: data.minimoPGr }),
      ...(data.minimoGGr !== undefined && { minimoGGr: data.minimoGGr }),
      ...(data.fechaNacimiento !== undefined && { fechaNacimiento: data.fechaNacimiento }),
    };

    return CampanaRepo.update(id, updateData);
  },

  async cerrar(id: string) {
    const campana = await CampanaRepo.findById(id);
    if (!campana) throw new Error('CAMPANA_NO_ENCONTRADA');
    if (!campana.isActive) throw new Error('CAMPANA_YA_CERRADA');

    // Solo puede comprobarse la información central. El cierre conserva su fecha
    // para recibir después capturas anteriores que aún estén en los teléfonos.
    const { prisma } = await import('@/lib/prisma');
    const pendientes = await prisma.pesajeBruto.count({
      where: { campanaId: id, syncStatus: 'PENDING' },
    });
    if (pendientes > 0) throw new Error('SYNC_PENDIENTE');

    return CampanaRepo.cerrar(id);
  },
};

// ─── LOTES ──────────────────────────────────────────────────────
export const LoteService = {
  async listar() {
    return LoteRepo.findAll();
  },

  async crear(input: {
    codigo: string;
    nombre: string;
    hectareas?: number;
    descripcion?: string;
    variedad?: string;
  }) {
    validarBase(input, true); texto(input.codigo, true); texto(input.descripcion, false, 2000); texto(input.variedad);
    if (input.hectareas !== undefined && (!Number.isFinite(input.hectareas) || input.hectareas <= 0)) throw new Error('DATOS_INVALIDOS');
    if (!input.codigo.trim()) throw new Error('CODIGO_REQUERIDO');
    if (!input.nombre.trim()) throw new Error('NOMBRE_REQUERIDO');

    const existente = await LoteRepo.findByCodigo(input.codigo.trim().toUpperCase());
    if (existente) throw new Error('CODIGO_DUPLICADO');

    return LoteRepo.create({
      hectareas: input.hectareas, descripcion: input.descripcion?.trim(), variedad: input.variedad?.trim(),
      codigo: input.codigo.trim().toUpperCase(),
      nombre: input.nombre.trim(),
    });
  },

  async actualizar(id: string, data: {
    nombre?: string;
    hectareas?: number;
    descripcion?: string;
    variedad?: string;
  }) {
    validarBase(data, false); texto(data.descripcion, false, 2000); texto(data.variedad);
    if (data.hectareas !== undefined && (!Number.isFinite(data.hectareas) || data.hectareas <= 0)) throw new Error('DATOS_INVALIDOS');
    const lote = await LoteRepo.findById(id);
    if (!lote) throw new Error('LOTE_NO_ENCONTRADO');

    // Filtrar estrictamente solo los campos permitidos (Código es inmutable)
    const updateData = {
      ...(data.nombre !== undefined && { nombre: data.nombre.trim() }),
      ...(data.hectareas !== undefined && { hectareas: data.hectareas }),
      ...(data.descripcion !== undefined && { descripcion: data.descripcion }),
      ...(data.variedad !== undefined && { variedad: data.variedad.trim() || null }),
    };

    return LoteRepo.update(id, updateData);
  },

  async eliminar(id: string) {
    const lote = await LoteRepo.findById(id);
    if (!lote) throw new Error('LOTE_NO_ENCONTRADO');

    // Verificar si hay una campaña activa usando este lote
    const { prisma } = await import('@/lib/prisma');
    const enUso = await prisma.pesajeBruto.findFirst({
      where: { loteId: id, campana: { isActive: true } },
    });
    if (enUso) throw new Error('LOTE_EN_USO');

    return LoteRepo.softDelete(id);
  },
};

// ─── COMPRADORES ────────────────────────────────────────────────
export const CompradorService = {
  async listar() {
    return CompradorRepo.findAll();
  },

  async crear(input: {
    nombre: string;
    ruc?: string;
    tipo: TipoComprador;
    contacto?: string;
    toleranciaPct?: number;
  }) {
    validarBase(input, true); texto(input.ruc); texto(input.contacto);
    if (!['EXPORTADOR', 'MAYORISTA'].includes(input.tipo)) throw new Error('DATOS_INVALIDOS');
    if (!input.nombre.trim()) throw new Error('NOMBRE_REQUERIDO');

    if (input.ruc) {
      const dup = await CompradorRepo.findByRuc(input.ruc.trim());
      if (dup) throw new Error('RUC_DUPLICADO');
    }

    const tol = input.toleranciaPct ?? 4.0;
    if (tol !== 4) throw new Error('TOLERANCIA_INVALIDA');

    return CompradorRepo.create({
      tipo: input.tipo, contacto: input.contacto?.trim(),
      nombre: input.nombre.trim(),
      ruc: input.ruc?.trim() || undefined,
      toleranciaPct: tol,
    });
  },

  async actualizar(id: string, data: {
    nombre?: string;
    tipo?: TipoComprador;
    contacto?: string;
    toleranciaPct?: number;
  }) {
    validarBase(data, false); texto(data.contacto);
    if (data.tipo !== undefined && !['EXPORTADOR', 'MAYORISTA'].includes(data.tipo)) throw new Error('DATOS_INVALIDOS');
    if (data.toleranciaPct !== undefined && data.toleranciaPct !== 4) {
      throw new Error('TOLERANCIA_INVALIDA');
    }
    const comp = await CompradorRepo.findById(id);
    if (!comp) throw new Error('COMPRADOR_NO_ENCONTRADO');

    if (data.nombre !== undefined && !data.nombre.trim()) {
      throw new Error('NOMBRE_REQUERIDO');
    }

    // Filtrar estrictamente solo los campos mutables y excepcionales (RUC es inmutable)
    const updateData = {
      ...(data.nombre !== undefined && { nombre: data.nombre.trim() }),
      ...(data.tipo !== undefined && { tipo: data.tipo }),
      ...(data.contacto !== undefined && { contacto: data.contacto }),
      ...(data.toleranciaPct !== undefined && { toleranciaPct: data.toleranciaPct }),
    };

    return CompradorRepo.update(id, updateData);
  },

  async eliminar(id: string) {
    const comp = await CompradorRepo.findById(id);
    if (!comp) throw new Error('COMPRADOR_NO_ENCONTRADO');
    return CompradorRepo.softDelete(id);
  },
};
