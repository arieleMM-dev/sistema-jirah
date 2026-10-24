import { offlineService } from '@/lib/services/offline.service';
import { OFFLINE_CAPTURE_MS, rememberServerSession, validateServerSession } from '@/lib/auth/offline-session';

export const READINESS_KEY = 'jirah-preparacion-campo';
export const FIELD_ROUTES = ['pesaje', 'clasificacion', 'pendientes'].map(p => '/dashboard/campo/' + p);
export type OfflineReadiness = { version: 1; userId: string; preparedAt: number; expiresAt: number; persistent: boolean };
export function readReadiness(userId: string): OfflineReadiness | undefined {
  try {
    const r = JSON.parse(localStorage.getItem(READINESS_KEY) ?? 'null');
    if (r?.version === 1 && r.userId === userId && Number.isSafeInteger(r.preparedAt) && r.preparedAt <= Date.now() + 300_000 && r.expiresAt === r.preparedAt + OFFLINE_CAPTURE_MS) return r;
  } catch { /* El estado permanece sin preparar si el almacenamiento está restringido. */ }
}
async function cacheAsset(url: string, signal: AbortSignal) {
  const parsed = new URL(url, location.origin);
  if (parsed.origin !== location.origin || !parsed.pathname.startsWith('/_next/static/')) return;
  const r = await fetch(parsed.href, { signal });
  if (!r.ok) throw new Error('No se pudo preparar un recurso de la aplicación. Vuelva a intentar con conexión.');
  if (parsed.pathname.endsWith('.css')) {
    const fonts = [...(await r.text()).matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(m => new URL(m[1], parsed.href).href);
    await Promise.all(fonts.map(font => cacheAsset(font, signal)));
  }
}
export async function prepareOfflineDevice(userId: string, signal: AbortSignal): Promise<OfflineReadiness> {
  if (!navigator.onLine || !window.isSecureContext || !navigator.serviceWorker || !window.caches) throw new Error('La preparación requiere conexión, HTTPS y un navegador compatible.');
  const session = await validateServerSession();
  if (session?.user?.id !== userId || session.user.estadoAcceso !== 'APROBADO') throw new Error('Inicie sesión con una cuenta aprobada antes de preparar este dispositivo.');
  if (!navigator.serviceWorker.controller) throw new Error('El modo sin conexión se está instalando. Espere unos segundos y vuelva a comprobar.');
  const estimate = await navigator.storage?.estimate?.();
  if (estimate?.quota && estimate.usage !== undefined && estimate.quota - estimate.usage < 10 * 1024 * 1024) throw new Error('Queda poco almacenamiento. Libere espacio sin borrar los datos de JIRAH y vuelva a comprobar.');
  const persistent = await navigator.storage?.persist?.().catch(() => false) ?? false;
  const responses = await Promise.all(['/api/catalogos/campanias', '/api/catalogos/lotes', '/api/campo/jornadas'].map(url => fetch(url, { cache: 'no-store', signal })));
  if (responses.some(r => !r.ok)) throw new Error('No se pudieron preparar los catálogos y las jornadas. Compruebe su sesión y conexión.');
  const [c, l, j] = await Promise.all(responses.map(r => r.json()));
  await offlineService.saveContext(userId, { campanas: c.campanas, lotes: l.lotes, jornadas: j.jornadas });
  const assets = new Set<string>();
  for (const route of FIELD_ROUTES) {
    const r = await fetch(route, { cache: 'reload', headers: { Accept: 'text/html' }, signal });
    if (!r.ok || r.redirected || !r.headers.get('content-type')?.includes('text/html')) throw new Error('No se pudo preparar una pantalla de campo. Inicie sesión y vuelva a intentar.');
    const html = new DOMParser().parseFromString(await r.text(), 'text/html');
    html.querySelectorAll('script[src],link[rel="stylesheet"][href],link[rel="preload"][as="font"][href]').forEach(el => {
      const src = el.getAttribute('src') ?? el.getAttribute('href'); if (src) assets.add(src);
    });
  }
  await Promise.all([...assets].map(url => cacheAsset(url, signal)));
  const pages = await caches.open('jirah-campo-pages-v1');
  const cached = await Promise.all(FIELD_ROUTES.map(route => pages.match(route)));
  if (cached.some(r => !r?.ok)) throw new Error('Las pantallas todavía no están disponibles sin conexión. Vuelva a comprobar.');
  if (signal.aborted) throw new DOMException('Preparación cancelada', 'AbortError');
  const preparedAt = Date.now(), identity = rememberServerSession(session, preparedAt);
  if (!identity) throw new Error('Su sesión venció durante la preparación. Ingrese nuevamente.');
  const result: OfflineReadiness = { version: 1, userId, preparedAt, expiresAt: preparedAt + OFFLINE_CAPTURE_MS, persistent };
  localStorage.setItem('jirah-sesion-campo', identity);
  localStorage.setItem(READINESS_KEY, JSON.stringify(result));
  window.dispatchEvent(new Event('jirah-offline-prepared'));
  return result;
}
