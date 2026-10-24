import { prisma } from '@/lib/prisma';
import { jornadaInclude } from '@/lib/repositories/JornadaRepository';
import { rangoFechasFinca, validarFiltros, type FiltrosCosecha } from '@/lib/filtros-cosecha';
import { entregaInclude } from '@/lib/repositories/ComercialRepository';

export const ReporteRepo = {
  comercial(clasificacionIds: string[]) {
    return prisma.entrega.findMany({ where: { OR: [
      { detalles: { some: { clasificacionId: { in: clasificacionIds } } } },
      { detalles: { some: { devolucion: { entrega: { detalles: { some: { clasificacionId: { in: clasificacionIds } } } } } } } },
    ] }, include: entregaInclude, orderBy: [{ fecha: 'asc' }, { id: 'asc' }] });
  },
  revisiones(jornadaIds: string[]) {
    return prisma.revisionJornada.findMany({ where: { jornadaId: { in: jornadaIds } },
      select: { id: true, jornadaId: true, motivo: true, antes: true, despues: true, createdAt: true,
        responsable: { select: { nombres: true, apellidos: true } } }, orderBy: { createdAt: 'asc' } });
  },
  obtener(filtros: FiltrosCosecha) {
    const f = validarFiltros(filtros);
    const fechas = rangoFechasFinca(f);
    return prisma.$transaction([
      prisma.jornadaCosecha.findMany({
        where: { campanaId: f.campanaId, loteId: f.loteId, fecha: { gte: f.fechaDesde, lte: f.fechaHasta } },
        include: jornadaInclude, orderBy: [{ fecha: 'asc' }, { loteId: 'asc' }, { campanaId: 'asc' }],
      }),
      prisma.pesajeBruto.findMany({
        where: { jornadaId: null, campanaId: f.campanaId, loteId: f.loteId,
          fechaRegistro: { gte: fechas.fechaDesde, lte: fechas.fechaHasta } },
        select: { id: true, fechaRegistro: true, numGavetas: true, pesoBrutoKg: true, taraTotal: true, pesoNetoKg: true,
          observaciones: true, campana: { select: { codigo: true } }, lote: { select: { codigo: true } },
          agricultor: { select: { nombres: true, apellidos: true } },
          clasificacion: { select: { pesoExportacionKg: true, pesoNacionalKg: true, pesoDescarte: true } } },
        orderBy: [{ fechaRegistro: 'asc' }, { id: 'asc' }],
      }),
    ]);
  },
  opciones() {
    return prisma.$transaction([
      prisma.campana.findMany({ select: { id: true, codigo: true, nombre: true }, orderBy: { codigo: 'asc' } }),
      prisma.lote.findMany({ select: { id: true, codigo: true, nombre: true }, orderBy: { codigo: 'asc' } }),
    ]);
  },
};
