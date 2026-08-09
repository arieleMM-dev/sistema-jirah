/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CAPA DE DATOS — CampanaRepository                          ║
 * ║  Arquitectura de Tres Capas: Capa 3 (Datos)                 ║
 * ║                                                             ║
 * ║  Responsabilidad: abstrae TODO acceso a los catálogos       ║
 * ║  Campana, Lote y Comprador de la base de datos.             ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { prisma } from '@/lib/prisma';
import type { Campana, Lote, Comprador, TipoComprador } from '@prisma/client';

// ─── Campanas ───────────────────────────────────────────────────
export const CampanaRepository = {
  /**
   * Obtiene todas las campañas ordenadas por código descendente.
   * Usado en: Módulo de pesaje para seleccionar la campaña activa.
   */
  async findAll(): Promise<Campana[]> {
    return prisma.campana.findMany({ orderBy: { codigo: 'desc' } });
  },

  /**
   * Obtiene la campaña más reciente (campaña activa actual).
   */
  async findActive(): Promise<Campana | null> {
    return prisma.campana.findFirst({ orderBy: { codigo: 'desc' } });
  },

  /**
   * Busca una campaña por código (ej: "2026-A").
   */
  async findByCodigo(codigo: string): Promise<Campana | null> {
    return prisma.campana.findUnique({ where: { codigo } });
  },

  /**
   * Crea una nueva campaña de cosecha.
   * @param taraBase - Tara base de la gaveta en kg. Default: 1.70 kg
   */
  async create(input: { codigo: string; nombre: string; funda: string; taraBase?: number }): Promise<Campana> {
    return prisma.campana.create({
      data: { ...input, taraBase: input.taraBase ?? 1.70 },
    });
  },
};

// ─── Lotes ──────────────────────────────────────────────────────
export const LoteRepository = {
  async findAll(): Promise<Lote[]> {
    return prisma.lote.findMany({ orderBy: { codigo: 'asc' } });
  },

  async findByCodigo(codigo: string): Promise<Lote | null> {
    return prisma.lote.findUnique({ where: { codigo } });
  },

  async create(input: { codigo: string; nombre: string; hectareas?: number }): Promise<Lote> {
    return prisma.lote.create({ data: input });
  },
};

// ─── Compradores ────────────────────────────────────────────────
export const CompradorRepository = {
  async findAll(): Promise<Comprador[]> {
    return prisma.comprador.findMany({ orderBy: { nombre: 'asc' } });
  },

  async findById(id: string): Promise<Comprador | null> {
    return prisma.comprador.findUnique({ where: { id } });
  },

  async create(input: { nombre: string; tipo: TipoComprador; contacto?: string }): Promise<Comprador> {
    return prisma.comprador.create({ data: input });
  },
};
