export type Tema = 'CLARO' | 'OSCURO';
type CambioTema = { id: string; tema: Tema };
const key = (userId: string) => 'jirah-tema-pendiente:' + userId;
const valueKey = (userId: string) => 'jirah-tema-cuenta:' + userId;
const revisionKey = (userId: string) => 'jirah-tema-revision:' + userId;
const valid = (t: unknown): t is Tema => t === 'CLARO' || t === 'OSCURO';
const notify = () => { if (typeof window !== 'undefined') window.dispatchEvent(new Event('jirah-tema-cambiado')); };
async function perfil(options: RequestInit = {}) {
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 15_000);
  try { return await fetch('/api/perfil', { ...options, signal: controller.signal }); }
  finally { clearTimeout(timeout); }
}
export function temaPendiente(userId: string): CambioTema | undefined {
  try { const p = JSON.parse(localStorage.getItem(key(userId)) ?? 'null'); if (p && typeof p.id === 'string' && valid(p.tema)) return p; } catch { /* Almacenamiento no disponible. */ }
}
export function temaLocal(userId?: string): Tema {
  try {
    const t = userId ? localStorage.getItem(valueKey(userId)) : null;
    if (valid(t)) return t;
    return localStorage.getItem('jirah-tema') === 'dark' ? 'OSCURO' : 'CLARO';
  } catch { return 'CLARO'; }
}
export function aplicarTema(tema: Tema) {
  const value = tema === 'OSCURO' ? 'dark' : 'light';
  document.documentElement.classList.toggle('dark', value === 'dark');
  document.documentElement.setAttribute('data-theme', value);
  try { localStorage.setItem('jirah-tema', value); } catch { /* El tema actual puede aplicarse sin persistencia. */ }
}
export function guardarTema(userId: string, tema: Tema) {
  if (!userId || !valid(tema)) throw new Error('Preferencia inválida.');
  // Persistir antes de anunciar guardado; no se confirma una cola que falló.
  const id = crypto.randomUUID();
  localStorage.setItem(revisionKey(userId), id);
  localStorage.setItem(key(userId), JSON.stringify({ id, tema }));
  localStorage.setItem(valueKey(userId), tema); aplicarTema(tema); notify();
}
const flights = new Map<string, Promise<void>>();
export function sincronizarTema(userId: string): Promise<void> {
  const current = flights.get(userId); if (current) return current;
  const send = async () => {
    // Solo la cuenta autenticada solicita esta operación. El servidor comprueba la cookie.
    for (let i = 0; i < 3; i++) {
      const p = temaPendiente(userId); if (!p) return;
      const r = await perfil({ method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Jirah-User': userId }, body: JSON.stringify({ tema: p.tema }) });
      if (!r.ok) throw new Error(r.status === 401 ? 'Ingrese nuevamente para sincronizar la preferencia.' : 'La preferencia sigue pendiente de sincronizar.');
      if (temaPendiente(userId)?.id === p.id) { localStorage.removeItem(key(userId)); notify(); return; }
    }
  };
  const locked = async (): Promise<void> => {
    if (typeof navigator !== 'undefined' && navigator.locks) await navigator.locks.request('jirah-tema:' + userId, send);
    else await send();
  };
  const result = locked().finally(() => flights.delete(userId)); flights.set(userId, result); return result;
}
export async function consultarTema(userId: string) {
  if (temaPendiente(userId)) return;
  const revision = localStorage.getItem(revisionKey(userId));
  const r = await perfil({ cache: 'no-store' }); if (!r.ok) return;
  const data = await r.json();
  if (data.user?.id === userId && valid(data.user?.tema) && !temaPendiente(userId) && revision === localStorage.getItem(revisionKey(userId))) {
    localStorage.setItem(valueKey(userId), data.user.tema); notify();
  }
}
