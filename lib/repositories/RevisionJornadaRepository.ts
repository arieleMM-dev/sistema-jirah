import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { jornadaInclude } from '@/lib/repositories/JornadaRepository';
import { huellaPesaje } from '@/lib/huella-pesaje';

type Correccion = {
  id: string; jornadaId: string; version: number; versionComercial: number; clasificacionId: string;
  responsableId: string; motivo: string; huella: string;
  pesajes: { id: string; numGavetas: number; pesoBrutoKg: number; pesoNetoKg: number; taraTotal: number }[];
  clasificacion: Prisma.ClasificacionJornadaUpdateInput;
  adicionales: { id: string; numGavetas: number; pesoBrutoKg: number; taraTotal: number; pesoNetoKg: number; fechaRegistro: Date;
    agricultorId: string; campanaId: string; loteId: string; observaciones?: string }[];
};
export const RevisionJornadaRepo = {
  find(id: string) { return prisma.revisionJornada.findUnique({ where: { id } }); },
  list(jornadaId: string) {
    return prisma.revisionJornada.findMany({ where: { jornadaId }, include: { responsable: { select: { nombres: true, apellidos: true } } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
  },
  save(input: Correccion) {
    return prisma.$transaction(async tx => {
      const actor = await tx.user.findUnique({ where: { id: input.responsableId }, select: { rol: true, isActive: true } });
      if (!actor?.isActive || actor.rol !== 'ADMIN') throw new Error('NO_AUTORIZADO');
      const antes = await tx.jornadaCosecha.findUnique({ where: { id: input.jornadaId }, include: jornadaInclude });
      if (!antes?.clasificacion || antes.estado === 'ABIERTA') throw new Error('CORRECCION_NO_PERMITIDA');
      if (await tx.detalleEntrega.count({ where: { clasificacionId: input.clasificacionId, entrega: { anulacion: null } } })) throw new Error('CORRECCION_NO_PERMITIDA');
      const claimed = await tx.jornadaCosecha.updateMany({ where: { id: input.jornadaId, version: input.version, estado: { not: 'ABIERTA' } },
        data: { version: { increment: 1 }, estado: input.clasificacion.dentroDelMargen === true ? 'CLASIFICADA' : 'PENDIENTE_APROBACION' } });
      if (claimed.count !== 1) throw new Error('JORNADA_MODIFICADA');
      const commercial = await tx.clasificacionJornada.updateMany({ where: { id: input.clasificacionId, versionComercial: input.versionComercial }, data: { versionComercial: { increment: 1 } } });
      if (commercial.count !== 1) throw new Error('CONFLICTO_COMERCIAL');
      for (const p of input.pesajes) await tx.pesajeBruto.update({ where: { id: p.id }, data: p });
      for (const p of input.adicionales) await tx.pesajeBruto.create({ data: { ...p, jornadaId: input.jornadaId,
        huellaCaptura: huellaPesaje(p), syncStatus: 'SYNCED', syncedAt: new Date() } });
      await tx.detalleClasificacionJornada.deleteMany({ where: { clasificacionId: input.clasificacionId } });
      await tx.clasificacionJornada.update({ where: { id: input.clasificacionId }, data: input.clasificacion });
      const despues = await tx.jornadaCosecha.findUniqueOrThrow({ where: { id: input.jornadaId }, include: jornadaInclude });
      return tx.revisionJornada.create({ data: { id: input.id, jornadaId: input.jornadaId, responsableId: input.responsableId,
        motivo: input.motivo, huella: input.huella, antes: JSON.stringify(antes), despues: JSON.stringify(despues) } });
    });
  },
};
