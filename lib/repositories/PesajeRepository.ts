/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CAPA DE DATOS — PesajeRepository                           ║
 * ║  Acceso a PesajeBruto y Clasificacion vía Prisma.           ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { prisma } from '@/lib/prisma';
import { randomUUID } from 'node:crypto';
import { huellaPesaje } from '@/lib/huella-pesaje';

export const PesajeRepo = {
  async findAll(filtros: { campanaId?: string; loteId?: string; agricultorId?: string } = {}, pagina = 1, limite = 25) {
    return prisma.pesajeBruto.findMany({
      where: filtros,
      include: {
        agricultor: { select: { id: true, nombres: true, apellidos: true } },
        campana:    { select: { id: true, codigo: true, nombre: true, taraBase: true } },
        lote:       { select: { id: true, codigo: true, nombre: true } },
        clasificacion: { select: { id: true, syncStatus: true } },
        jornada: { select: { id: true, fecha: true, estado: true } },
      },
      orderBy: [{ fechaRegistro: 'desc' }, { id: 'asc' }], skip: (pagina - 1) * limite, take: limite,
    });
  },

  async findById(id: string) {
    return prisma.pesajeBruto.findUnique({
      where: { id },
      include: {
        agricultor: { select: { id: true, nombres: true, apellidos: true } },
        campana:    true,
        lote:       true,
        clasificacion: { include: { ajusteComprador: { include: { comprador: true } } } },
      },
    });
  },

  /** Pesajes sin clasificación del día actual */
  async findPendientesClasificacion() {
    return prisma.pesajeBruto.findMany({
      where: { clasificacion: null, jornadaId: null },
      include: {
        agricultor: { select: { nombres: true, apellidos: true } },
        campana:    { select: { codigo: true, nombre: true, taraBase: true } },
        lote:       { select: { codigo: true, nombre: true } },
      },
      orderBy: { fechaRegistro: 'desc' },
    });
  },

  async create(data: {
    id?: string;
    fechaRegistro?: Date;
    pesoBrutoKg: number;
    numGavetas: number;
    taraTotal: number;
    pesoNetoKg: number;
    observaciones?: string;
    agricultorId: string;
    campanaId: string;
    loteId: string;
    jornada?: { id: string; fecha: string; taraBase: number; minimoPGr: number; minimoGGr: number };
  }) {
    const { jornada, ...pesaje } = data;
    return prisma.$transaction(async tx => {
      if (jornada) {
        const group = await tx.jornadaCosecha.upsert({ where: { id: jornada.id }, update: {},
          create: { ...jornada, campanaId: data.campanaId, loteId: data.loteId } });
        if (group.taraBase !== jornada.taraBase) throw new Error('TARA_JORNADA_CAMBIO');
        const updated = await tx.jornadaCosecha.updateMany({ where: { id: group.id, version: group.version, estado: 'ABIERTA' },
          data: { version: { increment: 1 } } });
        if (updated.count !== 1) throw new Error('JORNADA_CERRADA');
      }
      const captura = { ...pesaje, id: pesaje.id ?? randomUUID(), fechaRegistro: pesaje.fechaRegistro ?? new Date() };
      return tx.pesajeBruto.create({ data: { ...captura, huellaCaptura: huellaPesaje(captura), jornadaId: jornada?.id, syncStatus: 'SYNCED', syncedAt: new Date() },
        include: { campana: true, lote: true } });
    });
  },
};

export const ClasificacionRepo = {
  async findById(id: string) {
    return prisma.clasificacion.findUnique({ where: { id } });
  },

  async create(data: {
    id?: string;
    fechaRegistro?: Date;
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
