// ============================================================
// PATRÓN OBSERVER — Reactividad ante cambios de conectividad
// ============================================================
// El Service Worker es el "Sujeto" (Publisher) que monitorea la red.
// Los componentes React son "Observadores" (Subscribers).

export type SyncEventType = 'online' | 'offline' | 'sync-complete' | 'sync-failed';

export interface ISyncObserver {
  onSyncEvent(event: SyncEventType, data?: unknown): void;
}

export interface ISyncSubject {
  subscribe(observer: ISyncObserver): void;
  unsubscribe(observer: ISyncObserver): void;
  notify(event: SyncEventType, data?: unknown): void;
}

// ─────────────────────────────────────────────
// Sujeto (Subject/Publisher)
// ─────────────────────────────────────────────
class NetworkSyncSubject implements ISyncSubject {
  private observers: Set<ISyncObserver> = new Set();

  subscribe(observer: ISyncObserver): void {
    this.observers.add(observer);
  }

  unsubscribe(observer: ISyncObserver): void {
    this.observers.delete(observer);
  }

  notify(event: SyncEventType, data?: unknown): void {
    this.observers.forEach(obs => obs.onSyncEvent(event, data));
  }
}

// Singleton para acceso global
export const networkSyncSubject = new NetworkSyncSubject();

// ─────────────────────────────────────────────
// Hook de React — Patrón Observer en componentes
// ─────────────────────────────────────────────
// Uso en componentes:
// const { isOnline, lastSyncEvent } = useSyncObserver();
//
// Este hook registra el componente como observador y
// actualiza su estado cuando el Service Worker notifica.

export type SyncState = {
  isOnline: boolean;
  lastSyncEvent: SyncEventType | null;
  pendingCount: number;
};
