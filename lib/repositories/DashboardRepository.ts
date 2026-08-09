/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CAPA DE DATOS — DashboardRepository                        ║
 * ║  Queries agregadas para CU-06 Analytics                     ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { prisma } from '@/lib/prisma';

export const DashboardRepo = {
  async getStats(filtros: {
    fechaDesde?: Date;
    fechaHasta?: Date;
    loteId?: string;
    campanaId?: string;
  } = {}) {
    const where: any = {};
    if (filtros.fechaDesde || filtros.fechaHasta) {
      where.fechaRegistro = {};
      if (filtros.fechaDesde) where.fechaRegistro.gte = filtros.fechaDesde;
      if (filtros.fechaHasta) where.fechaRegistro.lte = filtros.fechaHasta;
    }
    if (filtros.loteId)    where.loteId    = filtros.loteId;
    if (filtros.campanaId) where.campanaId = filtros.campanaId;

    // KG cosechados
    const kgAggregate = await prisma.pesajeBruto.aggregate({
      where,
      _sum: { pesoNetoKg: true },
      _count: { id: true },
    });

    // Campaña activa
    const campanaActiva = await prisma.campana.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    // Lotes activos con actividad en el periodo
    const lotesConActividad = await prisma.pesajeBruto.findMany({
      where,
      select: { loteId: true },
      distinct: ['loteId'],
    });

    // Alertas de margen (clasificaciones fuera de ±4%)
    const alertasMargen = await prisma.clasificacion.count({
      where: { auditFlag: true },
    });

    // Actividad reciente (últimos 8 pesajes)
    const actividadReciente = await prisma.pesajeBruto.findMany({
      where,
      include: {
        agricultor: { select: { nombres: true, apellidos: true } },
        campana:    { select: { codigo: true } },
        lote:       { select: { codigo: true, nombre: true } },
        clasificacion: { select: { dentroDelMargen: true, auditFlag: true } },
      },
      orderBy: { fechaRegistro: 'desc' },
      take: 8,
    });

    // KG por lote para gráfico
    const pesajesRaw = await prisma.pesajeBruto.findMany({
      where,
      include: { lote: { select: { codigo: true } }, clasificacion: { select: { dentroDelMargen: true } } },
    });

    const kgPorLote: Record<string, { codigo: string; kg: number; alertas: number }> = {};
    for (const p of pesajesRaw) {
      if (!kgPorLote[p.loteId]) {
        kgPorLote[p.loteId] = { codigo: p.lote.codigo, kg: 0, alertas: 0 };
      }
      kgPorLote[p.loteId].kg += p.pesoNetoKg;
      if (p.clasificacion && !p.clasificacion.dentroDelMargen) {
        kgPorLote[p.loteId].alertas += 1;
      }
    }

    return {
      kgTotal:          +(kgAggregate._sum.pesoNetoKg ?? 0).toFixed(2),
      totalPesajes:     kgAggregate._count.id,
      campanaActiva,
      lotesConActividad: lotesConActividad.length,
      alertasMargen,
      actividadReciente,
      kgPorLote:        Object.values(kgPorLote).sort((a, b) => a.codigo.localeCompare(b.codigo)),
    };
  },

  async getCampanas() {
    return prisma.campana.findMany({ select: { id: true, codigo: true, nombre: true, isActive: true }, orderBy: { createdAt: 'desc' } });
  },

  async getLotes() {
    return prisma.lote.findMany({ where: { isActive: true }, select: { id: true, codigo: true, nombre: true }, orderBy: { codigo: 'asc' } });
  },
};
