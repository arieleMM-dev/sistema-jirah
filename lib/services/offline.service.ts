import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import { OfflinePesajePayload, OfflineClasificacionPayload } from '../adapters/OfflinePayloadAdapter';
import type { ContextoCampo } from '@/lib/types/cosecha';
import { fechaFinca, jornadaId } from '@/lib/cosecha';

interface FincaJirahDB extends DBSchema {
  revisiones: { key: string; value: { id: string; userId: string; fecha: string; motivo: string; anterior: OfflineClasificacionPayload; reemplazoId: string } };
  contextos: { key: string; value: ContextoCampo };
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
      this.dbPromise = openDB<FincaJirahDB>('finca-jirah-db', 3, {
        blocked() {
          window.dispatchEvent(new Event('jirah-storage-blocked'));
        },
        blocking: () => { void this.close(); },
        upgrade(db) {
          if (!db.objectStoreNames.contains('revisiones')) db.createObjectStore('revisiones', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('contextos')) db.createObjectStore('contextos', { keyPath: 'userId' });
          if (!db.objectStoreNames.contains('pesajes')) {
            db.createObjectStore('pesajes', { keyPath: 'localId' });
          }
          if (!db.objectStoreNames.contains('clasificaciones')) {
            db.createObjectStore('clasificaciones', { keyPath: 'localId' });
          }
        },
      }).catch(error => { this.dbPromise = null; throw error; });
    }
    return this.dbPromise;
  }

  generateLocalId() {
    return uuidv4();
  }

  async getContext(userId: string) {
    const db = await this.initDB();
    return userId && db ? db.get('contextos', userId) : undefined;
  }

  async saveContext(userId: string, data: Partial<Omit<ContextoCampo, 'userId'>>) {
    const db = await this.initDB();
    if (!userId || !db) return;
    const tx = db.transaction('contextos', 'readwrite');
    const previous = await tx.store.get(userId);
    await tx.store.put({ ...previous, ...data, userId });
    await tx.done;
  }

  // --- Pesajes ---

  async savePesaje(payload: Omit<OfflinePesajePayload, 'localId' | 'timestamp' | 'syncStatus'> & { localId?: string; timestamp?: string }) {
    if (!payload.agricultor_id) throw new Error('Inicie sesión antes de registrar datos offline.');
    const db = await this.initDB();
    if (!db) throw new Error('El almacenamiento local no está disponible. No se guardó el pesaje.');
    const localId = payload.localId ?? this.generateLocalId();
    const timestamp = payload.timestamp ?? new Date().toISOString();
    const idJornada = jornadaId(payload.campana_codigo, payload.lote_codigo, fechaFinca(new Date(timestamp)));
    const pending = await this.getPendingClasificaciones(payload.agricultor_id);
    if (pending.some(c => 'versionFormato' in c && c.jornadaId === idJornada)) throw new Error('Esta jornada ya tiene una clasificación pendiente de sincronizar.');
    const fullPayload: OfflinePesajePayload = {
      ...payload,
      localId,
      timestamp,
      syncStatus: 'PENDING',
    };
    await db.add('pesajes', fullPayload);
    return localId;
  }

  async getPendingPesajes(userId: string) {
    if (!userId) return [];
    const db = await this.initDB();
    if (!db) return [];
    return (await db.getAll('pesajes')).filter(p => p.agricultor_id === userId && !p._sync?.pausada);
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

  async saveClasificacion(payload: Omit<import('../adapters/OfflinePayloadAdapter').OfflineClasificacionAnterior, 'localId' | 'timestamp'> |
    (Omit<import('../adapters/OfflinePayloadAdapter').OfflineClasificacionJornada, 'localId'> & { localId?: string })) {
    if (!payload.clasificador_id) throw new Error('Inicie sesión antes de registrar datos offline.');
    const db = await this.initDB();
    if (!db) throw new Error('El almacenamiento local no está disponible. No se guardó la clasificación.');
    const localId = 'localId' in payload && payload.localId ? payload.localId : this.generateLocalId();
    const fullPayload: OfflineClasificacionPayload = {
      ...payload,
      localId,
      timestamp: 'timestamp' in payload ? payload.timestamp : new Date().toISOString(),
    };
    await db.add('clasificaciones', fullPayload);
    return localId;
  }

  async getPendingClasificaciones(userId: string) {
    if (!userId) return [];
    const db = await this.initDB();
    if (!db) return [];
    return (await db.getAll('clasificaciones')).filter(c => c.clasificador_id === userId && !c._sync?.pausada);
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

  async cola(userId: string) {
    const db = await this.initDB();
    if (!db || !userId) return { pesajes: [], clasificaciones: [], revisiones: [] };
    const [pesajes, clasificaciones, revisiones] = await Promise.all([db.getAll('pesajes'), db.getAll('clasificaciones'), db.getAll('revisiones')]);
    return { pesajes: pesajes.filter(p => p.agricultor_id === userId), clasificaciones: clasificaciones.filter(c => c.clasificador_id === userId), revisiones: revisiones.filter(r => r.userId === userId) };
  }

  async errores(userId: string, kind: 'pesajes' | 'clasificaciones', errors: { localId?: string; error: string }[]) {
    const db = await this.initDB();
    if (!db) return;
    const tx = db.transaction(kind, 'readwrite');
    for (const error of errors) {
      if (!error.localId) continue;
      const p = await tx.store.get(error.localId);
      if (p && ('agricultor_id' in p ? p.agricultor_id : p.clasificador_id) === userId) {
        await tx.store.put({ ...p, _sync: { ...p._sync, error: error.error, intentadoEn: new Date().toISOString() } });
      }
    }
    await tx.done;
  }

  async pausar(userId: string, kind: 'pesajes' | 'clasificaciones', localId: string, pausada: boolean) {
    const db = await this.initDB();
    if (!db) throw new Error('Almacenamiento no disponible.');
    const tx = db.transaction(kind, 'readwrite');
    const p = await tx.store.get(localId);
    if (!p || ('agricultor_id' in p ? p.agricultor_id : p.clasificador_id) !== userId) throw new Error('Operación de otra cuenta.');
    await tx.store.put({ ...p, _sync: { ...p._sync, pausada } });
    await tx.done;
  }

  async reemplazarClasificacion(userId: string, anteriorId: string, reemplazo: import('../adapters/OfflinePayloadAdapter').OfflineClasificacionJornada, motivo: string) {
    const db = await this.initDB();
    if (!db) throw new Error('Almacenamiento no disponible.');
    if (motivo.trim().length < 5 || motivo.length > 1000 || reemplazo.clasificador_id !== userId) throw new Error('Escriba el motivo de la revisión.');
    const tx = db.transaction(['clasificaciones','revisiones'], 'readwrite');
    const anterior = await tx.objectStore('clasificaciones').get(anteriorId);
    if (!anterior || anterior.clasificador_id !== userId || anterior.localId === reemplazo.localId) throw new Error('No se pudo identificar la operación original.');
    if (await tx.objectStore('clasificaciones').get(reemplazo.localId)) throw new Error('El identificador de reemplazo ya está registrado.');
    await tx.objectStore('revisiones').put({ id: this.generateLocalId(), userId, fecha: new Date().toISOString(), motivo: motivo.trim(), anterior, reemplazoId: reemplazo.localId });
    await tx.objectStore('clasificaciones').put({ ...anterior, _sync: { ...anterior._sync, pausada: true } });
    await tx.objectStore('clasificaciones').put(reemplazo);
    await tx.done;
  }

  async close() { const db = await this.dbPromise; db?.close(); this.dbPromise = null; }

  async pendingCountOnDevice() {
    const db = await this.initDB();
    if (!db) throw new Error('No se pudo comprobar el almacenamiento local.');
    const [pesajes, clasificaciones, revisiones] = await Promise.all([db.count('pesajes'), db.getAll('clasificaciones'), db.getAll('revisiones')]);
    const reemplazados = new Set(revisiones.map(r => r.anterior.localId));
    return pesajes + clasificaciones.filter(c => !reemplazados.has(c.localId)).length;
  }
}

export const offlineService = new OfflineService();
