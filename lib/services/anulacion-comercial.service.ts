import { Prisma } from '@prisma/client';
import { identificador, motivoRevision, registro, uuid } from '@/lib/comercial';
import { huellaOperacion } from '@/lib/services/comercial.service';
import { AnulacionComercialRepo } from '@/lib/repositories/AnulacionComercialRepository';

export const AnulacionComercialService = {
  async anular(raw: unknown, responsableId: string) {
    const body = registro(raw), id = uuid(body.id), movimientoId = identificador(body.movimientoId), motivo = motivoRevision(body.motivo);
    if (body.tipo !== 'ENTREGA' && body.tipo !== 'DEVOLUCION') throw new Error('DATOS_INVALIDOS');
    const tipo = body.tipo, huella = huellaOperacion({ id, movimientoId, tipo, motivo, responsableId });
    const confirmar = (stored: { huella: string }) => { if (stored.huella !== huella) throw new Error('IDENTIDAD_CONFLICTIVA'); return stored; };
    const previous = await AnulacionComercialRepo.find(id); if (previous) return confirmar(previous);
    try { return await AnulacionComercialRepo.save({ id, movimientoId, tipo, motivo, responsableId, huella }); }
    catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' || error instanceof Error && ['MOVIMIENTO_ANULADO', 'CONFLICTO_COMERCIAL'].includes(error.message)) {
        const stored = await AnulacionComercialRepo.find(id); if (stored) return confirmar(stored);
      }
      throw error;
    }
  },
};
