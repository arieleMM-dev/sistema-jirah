import { Prisma } from '@prisma/client';
import { JornadaRepo } from '@/lib/repositories/JornadaRepository';
import { calcularClasificacion, fechaFinca, kg } from '@/lib/cosecha';
import { idFiltro, paginaValida, TAMANO_PAGINA } from '@/lib/paginacion';

export const JornadaService = {
  async listar(filtros: { pagina?: unknown; id?: string; campanaId?: string; loteId?: string; pesajeId?: string } = {}) {
    const pagina = paginaValida(filtros.pagina ?? 1);
    const pesajeId = idFiltro(filtros.pesajeId);
    const where = { id: idFiltro(filtros.id), campanaId: idFiltro(filtros.campanaId), loteId: idFiltro(filtros.loteId), ...(pesajeId && { pesajes: { some: { id: pesajeId } } }) };
    const [[jornadas, total], registrosAnteriores] = await Promise.all([JornadaRepo.findPage(where, pagina), JornadaRepo.countLegacy()]);
    return { jornadas: jornadas.map(j => ({ ...j,
      pesoNetoKg: kg(j.pesajes.reduce((sum, p) => sum + p.pesoNetoKg, 0)),
      pesoBrutoKg: kg(j.pesajes.reduce((sum, p) => sum + p.pesoBrutoKg, 0)),
      numGavetas: j.pesajes.reduce((sum, p) => sum + p.numGavetas, 0),
    })), registrosAnteriores, pagina, total, paginas: Math.max(1, Math.ceil(total / TAMANO_PAGINA)) };
  },

  async clasificar(raw: unknown, clasificadorId: string) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('DATOS_INVALIDOS');
    const body = raw as Record<string, unknown>;
    if (typeof body.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id) ||
      typeof body.jornadaId !== 'string' || !Number.isSafeInteger(body.version) || (body.version as number) < 1 ||
      !Array.isArray(body.pesajeIds) || body.pesajeIds.length === 0 || !body.pesajeIds.every(id => typeof id === 'string') ||
      new Set(body.pesajeIds).size !== body.pesajeIds.length ||
      (body.observaciones !== undefined && (typeof body.observaciones !== 'string' || body.observaciones.length > 2000)) ||
      typeof body.timestamp !== 'string') throw new Error('DATOS_INVALIDOS');
    const fechaRegistro = new Date(body.timestamp);
    if (!Number.isFinite(fechaRegistro.getTime()) || fechaRegistro.getTime() > Date.now() + 300_000) throw new Error('FECHA_INVALIDA');
    const jornada = await JornadaRepo.findById(body.jornadaId);
    if (!jornada) throw new Error('JORNADA_NO_ENCONTRADA');
    let revisionLocal: string | undefined;
    if (body.revisionLocal !== undefined) {
      const r = body.revisionLocal;
      if (!r || typeof r !== 'object' || Array.isArray(r)) throw new Error('DATOS_INVALIDOS');
      const revision = r as Record<string, unknown>;
      const anterior = revision.contenidoAnterior;
      if (typeof revision.operacionAnteriorId !== 'string' || revision.operacionAnteriorId === body.id ||
        typeof revision.motivo !== 'string' || revision.motivo.trim().length < 5 || revision.motivo.length > 1000 ||
        typeof revision.fechaRevision !== 'string' || !Number.isFinite(Date.parse(revision.fechaRevision)) || Date.parse(revision.fechaRevision) > Date.now() + 300_000 ||
        !anterior || typeof anterior !== 'object' || Array.isArray(anterior)) throw new Error('DATOS_INVALIDOS');
      const original = anterior as Record<string, unknown>;
      if (original.localId !== revision.operacionAnteriorId || original.clasificador_id !== clasificadorId || original.timestamp !== body.timestamp) throw new Error('DATOS_INVALIDOS');
      revisionLocal = JSON.stringify(revision);
      if (revisionLocal.length > 50000) throw new Error('DATOS_INVALIDOS');
    }
    const calculo = calcularClasificacion(kg(jornada.pesajes.reduce((sum, p) => sum + p.pesoNetoKg, 0)), jornada.taraBase, body.detalles);
    const huella = JSON.stringify({ jornadaId: body.jornadaId, version: body.version, pesajeIds: [...body.pesajeIds].sort(),
      detalles: calculo.detalles, timestamp: fechaRegistro.toISOString(), observaciones: body.observaciones ?? null, clasificadorId, revisionLocal });
    const confirm = (stored: { huella: string }) => {
      if (stored.huella !== huella) throw new Error('IDENTIDAD_CONFLICTIVA');
      return stored;
    };
    const previous = await JornadaRepo.findClassification(body.id);
    if (previous) return confirm(previous);
    if (jornada.clasificacion) throw new Error('CLASIFICACION_EXISTENTE');
    if (jornada.version !== body.version || JSON.stringify(jornada.pesajes.map(p => p.id).sort()) !== JSON.stringify([...body.pesajeIds].sort())) throw new Error('JORNADA_MODIFICADA');
    if (fechaFinca(fechaRegistro) !== jornada.fecha) throw new Error('MISMA_JORNADA');
    try {
      const { detalles, ...totales } = calculo;
      return await JornadaRepo.saveClassification(jornada.id, jornada.version, {
        id: body.id, clasificadorId, fechaRegistro, pesoCosechadoKg: kg(jornada.pesajes.reduce((sum, p) => sum + p.pesoNetoKg, 0)),
        ...totales, huella, observaciones: body.observaciones as string | undefined, revisionLocal,
        detalles: { create: detalles },
      });
    } catch (error: unknown) {
      if ((error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') ||
        (error instanceof Error && error.message === 'JORNADA_MODIFICADA')) {
        const stored = await JornadaRepo.findClassification(body.id);
        if (stored) return confirm(stored);
      }
      throw error;
    }
  },

  aprobar(jornadaId: unknown, version: unknown, motivo: unknown, actorId: string) {
    if (typeof jornadaId !== 'string' || !Number.isSafeInteger(version)) throw new Error('DATOS_INVALIDOS');
    if (typeof motivo !== 'string' || motivo.trim().length < 5 || motivo.trim().length > 1000) throw new Error('MOTIVO_REQUERIDO');
    return JornadaRepo.approve(jornadaId, version as number, actorId, motivo.trim());
  },
};
