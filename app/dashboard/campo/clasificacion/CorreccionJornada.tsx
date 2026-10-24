'use client';
import { useEffect, useRef, useState } from 'react';
import { CATEGORIAS, calcularClasificacion, kg, mensajeCosecha } from '@/lib/cosecha';
import type { JornadaVista } from '@/lib/types/cosecha';
import type { OfflinePesajePayload } from '@/lib/adapters/OfflinePayloadAdapter';

const input = 'w-full min-h-11 rounded-lg border bg-white dark:bg-gray-800 p-2';
type Revision = { id: string; motivo: string; createdAt: string; antes: string; despues: string; responsable: { nombres: string; apellidos: string } };
export default function CorreccionJornada({ jornada, actualizar }: { jornada: JornadaVista; actualizar: () => Promise<void> }) {
  const [pesajes, setPesajes] = useState(jornada.pesajes.map(p => ({ id: p.id, numGavetas: String(p.numGavetas), pesoBrutoKg: String(p.pesoBrutoKg) })));
  const [detalles, setDetalles] = useState(CATEGORIAS.map(categoria => { const d = jornada.clasificacion!.detalles.find(d => d.categoria === categoria)!; return { categoria, numGavetas: String(d.numGavetas), pesoBrutoKg: String(d.pesoBrutoKg) }; }));
  const [motivo, setMotivo] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [revisiones, setRevisiones] = useState<Revision[]>([]);
  const [pendientes, setPendientes] = useState<OfflinePesajePayload[]>([]);
  const id = useRef<string | undefined>(undefined);
  useEffect(() => {
    const c = new AbortController();
    fetch(`/api/campo/jornadas/correcciones?jornadaId=${encodeURIComponent(jornada.id)}`, { signal: c.signal }).then(async r => {
      const d = await r.json(); if (!r.ok) throw new Error(d.error); setRevisiones(d.revisiones);
    }).catch(e => { if (!c.signal.aborted) setError(e instanceof Error ? e.message : 'No se pudo cargar el historial.'); });
    return () => c.abort();
  }, [jornada.id, jornada.version]);
  const pesos = pesajes.map(p => ({ id: p.id, numGavetas: Number(p.numGavetas), pesoBrutoKg: Number(p.pesoBrutoKg) }));
  let preview;
  try { preview = calcularClasificacion(kg(pesos.reduce((s, p) => s + p.pesoBrutoKg - p.numGavetas * jornada.taraBase, 0) + pendientes.reduce((s, p) => s + p.peso_bruto - p.num_gavetas * jornada.taraBase, 0)), jornada.taraBase,
    detalles.map(d => ({ categoria: d.categoria, numGavetas: Number(d.numGavetas), pesoBrutoKg: Number(d.pesoBrutoKg) }))); } catch { preview = null; }
  async function guardar() {
    if (!navigator.onLine) { setError('La corrección requiere conexión.'); return; }
    setBusy(true); setError(''); id.current ??= crypto.randomUUID();
    try {
      const res = await fetch('/api/campo/jornadas/correcciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        id: id.current, jornadaId: jornada.id, version: jornada.version, motivo, pesajes: pesos, pendientes,
        detalles: detalles.map(d => ({ categoria: d.categoria, numGavetas: Number(d.numGavetas), pesoBrutoKg: Number(d.pesoBrutoKg) })) }) });
      const result = await res.json(); if (!res.ok) throw new Error(result.error);
      id.current = undefined; await actualizar();
    } catch (e) { setError(e instanceof Error ? e.message : mensajeCosecha(e)); }
    finally { setBusy(false); }
  }
  async function importar(file?: File) {
    if (!file) return;
    try {
      if (file.size > 3_000_000) throw new Error('El respaldo supera 3 MB. Revise un grupo menor de pendientes.');
      const raw: unknown = JSON.parse(await file.text());
      if (!raw || typeof raw !== 'object' || !('pesajes' in raw) || !Array.isArray(raw.pesajes)) throw new Error('Seleccione el respaldo descargado desde Pendientes.');
      const candidatos: OfflinePesajePayload[] = [];
      for (const p of raw.pesajes) {
        if (!p || typeof p !== 'object' || p.campana_codigo !== jornada.campanaId || p.lote_codigo !== jornada.loteId) continue;
        if (typeof p.timestamp !== 'string' || typeof p.localId !== 'string' || typeof p.agricultor_id !== 'string' ||
          typeof p.num_gavetas !== 'number' || typeof p.peso_bruto !== 'number' || typeof p.tara_base !== 'number') throw new Error('El respaldo tiene registros incompletos.');
        const { fechaFinca } = await import('@/lib/cosecha');
        if (fechaFinca(new Date(p.timestamp)) === jornada.fecha) candidatos.push(p);
      }
      if (!candidatos.length) throw new Error('El respaldo no contiene pesajes de esta campaña, lote y jornada.');
      if (candidatos.some(p => jornada.pesajes.some(actual => actual.id === p.localId))) throw new Error('Hay pesajes ya confirmados. Actualice la cola del trabajador antes de importar el respaldo.');
      setPendientes(candidatos); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo leer el respaldo.'); }
  }
  return <section className="border-t pt-4 space-y-3"><details><summary className="font-bold cursor-pointer">Corregir jornada cerrada</summary>
    <p className="text-sm my-3">Se conservarán los valores anteriores, su identidad y el motivo. La corrección vuelve a calcular el cuadre y anula la aprobación previa. Si hay entregas vigentes, primero anule sus movimientos dependientes desde Entregas y devoluciones.</p>
    <form onSubmit={e => { e.preventDefault(); void guardar(); }} className="space-y-3"><fieldset disabled={busy} className="space-y-3">
      <h3 className="font-bold">Pesajes cosechados</h3>{pesajes.map((p, i) => <div key={p.id} className="grid sm:grid-cols-2 gap-2">
        <label>Gavetas pesaje {i + 1}<input required className={input} type="number" min="1" step="1" value={p.numGavetas} onChange={e => setPesajes(ps => ps.map((v, n) => n === i ? { ...v, numGavetas: e.target.value } : v))} /></label>
        <label>Bruto pesaje {i + 1} (kg)<input required className={input} type="number" min="0.001" step="0.001" value={p.pesoBrutoKg} onChange={e => setPesajes(ps => ps.map((v, n) => n === i ? { ...v, pesoBrutoKg: e.target.value } : v))} /></label>
      </div>)}
      <h3 className="font-bold">Clasificación</h3>{detalles.map((d, i) => <div key={d.categoria} className="grid sm:grid-cols-2 gap-2">
        <label>Gavetas {d.categoria}<input required className={input} type="number" min="0" step="1" value={d.numGavetas} onChange={e => setDetalles(ds => ds.map((v, n) => n === i ? { ...v, numGavetas: e.target.value } : v))} /></label>
        <label>Bruto {d.categoria} (kg)<input required className={input} type="number" min="0" step="0.001" value={d.pesoBrutoKg} onChange={e => setDetalles(ds => ds.map((v, n) => n === i ? { ...v, pesoBrutoKg: e.target.value } : v))} /></label>
      </div>)}
      <label className="block">Incorporar pesajes tardíos del respaldo de Pendientes<input type="file" accept="application/json,.json" className={input} onChange={e => void importar(e.target.files?.[0])} /></label>
      {!!pendientes.length && <div className="text-sm space-y-2"><p>Se incorporarán {pendientes.length} pesajes de esta jornada; revise la clasificación completa antes de confirmar.</p>
        <ul>{pendientes.map(p => <li key={p.localId}>{p.localId} · trabajador {p.agricultor_id} · {p.timestamp} · {p.num_gavetas} gavetas · bruto {p.peso_bruto} kg</li>)}</ul>
        <button type="button" className={input} onClick={() => setPendientes([])}>Quitar respaldo de esta corrección</button></div>}
      <label className="block">Motivo obligatorio<textarea required minLength={5} maxLength={1000} className={input} value={motivo} onChange={e => setMotivo(e.target.value)} /></label>
    </fieldset>
    {preview && <p aria-live="polite">Nuevo cuadre: {preview.margenErrorPct.toFixed(2)} % · {preview.dentroDelMargen ? 'Dentro del margen' : 'Requerirá nueva aprobación'}</p>}
    <button disabled={busy || !preview || motivo.trim().length < 5} className="min-h-11 px-4 rounded-lg bg-amber-700 text-white disabled:opacity-50">Guardar corrección con historial</button>
    </form></details>
    {error && <p role="alert" className="text-red-700 dark:text-red-300">{error}</p>}
    <details><summary className="font-semibold cursor-pointer">Historial de correcciones ({revisiones.length})</summary>
      {revisiones.map(r => <article key={r.id} className="text-sm border-t py-3"><p>{new Date(r.createdAt).toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })} · {r.responsable.nombres} {r.responsable.apellidos} · {r.motivo}</p>
        <details><summary>Valores anteriores y posteriores</summary><pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify({ antes: JSON.parse(r.antes), despues: JSON.parse(r.despues) }, null, 2)}</pre></details></article>)}
    </details>
  </section>;
}
