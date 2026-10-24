import { Prisma } from '@prisma/client';
import { JornadaRepo } from '@/lib/repositories/JornadaRepository';
import { RevisionJornadaRepo } from '@/lib/repositories/RevisionJornadaRepository';
import { calcularClasificacion, kg, fechaFinca } from '@/lib/cosecha';
import { identificador, motivoRevision, pesoComercial, registro, uuid } from '@/lib/comercial';
import { huellaOperacion } from '@/lib/services/comercial.service';

export const RevisionJornadaService = {
  async corregir(raw: unknown, responsableId: string) {
    const body = registro(raw), id = uuid(body.id), jornadaId = identificador(body.jornadaId), motivo = motivoRevision(body.motivo);
    if (typeof body.version !== 'number' || !Number.isSafeInteger(body.version) || !Array.isArray(body.pesajes) || body.pesajes.length === 0) throw new Error('DATOS_INVALIDOS');
    const huella = huellaOperacion({ ...body, responsableId });
    const confirm = (r: { huella: string }) => { if (r.huella !== huella) throw new Error('IDENTIDAD_CONFLICTIVA'); return r; };
    const previous = await RevisionJornadaRepo.find(id); if (previous) return confirm(previous);
    const jornada = await JornadaRepo.findById(jornadaId);
    if (!jornada) throw new Error('JORNADA_NO_ENCONTRADA');
    if (!jornada.clasificacion || jornada.estado === 'ABIERTA') throw new Error('CORRECCION_NO_PERMITIDA');
    const pesajes = body.pesajes.map(raw => {
      const p = registro(raw), id = identificador(p.id);
      return { id, ...pesoComercial(p.numGavetas, p.pesoBrutoKg, jornada.taraBase), taraTotal: kg((p.numGavetas as number) * jornada.taraBase) };
    });
    if (new Set(pesajes.map(p => p.id)).size !== pesajes.length ||
      JSON.stringify(pesajes.map(p => p.id).sort()) !== JSON.stringify(jornada.pesajes.map(p => p.id).sort())) throw new Error('JORNADA_MODIFICADA');
    if (body.pendientes !== undefined && (!Array.isArray(body.pendientes) || body.pendientes.length > 100)) throw new Error('DATOS_INVALIDOS');
    const adicionales = (Array.isArray(body.pendientes) ? body.pendientes : []).map(raw => {
      const p = registro(raw), id = uuid(p.localId), agricultorId = identificador(p.agricultor_id);
      if (p.campana_codigo !== jornada.campanaId || p.lote_codigo !== jornada.loteId || p.tara_base !== jornada.taraBase ||
        typeof p.timestamp !== 'string' || (p.observaciones !== undefined && (typeof p.observaciones !== 'string' || p.observaciones.length > 2000))) throw new Error('DATOS_INVALIDOS');
      const fechaRegistro = new Date(p.timestamp);
      if (!Number.isFinite(fechaRegistro.getTime()) || fechaRegistro.getTime() > Date.now() + 300_000 || fechaFinca(fechaRegistro) !== jornada.fecha) throw new Error('DATOS_INVALIDOS');
      return { id, agricultorId, fechaRegistro, campanaId: jornada.campanaId, loteId: jornada.loteId, observaciones: p.observaciones as string | undefined,
        ...pesoComercial(p.num_gavetas, p.peso_bruto, jornada.taraBase), taraTotal: kg((p.num_gavetas as number) * jornada.taraBase) };
    });
    if (new Set([...pesajes, ...adicionales].map(p => p.id)).size !== pesajes.length + adicionales.length) throw new Error('IDENTIDAD_CONFLICTIVA');
    const pesoCosechadoKg = kg([...pesajes, ...adicionales].reduce((s, p) => s + p.pesoNetoKg, 0));
    const { detalles, ...totales } = calcularClasificacion(pesoCosechadoKg, jornada.taraBase, body.detalles);
    try {
      return await RevisionJornadaRepo.save({ id, jornadaId, motivo, responsableId, huella, pesajes, adicionales, version: body.version,
        versionComercial: jornada.clasificacion.versionComercial, clasificacionId: jornada.clasificacion.id,
        clasificacion: { pesoCosechadoKg, ...totales, aprobador: { disconnect: true }, motivoAprobacion: null, fechaAprobacion: null,
          detalles: { create: detalles } } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' || error instanceof Error && error.message === 'JORNADA_MODIFICADA') {
        const stored = await RevisionJornadaRepo.find(id); if (stored) return confirm(stored);
        if (error instanceof Prisma.PrismaClientKnownRequestError) throw new Error('IDENTIDAD_CONFLICTIVA');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') throw new Error('DATOS_INVALIDOS');
      throw error;
    }
  },
};
