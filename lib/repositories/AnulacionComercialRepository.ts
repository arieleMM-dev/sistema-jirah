import { prisma } from '@/lib/prisma';
import { entregaInclude } from '@/lib/repositories/ComercialRepository';

type Anulacion = { id: string; movimientoId: string; tipo: 'ENTREGA' | 'DEVOLUCION'; motivo: string; responsableId: string; huella: string };
export const AnulacionComercialRepo = {
  find(id: string) { return prisma.anulacionComercial.findUnique({ where: { id } }); },
  save(input: Anulacion) {
    return prisma.$transaction(async tx => {
      const actor = await tx.user.findUnique({ where: { id: input.responsableId }, select: { rol: true, isActive: true } });
      if (!actor?.isActive || actor.rol !== 'ADMIN') throw new Error('NO_AUTORIZADO');
      let antes: string;
      if (input.tipo === 'ENTREGA') {
        const e = await tx.entrega.findUnique({ where: { id: input.movimientoId }, include: entregaInclude });
        if (!e) throw new Error('MOVIMIENTO_NO_ENCONTRADO');
        if (e.anulacion) throw new Error('MOVIMIENTO_ANULADO');
        if (e.devoluciones.some(d => !d.anulacion)) throw new Error('DEPENDENCIAS_ACTIVAS');
        const claim = await tx.entrega.updateMany({ where: { id: e.id, version: e.version, anulacion: null }, data: { version: { increment: 1 } } });
        if (claim.count !== 1) throw new Error('CONFLICTO_COMERCIAL');
        // Cambiar versiones invalida cualquier reserva de saldo calculada antes de anular.
        const clasificaciones = [...new Set(e.detalles.flatMap(d => d.clasificacionId ? [d.clasificacionId] : []))];
        const devoluciones = [...new Set(e.detalles.flatMap(d => d.devolucionId ? [d.devolucionId] : []))];
        await tx.clasificacionJornada.updateMany({ where: { id: { in: clasificaciones } }, data: { versionComercial: { increment: 1 } } });
        await tx.devolucion.updateMany({ where: { id: { in: devoluciones } }, data: { version: { increment: 1 } } });
        antes = JSON.stringify(e);
      } else {
        const d = await tx.devolucion.findUnique({ where: { id: input.movimientoId }, include: { anulacion: true, reventas: { include: { entrega: { select: { anulacion: true } } } } } });
        if (!d) throw new Error('MOVIMIENTO_NO_ENCONTRADO');
        if (d.anulacion) throw new Error('MOVIMIENTO_ANULADO');
        if (d.reventas.some(v => !v.entrega.anulacion)) throw new Error('DEPENDENCIAS_ACTIVAS');
        const claim = await tx.devolucion.updateMany({ where: { id: d.id, version: d.version, anulacion: null }, data: { version: { increment: 1 } } });
        if (claim.count !== 1) throw new Error('CONFLICTO_COMERCIAL');
        await tx.entrega.update({ where: { id: d.entregaId }, data: { version: { increment: 1 } } });
        antes = JSON.stringify(d);
      }
      return tx.anulacionComercial.create({ data: { id: input.id, motivo: input.motivo, responsableId: input.responsableId, huella: input.huella, antes,
        entregaId: input.tipo === 'ENTREGA' ? input.movimientoId : null, devolucionId: input.tipo === 'DEVOLUCION' ? input.movimientoId : null } });
    });
  },
};
