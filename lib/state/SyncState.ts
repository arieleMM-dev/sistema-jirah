// ============================================================
// PATRÓN STATE — Ciclo de vida de datos offline
// ============================================================
// Un pesaje bruto pasa por: PENDING → SYNCING → SYNCED
// El estado controla el comportamiento del objeto y bloquea
// la edición una vez sincronizado con PostgreSQL.

export type SyncStatusType = 'PENDING' | 'SYNCING' | 'SYNCED';

export interface ISyncState {
  status: SyncStatusType;
  canEdit(): boolean;
  canSync(): boolean;
  getLabel(): string;
  getColor(): string;
}

// Estado PENDING: Solo vive en IndexedDB del dispositivo
class PendingState implements ISyncState {
  status: SyncStatusType = 'PENDING';
  canEdit() { return true; }
  canSync() { return true; }
  getLabel() { return 'Pendiente'; }
  getColor() { return '#f59e0b'; } // Amarillo/dorado
}

// Estado SYNCING: Service Worker está enviando al servidor
class SyncingState implements ISyncState {
  status: SyncStatusType = 'SYNCING';
  canEdit() { return false; } // Bloquear edición durante sync
  canSync() { return false; }
  getLabel() { return 'Sincronizando...'; }
  getColor() { return '#3b82f6'; } // Azul
}

// Estado SYNCED: Respaldado en PostgreSQL, bloqueado
class SyncedState implements ISyncState {
  status: SyncStatusType = 'SYNCED';
  canEdit() { return false; } // Inmutable una vez sincronizado
  canSync() { return false; }
  getLabel() { return 'Sincronizado'; }
  getColor() { return '#10b981'; } // Verde esmeralda
}

// Contexto del Patrón State
export class SyncStateContext {
  private state: ISyncState;

  constructor(initialStatus: SyncStatusType = 'PENDING') {
    this.state = SyncStateContext.createState(initialStatus);
  }

  private static createState(status: SyncStatusType): ISyncState {
    switch (status) {
      case 'PENDING':  return new PendingState();
      case 'SYNCING':  return new SyncingState();
      case 'SYNCED':   return new SyncedState();
    }
  }

  // Transiciones de estado
  startSync() {
    if (this.state.canSync()) {
      this.state = new SyncingState();
    }
  }

  completeSync() {
    this.state = new SyncedState();
  }

  failSync() {
    this.state = new PendingState(); // Regresa a PENDING si falla
  }

  // Delegación al estado actual
  get canEdit() { return this.state.canEdit(); }
  get canSync() { return this.state.canSync(); }
  get label() { return this.state.getLabel(); }
  get color() { return this.state.getColor(); }
  get status() { return this.state.status; }
}
