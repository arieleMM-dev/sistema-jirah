import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

const resumen = { id: true, nombres: true, apellidos: true, email: true, cedula: true,
  telefono: true, estadoAcceso: true, emailVerificadoAt: true, createdAt: true, sessionVersion: true } satisfies Prisma.UserSelect;

export const AccesoRepo = {
  crear(data: { email: string; nombres: string; apellidos: string; cedula: string; passwordHash: string }) {
    return prisma.user.create({ data: { ...data, rol: 'SIN_ASIGNAR', estadoAcceso: 'PENDIENTE' }, select: resumen });
  },
  emitirVerificacion(userId: string, token: string) {
    return prisma.$transaction(async tx => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user?.isActive || user.emailVerificadoAt || user.estadoAcceso !== 'PENDIENTE') return null;
      const recent = await tx.verificacionCorreo.findFirst({ where: { userId, usedAt: null, createdAt: { gt: new Date(Date.now() - 60_000) } } });
      if (recent) return null;
      return tx.verificacionCorreo.create({ data: { userId, token, expiresAt: new Date(Date.now() + 24 * 3600_000) } });
    });
  },
  invalidarVerificacion(id: string) { return prisma.verificacionCorreo.update({ where: { id }, data: { usedAt: new Date() } }); },
  verificar(userId: string, token: string) {
    return prisma.$transaction(async tx => {
      const now = new Date();
      const claimed = await tx.verificacionCorreo.updateMany({ where: { userId, token, usedAt: null, expiresAt: { gt: now },
        user: { isActive: true, estadoAcceso: 'PENDIENTE' } }, data: { usedAt: now } });
      if (claimed.count !== 1) throw new Error('VERIFICACION_INVALIDA');
      await tx.user.update({ where: { id: userId }, data: { emailVerificadoAt: now } });
      await tx.verificacionCorreo.updateMany({ where: { userId, usedAt: null }, data: { usedAt: now } });
    });
  },
  async listar(estado: 'PENDIENTE' | 'RECHAZADO', pagina: number) {
    const where = { estadoAcceso: estado };
    const [solicitudes, total] = await prisma.$transaction([prisma.user.findMany({ where, select: {
      ...resumen, decisionesAcceso: { orderBy: { createdAt: 'desc' }, take: 5,
        select: { id: true, estadoNuevo: true, motivo: true, createdAt: true, administrador: { select: { nombres: true, apellidos: true } } } },
    }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 25, skip: (pagina - 1) * 25 }), prisma.user.count({ where })]);
    return { solicitudes, total, pagina, porPagina: 25 };
  },
  decidir(id: string, administradorId: string, version: number, aprobar: boolean, motivo: string) {
    return prisma.$transaction(async tx => {
      const admin = await tx.user.findUnique({ where: { id: administradorId }, select: { rol: true, isActive: true, estadoAcceso: true } });
      if (!admin?.isActive || admin.rol !== 'ADMIN' || admin.estadoAcceso !== 'APROBADO') throw new Error('ACCESO_NO_AUTORIZADO');
      const user = await tx.user.findUnique({ where: { id } });
      if (!user || !user.isActive || user.estadoAcceso === 'APROBADO' || user.rol !== 'SIN_ASIGNAR') throw new Error('SOLICITUD_NO_DISPONIBLE');
      if (aprobar && !user.emailVerificadoAt) throw new Error('CORREO_NO_VERIFICADO');
      const estadoNuevo = aprobar ? 'APROBADO' : 'RECHAZADO';
      const rolAsignado = aprobar ? 'AGRICULTOR_CLASIFICADOR' : 'SIN_ASIGNAR';
      const changed = await tx.user.updateMany({ where: { id, sessionVersion: version, estadoAcceso: user.estadoAcceso, isActive: true },
        data: { estadoAcceso: estadoNuevo, rol: rolAsignado, sessionVersion: { increment: 1 } } });
      if (changed.count !== 1) throw new Error('SOLICITUD_MODIFICADA');
      await tx.decisionAcceso.create({ data: { solicitanteId: id, administradorId, estadoAnterior: user.estadoAcceso, estadoNuevo, rolAsignado, motivo } });
      return tx.user.findUniqueOrThrow({ where: { id }, select: resumen });
    });
  },
};
