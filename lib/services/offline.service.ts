import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import { OfflinePesajePayload, OfflineClasificacionPayload } from '../adapters/OfflinePayloadAdapter';

interface FincaJirahDB extends DBSchema {
  pesajes: {
    key: string;
    value: OfflinePesajePayload;
  };
  clasificaciones: {
    key: string;
    value: OfflineClasificacionPayload;
  };
}

class OfflineService {
  private dbPromise: Promise<IDBPDatabase<FincaJirahDB>> | null = null;

  private initDB() {
    if (typeof window === 'undefined') return null;
    if (!this.dbPromise) {
      this.dbPromise = openDB<FincaJirahDB>('finca-jirah-db', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('pesajes')) {
            db.createObjectStore('pesajes', { keyPath: 'localId' });
          }
          if (!db.objectStoreNames.contains('clasificaciones')) {
            db.createObjectStore('clasificaciones', { keyPath: 'localId' });
          }
        },
      });
    }
    return this.dbPromise;
  }

  generateLocalId() {
    return uuidv4();
  }

  // --- Pesajes ---

  async savePesaje(payload: Omit<OfflinePesajePayload, 'localId' | 'timestamp' | 'syncStatus'>) {
    const db = await this.initDB();
    if (!db) return null;
    const localId = this.generateLocalId();
    const fullPayload: OfflinePesajePayload = {
      ...payload,
      localId,
      timestamp: new Date().toISOString(),
      syncStatus: 'PENDING',
    };
    await db.put('pesajes', fullPayload);
    return localId;
  }

  async getPendingPesajes() {
    const db = await this.initDB();
    if (!db) return [];
    return db.getAll('pesajes');
  }

  async removePesajes(localIds: string[]) {
    const db = await this.initDB();
    if (!db) return;
    const tx = db.transaction('pesajes', 'readwrite');
    for (const id of localIds) {
      tx.store.delete(id);
    }
    await tx.done;
  }

  // --- Clasificaciones ---

  async saveClasificacion(payload: Omit<OfflineClasificacionPayload, 'localId' | 'timestamp'>) {
    const db = await this.initDB();
    if (!db) return null;
    const localId = this.generateLocalId();
    const fullPayload: OfflineClasificacionPayload = {
      ...payload,
      localId,
      timestamp: new Date().toISOString(),
    };
    await db.put('clasificaciones', fullPayload);
    return localId;
  }

  async getPendingClasificaciones() {
    const db = await this.initDB();
    if (!db) return [];
    return db.getAll('clasificaciones');
  }

  async removeClasificaciones(localIds: string[]) {
    const db = await this.initDB();
    if (!db) return;
    const tx = db.transaction('clasificaciones', 'readwrite');
    for (const id of localIds) {
      tx.store.delete(id);
    }
    await tx.done;
  }
}

export const offlineService = new OfflineService();
