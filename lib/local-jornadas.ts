import { fechaFinca, jornadaId, kg } from '@/lib/cosecha';
import type { ContextoCampo, JornadaVista } from '@/lib/types/cosecha';
import type { OfflinePesajePayload, OfflineClasificacionPayload } from '@/lib/adapters/OfflinePayloadAdapter';

export function jornadasLocales(context: ContextoCampo, pending: OfflinePesajePayload[], classifications: OfflineClasificacionPayload[], actor: { id: string; nombres: string; apellidos: string }): JornadaVista[] {
  const groups = new Map((context.jornadas ?? []).map(j => [j.id, structuredClone(j)]));
  for (const p of pending) {
    if (p.agricultor_id !== actor.id || p.tara_base === undefined) continue;
    const fecha = fechaFinca(new Date(p.timestamp));
    const id = jornadaId(p.campana_codigo, p.lote_codigo, fecha);
    let group = groups.get(id);
    if (!group) {
      const campana = context.campanas?.find(c => c.id === p.campana_codigo);
      const lote = context.lotes?.find(l => l.id === p.lote_codigo);
      if (!campana || !lote) continue;
      group = { id, fecha, campanaId: campana.id, loteId: lote.id, campana, lote,
        taraBase: p.tara_base, minimoPGr: p.minimo_p_gr ?? campana.minimoPGr, minimoGGr: p.minimo_g_gr ?? campana.minimoGGr,
        version: 0, estado: 'ABIERTA', clasificacion: null, pesajes: [], pesoNetoKg: 0, pesoBrutoKg: 0, numGavetas: 0 };
      groups.set(id, group);
    }
    if (group.pesajes.some(existing => existing.id === p.localId)) continue;
    group.pesajes.push({ id: p.localId, numGavetas: p.num_gavetas, pesoBrutoKg: p.peso_bruto,
      pesoNetoKg: kg(p.peso_bruto - p.num_gavetas * p.tara_base), fechaRegistro: p.timestamp, agricultor: actor });
    group.version += 1;
    group.numGavetas += p.num_gavetas;
    group.pesoNetoKg = kg(group.pesoNetoKg + kg(p.peso_bruto - p.num_gavetas * p.tara_base));
    group.pesoBrutoKg = kg(group.pesoBrutoKg + p.peso_bruto);
  }
  for (const c of classifications) {
    if (c.clasificador_id === actor.id && 'versionFormato' in c) {
      const group = groups.get(c.jornadaId);
      if (group) group.pendienteLocal = true;
    }
  }
  return [...groups.values()].sort((a, b) => b.fecha.localeCompare(a.fecha) || a.id.localeCompare(b.id));
}
