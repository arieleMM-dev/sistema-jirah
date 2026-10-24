'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { offlineService } from '@/lib/services/offline.service';
import { prepareOfflineDevice, readReadiness, type OfflineReadiness as Prepared } from '@/lib/offline-readiness';
import { networkSyncSubject } from '@/lib/observers/SyncObserver';

export default function OfflineReadiness({ userId, online }: { userId: string; online: boolean }) {
  const [ready, setReady] = useState<Prepared | undefined>(() => readReadiness(userId)), [error, setError] = useState(''), [busy, setBusy] = useState(false), [update, setUpdate] = useState<ServiceWorker | null>(null), [pending, setPending] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now()), [serverAvailable, setServerAvailable] = useState(false);
  const inProgress = useRef(false), abort = useRef<AbortController | null>(null);
  const prepare = useCallback(async () => {
    if (inProgress.current || !navigator.onLine || process.env.NODE_ENV === 'development') return;
    inProgress.current = true; setBusy(true); setError(''); abort.current = new AbortController();
    const timeout = setTimeout(() => abort.current?.abort(), 45_000);
    try { setReady(await prepareOfflineDevice(userId, abort.current.signal)); setServerAvailable(true); }
    catch (e) { setServerAvailable(false); setError(e instanceof Error && e.name !== 'AbortError' ? e.message : 'La preparación no terminó. Compruebe la conexión y vuelva a intentar.'); }
    finally { clearTimeout(timeout); inProgress.current = false; setBusy(false); }
  }, [userId]);
  useEffect(() => {
    const refresh = () => { void offlineService.pendingCountOnDevice().then(setPending).catch(() => setPending(null)); };
    refresh(); const observer = { onSyncEvent: refresh }; networkSyncSubject.subscribe(observer);
    window.addEventListener('jirah-queue-changed', refresh);
    const tick = setInterval(() => { setNow(Date.now()); refresh(); }, 60_000);
    return () => { clearInterval(tick); networkSyncSubject.unsubscribe(observer); window.removeEventListener('jirah-queue-changed', refresh); abort.current?.abort(); };
  }, [userId]);
  useEffect(() => {
    if (!online || process.env.NODE_ENV === 'development') return;
    let cancelled = false;
    const current = readReadiness(userId);
    if (!current || Date.now() - current.preparedAt > 3600_000) void navigator.serviceWorker?.ready.then(() => { if (!cancelled) void prepare(); });
    else void fetch('/api/auth/estado', { cache: 'no-store' }).then(r => { if (!cancelled) setServerAvailable(r.ok); }).catch(() => { if (!cancelled) setServerAvailable(false); });
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void prepare(); }, 3600_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [online, prepare, userId]);
  useEffect(() => {
    if (!navigator.serviceWorker || process.env.NODE_ENV === 'development') return;
    let cancelled = false, current: ServiceWorkerRegistration | undefined;
    const inspect = () => { if (!cancelled && current?.waiting) setUpdate(current.waiting); };
    const changed = () => { if (!cancelled && navigator.onLine && !readReadiness(userId)) void prepare(); };
    void navigator.serviceWorker.ready.then(reg => { if (cancelled) return; current = reg; inspect(); reg.addEventListener('updatefound', inspect); setTimeout(changed, 200); });
    const timer = setInterval(inspect, 10_000); navigator.serviceWorker.addEventListener('controllerchange', changed);
    return () => { cancelled = true; clearInterval(timer); current?.removeEventListener('updatefound', inspect); navigator.serviceWorker.removeEventListener('controllerchange', changed); };
  }, [prepare, userId]);
  async function applyUpdate() {
    if (!online || !update) return;
    try {
      const count = await offlineService.pendingCountOnDevice(); setPending(count);
      if (count) { setError('Resuelva los registros pendientes de este dispositivo antes de actualizar.'); return; }
      const r = await fetch('/api/auth/estado', { cache: 'no-store' }); if (!r.ok) throw new Error('Inicie sesión antes de actualizar.');
      localStorage.removeItem('jirah-preparacion-campo');
      navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
      update.postMessage({ type: 'SKIP_WAITING' });
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo actualizar. Sus registros se conservan.'); }
  }
  const valid = ready && now < ready.expiresAt;
  return <aside className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 text-sm bg-white dark:bg-gray-900" aria-label="Preparación para trabajar sin conexión">
    <details open={!valid}>
      <summary className="cursor-pointer min-h-11 content-center font-semibold"><span role="status">{process.env.NODE_ENV === 'development' ? 'Modo de desarrollo: pruebe la PWA en producción.' : busy ? 'Preparando este dispositivo para trabajar sin conexión…' : valid ? 'Listo para trabajar sin conexión' : 'Preparar este dispositivo para campo'}</span>{pending !== null && <span className="font-normal"> · {pending} pendientes</span>}</summary>
      <div className="space-y-2 pb-2">
        {valid && <p>Captura local hasta {new Date(ready.expiresAt).toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })}. {ready.persistent ? 'Almacenamiento persistente concedido por el navegador.' : 'El navegador no concedió almacenamiento persistente. Sincronice al recuperar señal y conserve los datos de JIRAH.'}</p>}
        <p>{online ? serverAvailable ? 'Servidor disponible.' : 'Red detectada; servidor todavía sin confirmar.' : 'Sin conexión.'} La sincronización requiere abrir o mantener abierta la aplicación. No borre los datos del sitio si tiene pendientes.</p>
        {pending === null && <p>No se pudo comprobar la cola local.</p>}
        {process.env.NODE_ENV !== 'development' && <button className="min-h-11 underline underline-offset-4 disabled:opacity-50" disabled={!online || busy} onClick={() => void prepare()}>Comprobar preparación</button>}
      </div>
    </details>
    {error && <p role="alert" className="text-red-800 dark:text-red-300">{error}</p>}
    {update && <div><p>Hay una nueva versión. Resuelva los pendientes antes de actualizar.</p><button className="min-h-11 underline underline-offset-4 disabled:opacity-50" disabled={!online || pending !== 0} onClick={() => void applyUpdate()}>Actualizar aplicación</button></div>}
  </aside>;
}
