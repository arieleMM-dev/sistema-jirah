import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useSession } from 'next-auth/react';
import { networkSyncSubject } from '@/lib/observers/SyncObserver';
import { offlineService } from '@/lib/services/offline.service';
import { readSyncConfirmation } from '@/lib/sync-confirmation';

function subscribeNetwork(callback: () => void) {
  const online = () => { networkSyncSubject.notify('online'); callback(); };
  const offline = () => { networkSyncSubject.notify('offline'); callback(); };
  window.addEventListener('online', online);
  window.addEventListener('offline', offline);
  return () => {
    window.removeEventListener('online', online);
    window.removeEventListener('offline', offline);
  };
}
const getOnlineSnapshot = () => navigator.onLine;
const getServerSnapshot = () => true;

export function useSyncManager() {
  const { data: session, status } = useSession();
  const userId = status === 'authenticated' ? session?.user?.id : undefined;
  const isOnline = useSyncExternalStore(subscribeNetwork, getOnlineSnapshot, getServerSnapshot);
  const [failure, setFailure] = useState<{ userId: string; message: string } | null>(null);
  const retryRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!userId || !isOnline) return;
    let cancelled = false;
    let syncing = false;
    let requested = false;
    let backoff = 1000;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let transientIds: Set<string> | undefined;
    const controller = new AbortController();

    const doSync = async () => {
      if (cancelled || syncing || !navigator.onLine) return;
      syncing = true;
      let hasData = false;
      let failureMessage: string | null = null;
      let retryable = false;
      const nextTransient = new Set<string>();
      try {
        const groups = [
          { kind: 'pesajes' as const, load: () => offlineService.getPendingPesajes(userId), remove: (ids: string[]) => offlineService.removePesajes(ids) },
          { kind: 'clasificaciones' as const, load: () => offlineService.getPendingClasificaciones(userId), remove: (ids: string[]) => offlineService.removeClasificaciones(ids) },
        ];
        for (const group of groups) {
          if (cancelled) return;
          const all = (await group.load()).filter(p => !transientIds || transientIds.has(p.localId));
          for (let offset = 0; offset < all.length; offset += 100) {
            const pending = all.slice(offset, offset + 100);
            if (pending.length === 0) continue;
            hasData = true;
            const attempt = new AbortController();
            const cancelAttempt = () => attempt.abort();
            controller.signal.addEventListener('abort', cancelAttempt, { once: true });
            const timeout = setTimeout(() => attempt.abort(), 30_000);
            try {
              const response = await fetch(`/api/sync/${group.kind}`, {
                method: 'POST', signal: attempt.signal,
                headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [group.kind]: pending }),
              });
              if (!response.ok) {
                retryable = response.status >= 500 || response.status === 429;
                if (response.status === 429) backoff = Math.max(backoff, Math.min(60_000, Number(response.headers.get('Retry-After')) * 1000 || 1000));
                throw new Error(response.status === 401
                  ? 'La sesión venció. Inicie sesión nuevamente; sus registros siguen guardados.'
                  : 'No se pudo sincronizar. Sus registros siguen guardados.');
              }
              const confirmation = readSyncConfirmation(await response.json(), pending.map(p => p.localId));
              await offlineService.errores(userId, group.kind, confirmation.errors);
              await group.remove(confirmation.savedIds);
              failureMessage ??= confirmation.error;
              retryable ||= confirmation.retryable;
              for (const e of confirmation.errors) if (e.retryable && e.localId) nextTransient.add(e.localId);
            } catch (error) {
              if (attempt.signal.aborted && !cancelled) retryable = true;
              throw error;
            } finally {
              clearTimeout(timeout);
              controller.signal.removeEventListener('abort', cancelAttempt);
            }
          }
        }
        if (!cancelled) {
          setFailure(failureMessage ? { userId, message: failureMessage } : null);
          if (hasData) networkSyncSubject.notify(failureMessage ? 'sync-failed' : 'sync-complete');
          transientIds = nextTransient.size ? nextTransient : undefined;
          if (!retryable) backoff = 1000;
          if (hasData && !failureMessage) timer = setTimeout(() => void doSync(), 100);
          else if (retryable) timer = setTimeout(() => { backoff = Math.min(backoff * 2, 60_000); void doSync(); }, backoff);
        }
      } catch (error: unknown) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'No se pudo sincronizar. Sus registros siguen guardados.';
        setFailure({ userId, message });
        networkSyncSubject.notify('sync-failed');
        if (retryable || error instanceof TypeError) {
          timer = setTimeout(() => { backoff = Math.min(backoff * 2, 60_000); void doSync(); }, backoff);
        }
      } finally { syncing = false; if (requested && !cancelled) { requested = false; timer = setTimeout(() => void doSync(), 100); } }
    };
    const retry = () => {
      if (syncing) { requested = true; return; }
      if (timer) clearTimeout(timer);
      backoff = 1000;
      transientIds = undefined;
      void doSync();
    };
    retryRef.current = retry;
    window.addEventListener('jirah-queue-changed', retry);
    const onWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_TRIGGER') retry();
    };
    navigator.serviceWorker?.addEventListener('message', onWorkerMessage);
    void doSync();
    return () => {
      cancelled = true;
      controller.abort();
      if (timer) clearTimeout(timer);
      retryRef.current = () => {};
      window.removeEventListener('jirah-queue-changed', retry);
      navigator.serviceWorker?.removeEventListener('message', onWorkerMessage);
    };
  }, [userId, isOnline]);

  return { isOnline, syncError: failure?.userId === userId ? failure?.message : null, retrySync: () => retryRef.current() };
}
