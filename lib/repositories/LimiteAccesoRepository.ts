import { createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';

export const LimiteAccesoRepo = {
  async consumir(ambito: string, identidad: string, maximo: number, ventanaMs: number) {
    const clave = `${ambito}:${createHash('sha256').update(identidad).digest('hex')}`;
    return prisma.$transaction(async tx => {
      const now = new Date();
      await tx.limiteAcceso.deleteMany({ where: { vence: { lt: new Date(now.getTime() - 86400_000) } } });
      const previous = await tx.limiteAcceso.findUnique({ where: { clave } });
      const window = await tx.limiteAcceso.upsert({ where: { clave },
        create: { clave, intentos: 1, vence: new Date(now.getTime() + ventanaMs) },
        update: !previous || previous.vence <= now ? { intentos: 1, vence: new Date(now.getTime() + ventanaMs) } : { intentos: { increment: 1 } } });
      return window.intentos <= maximo;
    });
  },
};
