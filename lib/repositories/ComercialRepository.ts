import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { TAMANO_PAGINA } from '@/lib/paginacion';

const persona = { id: true, nombres: true, apellidos: true } as const;
const jornadaSelect = { id: true, fecha: true, campana: { select: { codigo: true } }, lote: { select: { codigo: true } } } as const;
const anulacionInclude = { include: { responsable: { select: persona } } } as const;
export const entregaInclude = {
  anulacion: anulacionInclude,
  comprador: { select: { id: true, nombre: true, tipo: true } }, responsable: { select: persona },
  detalles: { include: { clasificacion: { select: { jornada: { select: jornadaSelect } } } } },
  devoluciones: { include: { anulacion: anulacionInclude, responsable: { select: persona }, reventas: { where: { entrega: { anulacion: null } }, select: { pesoNetoKg: true } } } },
} satisfies Prisma.EntregaInclude;

type Reserva = { id: string; version: number };
async function administrador(tx: Prisma.TransactionClient, id: string) {
  const actor = await tx.user.findUnique({ where: { id }, select: { rol: true, isActive: true } });
  if (!actor?.isActive || actor.rol !== 'ADMIN') throw new Error('NO_AUTORIZADO');
}
export const ComercialRepo = {
  findEntrega(id: string) { return prisma.entrega.findUnique({ where: { id }, include: entregaInclude }); },
  findDevolucion(id: string) { return prisma.devolucion.findUnique({ where: { id } }); },
  contexto(opciones: { pagina?: number; incluirHistorial?: boolean; clasificacionIds?: string[]; devolucionIds?: string[]; compradorId?: string } = {}) {
    const historial = opciones.incluirHistorial !== false;
    return prisma.$transaction([
      prisma.comprador.findMany({ where: { isActive: true, id: opciones.compradorId }, select: { id: true, nombre: true, tipo: true } }),
      prisma.clasificacionJornada.findMany({ where: { ...(opciones.clasificacionIds && { id: { in: opciones.clasificacionIds } }), jornada: { estado: { in: ['CLASIFICADA', 'APROBADA'] } } },
        include: { detalles: true, entregas: { where: { entrega: { anulacion: null } }, select: { categoria: true, pesoNetoKg: true } },
          jornada: { select: jornadaSelect } } }),
      prisma.devolucion.findMany({ where: { ...(opciones.devolucionIds && { id: { in: opciones.devolucionIds } }), anulacion: null, entrega: { anulacion: null } }, include: { reventas: { where: { entrega: { anulacion: null } }, select: { pesoNetoKg: true } } } }),
      prisma.entrega.findMany({ where: historial ? {} : { id: { in: [] } }, include: entregaInclude, orderBy: [{ fecha: 'desc' }, { id: 'asc' }], skip: ((opciones.pagina ?? 1) - 1) * TAMANO_PAGINA, take: TAMANO_PAGINA }),
      prisma.entrega.count({ where: historial ? {} : { id: { in: [] } } }),
    ]);
  },
  saveEntrega(data: Prisma.EntregaUncheckedCreateInput, clasificaciones: Reserva[], devoluciones: Reserva[]) {
    return prisma.$transaction(async tx => {
      await administrador(tx, data.responsableId);
      for (const r of clasificaciones) {
        const result = await tx.clasificacionJornada.updateMany({ where: { id: r.id, versionComercial: r.version,
          jornada: { estado: { in: ['CLASIFICADA', 'APROBADA'] } } }, data: { versionComercial: { increment: 1 } } });
        if (result.count !== 1) throw new Error('CONFLICTO_COMERCIAL');
      }
      for (const r of devoluciones) {
        const result = await tx.devolucion.updateMany({ where: { id: r.id, version: r.version, anulacion: null, entrega: { anulacion: null } }, data: { version: { increment: 1 } } });
        if (result.count !== 1) throw new Error('CONFLICTO_COMERCIAL');
      }
      return tx.entrega.create({ data, include: entregaInclude });
    });
  },
  saveDevolucion(data: Prisma.DevolucionUncheckedCreateInput, version: number) {
    return prisma.$transaction(async tx => {
      await administrador(tx, data.responsableId);
      const result = await tx.entrega.updateMany({ where: { id: data.entregaId, version, anulacion: null }, data: { version: { increment: 1 } } });
      if (result.count !== 1) throw new Error('CONFLICTO_COMERCIAL');
      return tx.devolucion.create({ data });
    });
  },
};
