/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CAPA DE PRESENTACIÓN — Hook useSyncManager                 ║
 * ║  CU-05.4: Sincronización offline con backoff exponencial.   ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { useEffect, useState, useRef } from 'react';
import { networkSyncSubject } from '@/lib/observers/SyncObserver';
import { offlineService } from '@/lib/services/offline.service';

const INITIAL_BACKOFF = 1000; // 1 segundo
const MAX_BACKOFF = 60000;    // 1 minuto máximo

export function useSyncManager() {
  const [isOnline, setIsOnline] = useState(true);
  const backoffRef = useRef(INITIAL_BACKOFF);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const doSync = async () => {
      if (!navigator.onLine) return;

      let hasErrors = false;
      let hasDataToSync = false;

      try {
        // 1. Sincronizar Pesajes
        const pesajes = await offlineService.getPendingPesajes();
        if (pesajes.length > 0) {
          hasDataToSync = true;
          const res = await fetch('/api/sync/pesajes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pesajes }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.savedIds) await offlineService.removePesajes(data.savedIds);
          } else if (res.status >= 500) {
            hasErrors = true;
          }
        }

        // 2. Sincronizar Clasificaciones
        const clasif = await offlineService.getPendingClasificaciones();
        if (clasif.length > 0) {
          hasDataToSync = true;
          const res = await fetch('/api/sync/clasificaciones', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clasificaciones: clasif }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.savedIds) await offlineService.removeClasificaciones(data.savedIds);
          } else if (res.status >= 500) {
            hasErrors = true;
          }
        }

        if (hasErrors) {
          // Fallo 500: Aplicar backoff exponencial
          // Fallo 500: Aplicar backoff exponencial
          networkSyncSubject.notify('sync-failed');
          
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF);
            doSync();
          }, backoffRef.current);
          
        } else if (hasDataToSync) {
          // Éxito total
          networkSyncSubject.notify('sync-complete');
          backoffRef.current = INITIAL_BACKOFF; // Resetear backoff
        }
      } catch (e) {
        // Fallo de red: Aplicar backoff exponencial
        networkSyncSubject.notify('sync-failed');
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF);
          doSync();
        }, backoffRef.current);
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      networkSyncSubject.notify('online');
      backoffRef.current = INITIAL_BACKOFF; // Reset backoff al volver la conexión
      doSync(); // Intentar sincronizar inmediatamente
    };

    const handleOffline = () => {
      setIsOnline(false);
      networkSyncSubject.notify('offline');
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Escuchar mensajes del Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SYNC_TRIGGER') {
          doSync();
        }
      });
    }

    // Intento inicial al cargar
    if (navigator.onLine) doSync();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { isOnline };
}
