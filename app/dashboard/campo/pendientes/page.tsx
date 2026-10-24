'use client';
import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { offlineService } from '@/lib/services/offline.service';
import { networkSyncSubject } from '@/lib/observers/SyncObserver';
import RevisarClasificacion from './RevisarClasificacion';

type Cola = Awaited<ReturnType<typeof offlineService.cola>>;
const button = 'min-h-11 rounded-lg border px-4 py-2 disabled:opacity-50';
export default function PendientesPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [cola, setCola] = useState<Cola | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!userId) return;
    try { setCola(await offlineService.cola(userId)); setError(''); }
    catch { setError('No se pudo leer el almacenamiento de este dispositivo.'); }
  }, [userId]);
  useEffect(() => {
    const refresh = () => { void load(); };
    refresh(); window.addEventListener('jirah-queue-changed', refresh);
    const observer = { onSyncEvent: refresh }; networkSyncSubject.subscribe(observer);
    return () => { window.removeEventListener('jirah-queue-changed', refresh); networkSyncSubject.unsubscribe(observer); };
  }, [load]);
  async function pausar(kind: 'pesajes' | 'clasificaciones', id: string, value: boolean) {
    if (!userId) return;
    try { await offlineService.pausar(userId, kind, id, value); window.dispatchEvent(new Event('jirah-queue-changed')); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo cambiar el estado.'); }
  }
  function descargar() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ usuario: userId, exportadoEn: new Date().toISOString(), ...cola }, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'respaldo_pendientes_jirah.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="max-w-5xl mx-auto space-y-5 text-agri-green-dark dark:text-gray-100">
    <h1 className="text-2xl font-bold">Registros pendientes de confirmación</h1>
    <p>Se muestran únicamente los registros de su cuenta guardados en este dispositivo. Al recibir confirmación del servidor, salen de esta lista y aparecen en los reportes.</p>
    <p className="text-sm">Antes de salir a campo, abra Pesaje Bruto, Clasificación y esta pantalla con conexión. La captura local está disponible hasta 7 días desde la última validación con el servidor. Al recuperar señal, abra la aplicación; puede necesitar ingresar nuevamente para enviar los pendientes.</p>
    <p className="text-sm">Si un registro tiene un conflicto, conserve el respaldo y solicite revisión al administrador. Pausar conserva el registro y detiene sus reintentos; no elimina información.</p>
    {error && <p role="alert" className="p-3 bg-red-50 text-red-900 rounded">{error}</p>}
    <div className="flex flex-wrap gap-3"><button className={button} onClick={() => window.dispatchEvent(new Event('jirah-queue-changed'))}>Reintentar sincronización</button>
      <button className={button} onClick={() => void load()}>Actualizar lista</button><button className={button} disabled={!cola} onClick={descargar}>Descargar respaldo</button></div>
    {!cola ? <p role="status">Cargando…</p> : <>
      {!cola.pesajes.length && !cola.clasificaciones.length && <p role="status">No tiene registros pendientes en este dispositivo.</p>}
      {(['pesajes', 'clasificaciones'] as const).map(kind => <section key={kind} className="space-y-3"><h2 className="text-xl font-bold">{kind === 'pesajes' ? 'Pesajes' : 'Clasificaciones'} ({cola[kind].length})</h2>
        {cola[kind].map(p => <article key={p.localId} className="p-4 rounded-xl border space-y-2 break-words">
          <p className="font-semibold">{p.localId}</p><p>{new Date(p.timestamp).toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })} · {p._sync?.pausada ? 'Pausado' : 'Pendiente'}</p>
          {'peso_bruto' in p && <p>{p.num_gavetas} gavetas · bruto {p.peso_bruto} kg · tara {p.tara_base ?? 'no disponible'} kg/gaveta</p>}
          {'versionFormato' in p && <p>Jornada: {p.jornadaId} · {p.pesajeIds.length} pesajes incluidos</p>}
          {p._sync?.error && <p role="alert" className="text-red-700 dark:text-red-300">{p._sync.error}</p>}
          {p._sync?.intentadoEn && <p className="text-xs">Última respuesta: {new Date(p._sync.intentadoEn).toLocaleString('es-EC')}</p>}
          <button className={button} onClick={() => void pausar(kind, p.localId, !p._sync?.pausada)}>{p._sync?.pausada ? 'Reactivar' : 'Pausar reintentos'}</button>
          <details><summary className="cursor-pointer">Ver datos originales</summary><pre className="overflow-auto whitespace-pre-wrap text-xs mt-2">{JSON.stringify(p, null, 2)}</pre></details>
          {'clasificador_id' in p && userId && <RevisarClasificacion key={p.localId} original={p} userId={userId} />}
        </article>)}
      </section>)}
      {!!cola.revisiones.length && <section><h2 className="text-xl font-bold">Historial de revisiones locales</h2>{cola.revisiones.map(r => <p key={r.id}>{r.fecha} · {r.motivo} · {r.anterior.localId} → {r.reemplazoId}</p>)}</section>}
    </>}
  </div>;
}
