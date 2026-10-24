import { prisma } from '@/lib/prisma';

export const PasswordResetRepository = {
  findByHash(token: string) {
    return prisma.passwordResetToken.findUnique({ where: { token }, select: { id: true, userId: true, expiresAt: true, usedAt: true, user: { select: { isActive: true } } } });
  },
  issue(userId: string, token: string) {
    return prisma.$transaction(async tx => {
      const recent = await tx.passwordResetToken.findFirst({ where: { userId, createdAt: { gt: new Date(Date.now() - 60_000) } } });
      if (recent) return null;
      return tx.passwordResetToken.create({ data: { userId, token, expiresAt: new Date(Date.now() + 3600_000) } });
    });
  },
  invalidate(id: string) { return prisma.passwordResetToken.update({ where: { id }, data: { usedAt: new Date() } }); },

  async consume(id: string, userId: string, passwordHash: string) {
    return prisma.$transaction(async (tx) => {
      const now = new Date();
      const claimed = await tx.passwordResetToken.updateMany({
        where: { id, userId, usedAt: null, expiresAt: { gt: now }, user: { isActive: true } },
        data: { usedAt: now },
      });
      if (claimed.count !== 1) return false;

      await tx.user.update({
        where: { id: userId },
        // Consumir un enlace enviado al correo vigente demuestra su titularidad.
        data: { passwordHash, emailVerificadoAt: now, sessionVersion: { increment: 1 } },
      });
      await tx.passwordResetToken.updateMany({
        where: { userId, usedAt: null },
        data: { usedAt: now },
      });
      return true;
    });
  },
};
