import type { Session } from 'next-auth';
import { isKnownRole } from '@/lib/auth/permissions';

export const OFFLINE_CAPTURE_MS = 7 * 24 * 60 * 60 * 1000;

export function clearOfflineAccess() {
  try { localStorage.removeItem('jirah-sesion-campo'); localStorage.removeItem('jirah-cierre-pendiente'); localStorage.removeItem('jirah-preparacion-campo'); }
  catch { /* Sin almacenamiento no se habilita captura local. */ }
}

export function readServerSession(value: unknown, now = Date.now()): Session | undefined {
  if (!value || typeof value !== 'object') return;
  const s = value as Partial<Session>;
  if (typeof s.expires !== 'string' || !Number.isFinite(Date.parse(s.expires)) || Date.parse(s.expires) <= now ||
    !s.user || typeof s.user.id !== 'string' || !s.user.id || !isKnownRole(s.user.rol) ||
    (s.user.estadoAcceso !== undefined && s.user.estadoAcceso !== 'APROBADO') ||
    typeof s.user.nombres !== 'string' || typeof s.user.apellidos !== 'string') return;
  return { expires: s.expires, user: { id: s.user.id, rol: s.user.rol, nombres: s.user.nombres, apellidos: s.user.apellidos,
    estadoAcceso: 'APROBADO', emailVerificado: s.user.emailVerificado === true } };
}

// Identidad para captura local: nunca sustituye el JWT ni autoriza una API.
// Solo debe renovarse después de obtener una sesión válida directamente del servidor.
export function rememberServerSession(session: Session, now = Date.now()): string | undefined {
  const valid = readServerSession(session, now);
  if (!valid) return;
  return JSON.stringify({ version: 1, validatedAt: now,
    offlineExpires: new Date(now + OFFLINE_CAPTURE_MS).toISOString(), serverExpires: valid.expires, user: valid.user });
}

export function readOfflineSession(raw: string | null, now = Date.now()): Session | undefined {
  if (!raw) return;
  try {
    const s = JSON.parse(raw);
    if (!s || typeof s !== 'object' || Array.isArray(s)) return;
    // Las identidades anteriores conservan únicamente su vigencia original, sin extenderlas.
    if (s.version === undefined) return readServerSession(s, now);
    if (s.version !== 1 || !Number.isSafeInteger(s.validatedAt) || s.validatedAt > now + 300_000 ||
      typeof s.serverExpires !== 'string' || !Number.isFinite(Date.parse(s.serverExpires)) ||
      typeof s.offlineExpires !== 'string' || Date.parse(s.offlineExpires) !== s.validatedAt + OFFLINE_CAPTURE_MS) return;
    return readServerSession({ expires: s.offlineExpires, user: s.user }, now);
  } catch { return; }
}

// Un fallo de red no es una revocación. Una respuesta válida sin usuario sí lo es.
export async function validateServerSession(): Promise<Session | undefined> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch('/api/auth/session', { cache: 'no-store', signal: controller.signal });
    if (response.status === 401 || response.status === 403) return;
    if (!response.ok) throw new Error('No se pudo contactar con el servidor.');
    return readServerSession(await response.json());
  } finally { clearTimeout(timeout); }
}
