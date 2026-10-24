/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CAPA DE DATOS — CatalogoRepository                         ║
 * ║  Arquitectura de Tres Capas: Capa 3 (Datos)                 ║
 * ║                                                             ║
 * ║  Acceso a Campañas, Lotes y Compradores vía Prisma.         ║
 * ║  NO contiene reglas de negocio.                             ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { prisma } from '@/lib/prisma';
import type { TipoComprador } from '@prisma/client';

// ─── CAMPAÑAS ───────────────────────────────────────────────────
export const CampanaRepo = {
  async findAll() {
    return prisma.campana.findMany({
      include: { comprador: { select: { id: true, nombre: true, tipo: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findById(id: string) {
    return prisma.campana.findUnique({
      where: { id },
      include: { comprador: { select: { id: true, nombre: true } }, pesajesBrutos: { select: { id: true } } },
    });
  },

  async findByCodigo(codigo: string) {
    return prisma.campana.findUnique({ where: { codigo } });
  },

  async create(data: {
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
    return prisma.campana.create({ data: { ...data, parametros: { create: {
      version: 1, taraBase: data.taraBase ?? 1.7, minimoPGr: data.minimoPGr ?? 180, minimoGGr: data.minimoGGr ?? 280,
    } } }, include: { comprador: { select: { id: true, nombre: true, tipo: true } } } });
  },

  async update(id: string, data: {
    nombre?: string;
    funda?: string;
    cultivo?: string;
    taraBase?: number;
    compradorId?: string | null;
    minimoPGr?: number;
    minimoGGr?: number;
    fechaNacimiento?: string | null;
  }) {
    return prisma.$transaction(async tx => {
      const actual = await tx.campana.findUniqueOrThrow({ where: { id } });
      const parametros = { taraBase: data.taraBase ?? actual.taraBase, minimoPGr: data.minimoPGr ?? actual.minimoPGr, minimoGGr: data.minimoGGr ?? actual.minimoGGr };
      const cambio = parametros.taraBase !== actual.taraBase || parametros.minimoPGr !== actual.minimoPGr || parametros.minimoGGr !== actual.minimoGGr;
      // Conserva también la versión inicial de campañas creadas por semillas anteriores.
      await tx.parametrosCampana.upsert({ where: { campanaId_version: { campanaId: id, version: actual.versionParametros } }, update: {},
        create: { campanaId: id, version: actual.versionParametros, taraBase: actual.taraBase, minimoPGr: actual.minimoPGr, minimoGGr: actual.minimoGGr } });
      if (cambio) await tx.parametrosCampana.create({ data: { campanaId: id, version: actual.versionParametros + 1, ...parametros } });
      return tx.campana.update({ where: { id }, data: { ...data, versionParametros: actual.versionParametros + (cambio ? 1 : 0) }, include: { comprador: { select: { id: true, nombre: true, tipo: true } } } });
    });
  },

  findParametros(campanaId: string, version: number) {
    return prisma.parametrosCampana.findUnique({ where: { campanaId_version: { campanaId, version } } });
  },

  async cerrar(id: string) {
    return prisma.campana.update({ where: { id }, data: { isActive: false, cerradaAt: new Date() } });
  },

  async countPesajes(campanaId: string) {
    return prisma.pesajeBruto.count({ where: { campanaId } });
  },
};

// ─── LOTES ──────────────────────────────────────────────────────
export const LoteRepo = {
  async findAll() {
    return prisma.lote.findMany({ orderBy: { createdAt: 'desc' } });
  },

  async findActive() {
    return prisma.lote.findMany({ where: { isActive: true }, orderBy: { codigo: 'asc' } });
  },

  async findById(id: string) {
    return prisma.lote.findUnique({ where: { id } });
  },

  async findByCodigo(codigo: string) {
    return prisma.lote.findUnique({ where: { codigo } });
  },

  async create(data: {
    codigo: string;
    nombre: string;
    hectareas?: number;
    descripcion?: string;
    variedad?: string;
  }) {
    return prisma.lote.create({ data });
  },

  async update(id: string, data: {
    nombre?: string;
    hectareas?: number;
    descripcion?: string;
    variedad?: string | null;
  }) {
    return prisma.lote.update({ where: { id }, data });
  },

  async softDelete(id: string) {
    return prisma.lote.update({ where: { id }, data: { isActive: false, inactivadoAt: new Date() } });
  },

  async countPesajes(loteId: string) {
    return prisma.pesajeBruto.count({ where: { loteId } });
  },
};

// ─── COMPRADORES ────────────────────────────────────────────────
export const CompradorRepo = {
  async findAll() {
    return prisma.comprador.findMany({ orderBy: { createdAt: 'desc' } });
  },

  async findActive() {
    return prisma.comprador.findMany({ where: { isActive: true }, orderBy: { nombre: 'asc' } });
  },

  async findById(id: string) {
    return prisma.comprador.findUnique({ where: { id } });
  },

  async findByRuc(ruc: string) {
    return prisma.comprador.findFirst({ where: { ruc } });
  },

  async create(data: {
    nombre: string;
    ruc?: string;
    tipo: TipoComprador;
    contacto?: string;
    toleranciaPct?: number;
  }) {
    return prisma.comprador.create({ data });
  },

  async update(id: string, data: {
    nombre?: string;
    ruc?: string;
    tipo?: TipoComprador;
    contacto?: string;
    toleranciaPct?: number;
  }) {
    return prisma.comprador.update({ where: { id }, data });
  },

  async softDelete(id: string) {
    return prisma.comprador.update({ where: { id }, data: { isActive: false } });
  },
};
