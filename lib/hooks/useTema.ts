'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { aplicarTema, consultarTema, guardarTema, sincronizarTema, temaLocal, temaPendiente, type Tema } from '@/lib/tema';
const subscribe = (changed: () => void) => {
  window.addEventListener('jirah-tema-cambiado', changed); window.addEventListener('storage', changed);
  return () => { window.removeEventListener('jirah-tema-cambiado', changed); window.removeEventListener('storage', changed); };
};
export function useTema(userId?: string) {
  const tema = useSyncExternalStore(subscribe, () => temaLocal(userId), () => 'CLARO' as Tema);
  const pendiente = useSyncExternalStore(subscribe, () => Boolean(userId && temaPendiente(userId)), () => false);
  const [error, setError] = useState('');
  useEffect(() => { aplicarTema(tema); }, [tema]);
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const sync = () => { if (navigator.onLine) void sincronizarTema(userId).then(() => { if (!cancelled) setError(''); }).catch(e => { if (!cancelled) setError(e.message); }); };
    sync(); void consultarTema(userId).catch(() => {});
    window.addEventListener('online', sync); window.addEventListener('jirah-tema-cambiado', sync);
    const timer = setInterval(() => { if (document.visibilityState === 'visible') sync(); }, 30_000);
    return () => { cancelled = true; clearInterval(timer); window.removeEventListener('online', sync); window.removeEventListener('jirah-tema-cambiado', sync); };
  }, [userId]);
  function guardar(value: Tema) {
    if (!userId) return;
    try { guardarTema(userId, value); setError(''); }
    catch { setError('No se pudo guardar la preferencia en este navegador.'); }
  }
  return { tema, guardar, mensaje: error || (pendiente ? 'Guardada en este dispositivo; pendiente de sincronizar con su cuenta.' : 'La preferencia se sincroniza con su cuenta al tener conexión.') };
}
