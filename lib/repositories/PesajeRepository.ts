/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CAPA DE DATOS — PesajeRepository                           ║
 * ║  Acceso a PesajeBruto y Clasificacion vía Prisma.           ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { prisma } from '@/lib/prisma';

export const PesajeRepo = {
  async findAll(filtros: { campanaId?: string; loteId?: string; agricultorId?: string } = {}) {
    return prisma.pesajeBruto.findMany({
      where: filtros,
      include: {
        agricultor: { select: { id: true, nombres: true, apellidos: true } },
        campana:    { select: { id: true, codigo: true, nombre: true, taraBase: true } },
        lote:       { select: { id: true, codigo: true, nombre: true } },
        clasificacion: { select: { id: true, syncStatus: true } },
      },
      orderBy: { fechaRegistro: 'desc' },
    });
  },

  async findById(id: string) {
    return prisma.pesajeBruto.findUnique({
      where: { id },
      include: {
        agricultor: true,
        campana:    true,
        lote:       true,
        clasificacion: { include: { ajusteComprador: { include: { comprador: true } } } },
      },
    });
  },

  /** Pesajes sin clasificación del día actual */
  async findPendientesClasificacion() {
    return prisma.pesajeBruto.findMany({
      where: { clasificacion: null },
      include: {
        agricultor: { select: { nombres: true, apellidos: true } },
        campana:    { select: { codigo: true, nombre: true, taraBase: true } },
        lote:       { select: { codigo: true, nombre: true } },
      },
      orderBy: { fechaRegistro: 'desc' },
    });
  },

  async create(data: {
    pesoBrutoKg: number;
    numGavetas: number;
    taraTotal: number;
    pesoNetoKg: number;
    observaciones?: string;
    agricultorId: string;
    campanaId: string;
    loteId: string;
  }) {
    return prisma.pesajeBruto.create({
      data: { ...data, syncStatus: 'SYNCED', syncedAt: new Date() },
      include: {
        campana: true,
        lote:    true,
      },
    });
  },
};

export const ClasificacionRepo = {
  async create(data: {
    gavetasExportacion: number;
    pesoExportacionBruto: number;
    pesoExportacionKg: number;
    gavetasNacional: number;
    pesoNacionalBruto: number;
    pesoNacionalKg: number;
    pesoDescarte: number;
    totalClasificado: number;
    margenErrorPct: number;
    dentroDelMargen: boolean;
    auditFlag: boolean;
    observaciones?: string;
    pesajeBrutoId: string;
    clasificadorId: string;
  }) {
    return prisma.clasificacion.create({
      data: { ...data, syncStatus: 'SYNCED' },
    });
  },

  async findByPesaje(pesajeBrutoId: string) {
    return prisma.clasificacion.findUnique({
      where: { pesajeBrutoId },
      include: { pesajeBruto: { include: { campana: true, lote: true } } },
    });
  },
};
