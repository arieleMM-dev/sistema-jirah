'use client';
import { useState } from 'react';
import { CATEGORIAS, calcularClasificacion, fechaFinca, mensajeCosecha } from '@/lib/cosecha';
import type { JornadaVista } from '@/lib/types/cosecha';
import type { OfflineClasificacionPayload, OfflineClasificacionJornada } from '@/lib/adapters/OfflinePayloadAdapter';
import { offlineService } from '@/lib/services/offline.service';

const input = 'w-full min-h-11 rounded border bg-white dark:bg-gray-800 p-2';
export default function RevisarClasificacion({ original, userId }: { original: OfflineClasificacionPayload; userId: string }) {
  const [jornada, setJornada] = useState<JornadaVista | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [detalles, setDetalles] = useState(CATEGORIAS.map(categoria => {
    const d = 'versionFormato' in original ? original.detalles.find(d => d.categoria === categoria) : undefined;
    return { categoria, numGavetas: String(d?.numGavetas ?? 0), pesoBrutoKg: String(d?.pesoBrutoKg ?? 0) };
  }));
  async function cargar() {
    setBusy(true); setError('');
    try {
      const filtro = 'versionFormato' in original ? 'id=' + encodeURIComponent(original.jornadaId) : 'pesajeId=' + encodeURIComponent(original.pesaje_local_id);
      const res = await fetch('/api/campo/jornadas?' + filtro); const data = await res.json(); if (!res.ok) throw new Error(data.error);
      const grupos: JornadaVista[] = data.jornadas;
      const j = grupos.find(j => 'versionFormato' in original ? j.id === original.jornadaId : j.pesajes.some(p => p.id === original.pesaje_local_id));
      if (!j) throw new Error('Primero sincronice los pesajes de origen.');
      if (j.clasificacion?.id === original.localId) throw new Error('Esta operación ya está confirmada. Reactive y reintente su sincronización para retirar el pendiente.');
      if (j.clasificacion) throw new Error('La jornada ya está cerrada. El administrador debe revisarla mediante una corrección con historial.');
      if (j.fecha !== fechaFinca(new Date(original.timestamp))) throw new Error('El registro original no corresponde al día de esta jornada.');
      const pendientes = await offlineService.getPendingPesajes(userId);
      if (pendientes.some(p => p.campana_codigo === j.campanaId && p.lote_codigo === j.loteId && fechaFinca(new Date(p.timestamp)) === j.fecha)) throw new Error('Sincronice todos los pesajes de esta jornada antes de revisar su clasificación.');
      setJornada(j);
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo comprobar la jornada.'); }
    finally { setBusy(false); }
  }
  async function guardar() {
    if (!jornada) return;
    setBusy(true); setError('');
    try {
      const calculo = calcularClasificacion(jornada.pesoNetoKg, jornada.taraBase, detalles.map(d => ({ categoria: d.categoria, numGavetas: Number(d.numGavetas), pesoBrutoKg: Number(d.pesoBrutoKg) })));
      const reemplazo: OfflineClasificacionJornada = { localId: crypto.randomUUID(), timestamp: original.timestamp, versionFormato: 2, jornadaId: jornada.id,
        version: jornada.version, pesajeIds: jornada.pesajes.map(p => p.id), detalles: calculo.detalles, clasificador_id: userId, observaciones: original.observaciones,
        revisionLocal: { operacionAnteriorId: original.localId, motivo, fechaRevision: new Date().toISOString(), contenidoAnterior: original } };
      await offlineService.reemplazarClasificacion(userId, original.localId, reemplazo, motivo);
      window.dispatchEvent(new Event('jirah-queue-changed')); setJornada(null);
    } catch (e) { setError(e instanceof Error && mensajeCosecha(e).startsWith('No se pudo') ? e.message : mensajeCosecha(e)); }
    finally { setBusy(false); }
  }
  return <details><summary className="cursor-pointer font-semibold">Revisar clasificación pendiente</summary>
    <p className="text-sm my-2">Con conexión, compruebe los pesajes actuales y revise las cinco categorías. La operación original quedará pausada y conservada; el reemplazo mantendrá la fecha original y su motivo.</p>
    <button className={input + ' w-auto'} disabled={busy || original._sync?.pausada} onClick={() => void cargar()}>Comprobar jornada</button>
    {error && <p role="alert" className="text-red-700 dark:text-red-300">{error}</p>}
    {jornada && <form onSubmit={e => { e.preventDefault(); void guardar(); }} className="space-y-3 mt-3"><p>Cosechado confirmado: {jornada.pesoNetoKg.toFixed(3)} kg · {jornada.pesajes.length} pesajes.</p>
      {detalles.map((d, i) => <fieldset key={d.categoria} disabled={busy} className="grid sm:grid-cols-2 gap-2"><legend>{d.categoria}</legend>
        <label>Gavetas<input required className={input} type="number" min="0" step="1" value={d.numGavetas} onChange={e => setDetalles(ds => ds.map((v, n) => n === i ? { ...v, numGavetas: e.target.value } : v))} /></label>
        <label>Bruto kg<input required className={input} type="number" min="0" step="0.001" value={d.pesoBrutoKg} onChange={e => setDetalles(ds => ds.map((v, n) => n === i ? { ...v, pesoBrutoKg: e.target.value } : v))} /></label>
      </fieldset>)}
      <label className="block">Motivo<textarea required minLength={5} maxLength={1000} className={input} value={motivo} onChange={e => setMotivo(e.target.value)} /></label>
      <button className={input} disabled={busy || motivo.trim().length < 5}>Guardar revisión y conservar original</button>
    </form>}
  </details>;
}
