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
    taraBase?: number;
    compradorId?: string;
  }) {
    if (!input.codigo.trim()) throw new Error('CODIGO_REQUERIDO');
    if (!input.nombre.trim()) throw new Error('NOMBRE_REQUERIDO');
    if (!input.funda.trim())  throw new Error('FUNDA_REQUERIDA');

    const existente = await CampanaRepo.findByCodigo(input.codigo.trim().toUpperCase());
    if (existente) throw new Error('CODIGO_DUPLICADO');

    const tara = input.taraBase ?? 1.70;
    if (tara <= 0 || tara > 10) throw new Error('TARA_INVALIDA');

    return CampanaRepo.create({
      ...input,
      codigo: input.codigo.trim().toUpperCase(),
      nombre: input.nombre.trim(),
      funda:  input.funda.trim(),
      taraBase: tara,
    });
  },

  async actualizar(id: string, data: {
    nombre?: string;
    funda?: string;
    taraBase?: number;
    compradorId?: string | null;
  }) {
    const campana = await CampanaRepo.findById(id);
    if (!campana) throw new Error('CAMPANA_NO_ENCONTRADA');
    if (!campana.isActive) throw new Error('CAMPANA_INACTIVA');

    // Bloquear taraBase si ya hay pesajes registrados
    if (data.taraBase !== undefined && data.taraBase !== campana.taraBase) {
      const cnt = await CampanaRepo.countPesajes(id);
      if (cnt > 0) throw new Error('TARA_BLOQUEADA');
    }

    // Filtrar estrictamente solo los campos mutables y excepcionales
    const updateData = {
      ...(data.nombre !== undefined && { nombre: data.nombre.trim() }),
      ...(data.funda !== undefined && { funda: data.funda.trim() }),
      ...(data.taraBase !== undefined && { taraBase: data.taraBase }),
      ...(data.compradorId !== undefined && { compradorId: data.compradorId }),
    };

    return CampanaRepo.update(id, updateData);
  },

  async cerrar(id: string) {
    const campana = await CampanaRepo.findById(id);
    if (!campana) throw new Error('CAMPANA_NO_ENCONTRADA');
    if (!campana.isActive) throw new Error('CAMPANA_YA_CERRADA');

    // Verificar sincronización pendiente
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
  }) {
    if (!input.codigo.trim()) throw new Error('CODIGO_REQUERIDO');
    if (!input.nombre.trim()) throw new Error('NOMBRE_REQUERIDO');

    const existente = await LoteRepo.findByCodigo(input.codigo.trim().toUpperCase());
    if (existente) throw new Error('CODIGO_DUPLICADO');

    return LoteRepo.create({
      ...input,
      codigo: input.codigo.trim().toUpperCase(),
      nombre: input.nombre.trim(),
    });
  },

  async actualizar(id: string, data: {
    nombre?: string;
    hectareas?: number;
    descripcion?: string;
  }) {
    const lote = await LoteRepo.findById(id);
    if (!lote) throw new Error('LOTE_NO_ENCONTRADO');

    // Filtrar estrictamente solo los campos permitidos (Código es inmutable)
    const updateData = {
      ...(data.nombre !== undefined && { nombre: data.nombre.trim() }),
      ...(data.hectareas !== undefined && { hectareas: data.hectareas }),
      ...(data.descripcion !== undefined && { descripcion: data.descripcion }),
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
    if (!input.nombre.trim()) throw new Error('NOMBRE_REQUERIDO');

    if (input.ruc) {
      const dup = await CompradorRepo.findByRuc(input.ruc.trim());
      if (dup) throw new Error('RUC_DUPLICADO');
    }

    const tol = input.toleranciaPct ?? 4.0;
    if (tol < 0 || tol > 100) throw new Error('TOLERANCIA_INVALIDA');

    return CompradorRepo.create({
      ...input,
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
