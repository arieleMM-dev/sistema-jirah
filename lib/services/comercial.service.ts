import { createHash, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { ComercialRepo } from '@/lib/repositories/ComercialRepository';
import { categoriaComercial, esExportacion, fechaComercial, identificador, motivoRevision, pesoComercial, registro, taraComercial, uuid } from '@/lib/comercial';
import { kg } from '@/lib/cosecha';
import { paginaValida, TAMANO_PAGINA } from '@/lib/paginacion';

export const huellaOperacion = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function confirmar<T extends { huella: string }>(stored: T, huella: string) {
  if (stored.huella !== huella) throw new Error('IDENTIDAD_CONFLICTIVA');
  return stored;
}
const sum = (values: { pesoNetoKg: number }[]) => kg(values.reduce((s, v) => s + v.pesoNetoKg, 0));

export const ComercialService = {
  async listar(pagina = 1) {
    pagina = paginaValida(pagina);
    const [compradores, clasificaciones, devoluciones, entregas, totalEntregas] = await ComercialRepo.contexto({ pagina });
    const disponibles = clasificaciones.flatMap(c => c.detalles.map(d => ({
      clasificacionId: c.id, devolucionId: null, categoria: d.categoria,
      descripcion: `${c.jornada.fecha} · ${c.jornada.campana.codigo} · ${c.jornada.lote.codigo} · ${d.categoria}`,
      disponibleKg: kg(d.pesoNetoKg - sum(c.entregas.filter(e => e.categoria === d.categoria))),
    }))).filter(d => d.disponibleKg > 0);
    return { compradores, disponibles, pagina, totalEntregas, paginas: Math.max(1, Math.ceil(totalEntregas / TAMANO_PAGINA)), devoluciones: devoluciones.map(d => ({ ...d, disponibleKg: kg(d.pesoNetoKg - sum(d.reventas)) })),
      entregas: entregas.map(e => {
        const entregadoKg = sum(e.detalles), rechazadoKg = sum(e.devoluciones.filter(d => !d.anulacion));
        return { ...e, entregadoKg, rechazadoKg, aceptadoKg: e.anulacion ? 0 : kg(entregadoKg - rechazadoKg),
          rechazoPct: entregadoKg > 0 ? rechazadoKg / entregadoKg * 100 : null };
      }) };
  },
  async entregar(raw: unknown, responsableId: string) {
    const body = registro(raw), id = uuid(body.id), compradorId = identificador(body.compradorId);
    const fecha = fechaComercial(body.fecha), taraKg = taraComercial(body.taraKg);
    if (body.observaciones !== undefined && (typeof body.observaciones !== 'string' || body.observaciones.length > 2000)) throw new Error('DATOS_INVALIDOS');
    if (!Array.isArray(body.detalles) || !body.detalles.length || body.detalles.length > 100) throw new Error('DATOS_INVALIDOS');
    const detalles = body.detalles.map(raw => {
      const d = registro(raw), categoria = categoriaComercial(d.categoria);
      const clasificacionId = d.clasificacionId == null ? null : identificador(d.clasificacionId);
      const devolucionId = d.devolucionId == null ? null : identificador(d.devolucionId);
      if (Boolean(clasificacionId) === Boolean(devolucionId) || (devolucionId && esExportacion(categoria))) throw new Error('ORIGEN_INVALIDO');
      return { clasificacionId, devolucionId, categoria, ...pesoComercial(d.numGavetas, d.pesoBrutoKg, taraKg) };
    });
    const observaciones = typeof body.observaciones === 'string' ? body.observaciones : undefined;
    const huella = huellaOperacion({ id, compradorId, fecha, taraKg, responsableId, observaciones, detalles });
    const previous = await ComercialRepo.findEntrega(id);
    if (previous) return confirmar(previous, huella);
    const [compradores, clasificaciones, devoluciones] = await ComercialRepo.contexto({ incluirHistorial: false, compradorId,
      clasificacionIds: [...new Set(detalles.flatMap(d => d.clasificacionId ? [d.clasificacionId] : []))],
      devolucionIds: [...new Set(detalles.flatMap(d => d.devolucionId ? [d.devolucionId] : []))] });
    const comprador = compradores.find(c => c.id === compradorId);
    if (!comprador || detalles.some(d => esExportacion(d.categoria) !== (comprador.tipo === 'EXPORTADOR'))) throw new Error('COMPRADOR_INVALIDO');
    const reservas = new Map<string, { id: string; version: number }>();
    const retornos = new Map<string, { id: string; version: number }>();
    const utilizados = new Map<string, number>();
    for (const d of detalles) {
      const key = d.clasificacionId ? `${d.clasificacionId}:${d.categoria}` : d.devolucionId!;
      const solicitado = kg((utilizados.get(key) ?? 0) + d.pesoNetoKg);
      utilizados.set(key, solicitado);
      let disponible = 0;
      if (d.clasificacionId) {
        const c = clasificaciones.find(c => c.id === d.clasificacionId);
        const categoria = c?.detalles.find(v => v.categoria === d.categoria);
        if (!c || !categoria) throw new Error('ORIGEN_INVALIDO');
        if (fecha < c.jornada.fecha) throw new Error('FECHA_COMERCIAL_INVALIDA');
        disponible = kg(categoria.pesoNetoKg - sum(c.entregas.filter(e => e.categoria === d.categoria)));
        reservas.set(c.id, { id: c.id, version: c.versionComercial });
      } else {
        const r = devoluciones.find(r => r.id === d.devolucionId);
        if (!r) throw new Error('ORIGEN_INVALIDO');
        if (fecha < r.fecha) throw new Error('FECHA_COMERCIAL_INVALIDA');
        disponible = kg(r.pesoNetoKg - sum(r.reventas));
        retornos.set(r.id, { id: r.id, version: r.version });
      }
      if (solicitado > disponible + 1e-9) throw new Error('STOCK_INSUFICIENTE');
    }
    try {
      return await ComercialRepo.saveEntrega({ id, fecha, compradorId, tipoComprador: comprador.tipo, nombreComprador: comprador.nombre, taraKg, responsableId, observaciones, huella,
        detalles: { create: detalles.map(d => ({ ...d, id: randomUUID() })) } }, [...reservas.values()], [...retornos.values()]);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' || error instanceof Error && error.message === 'CONFLICTO_COMERCIAL') {
        const stored = await ComercialRepo.findEntrega(id); if (stored) return confirmar(stored, huella);
      }
      throw error;
    }
  },
  async devolver(raw: unknown, responsableId: string) {
    const body = registro(raw), id = uuid(body.id), entregaId = identificador(body.entregaId), fecha = fechaComercial(body.fecha);
    const taraKg = taraComercial(body.taraKg), motivo = motivoRevision(body.motivo);
    const detalleOrigenId = body.detalleOrigenId == null || body.detalleOrigenId === '' ? null : identificador(body.detalleOrigenId);
    const pesos = pesoComercial(body.numGavetas, body.pesoBrutoKg, taraKg);
    const huella = huellaOperacion({ id, entregaId, fecha, taraKg, motivo, detalleOrigenId, ...pesos, responsableId });
    const previous = await ComercialRepo.findDevolucion(id); if (previous) return confirmar(previous, huella);
    const entrega = await ComercialRepo.findEntrega(entregaId);
    if (!entrega || entrega.anulacion || entrega.tipoComprador !== 'EXPORTADOR' || entrega.detalles.some(d => !esExportacion(d.categoria))) throw new Error('ENTREGA_INVALIDA');
    if (fecha < entrega.fecha) throw new Error('FECHA_COMERCIAL_INVALIDA');
    if (sum(entrega.devoluciones.filter(d => !d.anulacion)) + pesos.pesoNetoKg > sum(entrega.detalles) + 1e-9) throw new Error('RECHAZO_EXCESIVO');
    if (detalleOrigenId) {
      const origen = entrega.detalles.find(d => d.id === detalleOrigenId);
      if (!origen) throw new Error('ORIGEN_INVALIDO');
      if (sum(entrega.devoluciones.filter(d => !d.anulacion && d.detalleOrigenId === detalleOrigenId)) + pesos.pesoNetoKg > origen.pesoNetoKg + 1e-9) throw new Error('RECHAZO_EXCESIVO');
    }
    try { return await ComercialRepo.saveDevolucion({ id, entregaId, fecha, taraKg, motivo, detalleOrigenId, ...pesos, responsableId, huella }, entrega.version); }
    catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' || error instanceof Error && error.message === 'CONFLICTO_COMERCIAL') {
        const stored = await ComercialRepo.findDevolucion(id); if (stored) return confirmar(stored, huella);
      }
      throw error;
    }
  },
};
export type ComercialVista = Awaited<ReturnType<typeof ComercialService.listar>>;
