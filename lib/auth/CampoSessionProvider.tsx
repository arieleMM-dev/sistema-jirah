'use client';
import { SessionProvider, signOut, useSession } from 'next-auth/react';
import type { Session } from 'next-auth';
import { useEffect, useState } from 'react';
import { readOfflineSession, rememberServerSession, validateServerSession } from '@/lib/auth/offline-session';

const cacheKey = 'jirah-sesion-campo';
const logoutKey = 'jirah-cierre-pendiente';
// Navegadores que restringen almacenamiento aún pueden usar la sesión online.
function leerLocal(key: string) { try { return localStorage.getItem(key); } catch { return null; } }
function escribirLocal(key: string, value?: string) {
  try { if (value === undefined) localStorage.removeItem(key); else localStorage.setItem(key, value); }
  catch { /* La identidad offline no se habilita si el navegador no permite guardarla. */ }
}
function recordar(session: Session) {
  // Solo una preparación completa renueva la ventana offline de un dispositivo preparado.
  try {
    const prepared = JSON.parse(leerLocal('jirah-preparacion-campo') ?? 'null');
    const previous = JSON.parse(leerLocal(cacheKey) ?? 'null');
    if (prepared?.userId === session.user?.id && previous?.user?.id === session.user?.id) return;
  } catch { /* Una identidad malformada se reemplaza con una validación real. */ }
  escribirLocal(cacheKey, rememberServerSession(session));
}
export async function cerrarSesionCampo() {
  escribirLocal(cacheKey);
  escribirLocal(logoutKey, '1');
  window.dispatchEvent(new Event('jirah-session-locked'));
  if (!navigator.onLine) return;
  try { await signOut({ redirect: false }); escribirLocal(logoutKey); window.location.assign(new URL('/login', window.location.origin).href); }
  catch { /* El bloqueo local se conserva hasta confirmar el cierre en el servidor. */ }
}

function RecordarSesion() {
  const { data: session, update } = useSession();
  const userId = session?.user?.id;
  useEffect(() => {
    let cancelled = false, validating = false;
    const validate = async () => {
      if (!userId || !navigator.onLine || validating) return;
      validating = true;
      try {
        const current = await validateServerSession();
        if (cancelled) return;
        if (!current) {
          escribirLocal(cacheKey);
          window.location.assign(new URL('/login', window.location.origin).href);
          return;
        }
        recordar(current);
        if (current.user?.id !== userId) { window.location.reload(); return; }
        // update() conserva la sesión actual si falla el transporte; el refresco automático no.
        await update();
      } catch { /* Con señal aparente pero sin servidor se conserva la identidad local vigente. */ }
      finally { validating = false; }
    };
    const online = () => { void validate(); };
    const refresh = setInterval(online, 60_000);
    const expiry = setInterval(() => {
      if (session?.expires && Date.parse(session.expires) <= Date.now() && !readOfflineSession(leerLocal(cacheKey))) void cerrarSesionCampo();
    }, 30_000);
    window.addEventListener('online', online);
    return () => { cancelled = true; window.removeEventListener('online', online); clearInterval(expiry); clearInterval(refresh); };
  }, [update, session?.expires, userId]);
  return null;
}

export default function CampoSessionProvider({ children }: { children: React.ReactNode }) {
  const [initial, setInitial] = useState<{ ready: boolean; locked: boolean; session?: Session | null }>({ ready: false, locked: false });
  useEffect(() => {
    let cancelled = false;
    let locked = leerLocal(logoutKey) === '1';
    const initialize = async () => {
      if (locked) { if (!cancelled) setInitial({ ready: true, locked: true }); return; }
      let current: Session | undefined;
      try {
        if (!navigator.onLine) throw new Error('Sin red');
        current = await validateServerSession();
        if (!cancelled && !locked) { if (current) recordar(current); else escribirLocal(cacheKey); }
      } catch { current = readOfflineSession(leerLocal(cacheKey)); }
      if (!cancelled && !locked) setInitial({ ready: true, locked: false, session: current ?? null });
    };
    void initialize();
    const lock = () => { locked = true; setInitial({ ready: true, locked: true }); };
    const online = () => { if (leerLocal(logoutKey) === '1') void cerrarSesionCampo(); };
    window.addEventListener('jirah-session-locked', lock); window.addEventListener('online', online);
    if (locked && navigator.onLine) void cerrarSesionCampo();
    return () => { cancelled = true; window.removeEventListener('jirah-session-locked', lock); window.removeEventListener('online', online); };
  }, []);
  if (!initial.ready) return <p className="p-6">Cargando sesión…</p>;
  if (initial.locked) return <main className="p-6 space-y-4"><h1>Sesión cerrada en este dispositivo</h1>
    <p>Sus registros pendientes siguen guardados. Conéctese para confirmar el cierre de sesión y volver a ingresar.</p>
    <button className="min-h-11 px-4 border rounded" onClick={() => void cerrarSesionCampo()}>Confirmar cierre con conexión</button></main>;
  return <SessionProvider session={initial.session} refetchWhenOffline={false} refetchOnWindowFocus={false} refetchInterval={0}>
    <RecordarSesion />{children}
  </SessionProvider>;
}
