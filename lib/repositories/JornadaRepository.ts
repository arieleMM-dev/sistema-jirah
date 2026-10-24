import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { TAMANO_PAGINA } from '@/lib/paginacion';

export const jornadaInclude = {
  campana: { select: { id: true, codigo: true, nombre: true, funda: true, cultivo: true } },
  lote: { select: { id: true, codigo: true, nombre: true } },
  pesajes: { orderBy: { id: 'asc' as const }, select: {
    id: true, numGavetas: true, pesoBrutoKg: true, pesoNetoKg: true, fechaRegistro: true,
    agricultor: { select: { id: true, nombres: true, apellidos: true } },
  } },
  clasificacion: { include: {
    detalles: true, clasificador: { select: { id: true, nombres: true, apellidos: true } },
    aprobador: { select: { id: true, nombres: true, apellidos: true } },
  } },
} satisfies Prisma.JornadaCosechaInclude;

const include = jornadaInclude;

export const JornadaRepo = {
  findById(id: string) { return prisma.jornadaCosecha.findUnique({ where: { id }, include }); },
  findAll(where: Prisma.JornadaCosechaWhereInput = {}) {
    return prisma.jornadaCosecha.findMany({ where, include, orderBy: [{ fecha: 'desc' }, { id: 'asc' }] });
  },
  findPage(where: Prisma.JornadaCosechaWhereInput, pagina: number) {
    return prisma.$transaction([
      prisma.jornadaCosecha.findMany({ where, include, orderBy: [{ fecha: 'desc' }, { id: 'asc' }], skip: (pagina - 1) * TAMANO_PAGINA, take: TAMANO_PAGINA }),
      prisma.jornadaCosecha.count({ where }),
    ]);
  },
  findClassification(id: string) { return prisma.clasificacionJornada.findUnique({ where: { id }, include: { detalles: true } }); },
  countLegacy() { return prisma.pesajeBruto.count({ where: { jornadaId: null } }); },
  saveClassification(jornadaId: string, version: number, data: Prisma.ClasificacionJornadaUncheckedCreateWithoutJornadaInput) {
    return prisma.$transaction(async tx => {
      const updated = await tx.jornadaCosecha.updateMany({ where: { id: jornadaId, version, estado: 'ABIERTA' },
        data: { version: { increment: 1 }, estado: data.dentroDelMargen ? 'CLASIFICADA' : 'PENDIENTE_APROBACION' } });
      if (updated.count !== 1) throw new Error('JORNADA_MODIFICADA');
      return tx.clasificacionJornada.create({ data: { ...data, jornadaId }, include: { detalles: true } });
    });
  },
  approve(jornadaId: string, version: number, aprobadorId: string, motivoAprobacion: string) {
    return prisma.$transaction(async tx => {
      const actor = await tx.user.findUnique({ where: { id: aprobadorId }, select: { rol: true, isActive: true } });
      if (!actor?.isActive || actor.rol !== 'ADMIN') throw new Error('APROBACION_NO_AUTORIZADA');
      const updated = await tx.jornadaCosecha.updateMany({ where: { id: jornadaId, version, estado: 'PENDIENTE_APROBACION' },
        data: { estado: 'APROBADA', version: { increment: 1 } } });
      if (updated.count !== 1) throw new Error('NO_REQUIERE_APROBACION');
      return tx.clasificacionJornada.update({ where: { jornadaId }, data: { aprobadorId, motivoAprobacion, fechaAprobacion: new Date() } });
    });
  },
};
