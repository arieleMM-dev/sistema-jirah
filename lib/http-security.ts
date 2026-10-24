import { isIP } from 'node:net';

// Solo confiar en estas cabeceras si el proxy de despliegue las elimina y reescribe.
export function networkIdentity(headers: Headers): string {
  if (process.env.TRUST_PROXY_HEADERS !== 'true') return 'shared';
  const ip = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return ip && isIP(ip) ? ip : 'shared';
}

export async function bodyWithinLimit(request: Request, maximum: number): Promise<boolean> {
  const declared = request.headers.get('content-length');
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > maximum)) return false;
  if (!request.body) return true;
  const reader = request.body.getReader();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error('BODY_TIMEOUT')), 10_000);
  });
  let total = 0;
  try {
    while (true) {
      const { value, done } = await Promise.race([reader.read(), expired]);
      if (done) return true;
      total += value.byteLength;
      if (total > maximum) return false;
    }
  } finally {
    if (timeout) clearTimeout(timeout);
    void reader.cancel().catch(() => {});
  }
}

export function contentSecurityPolicy(nonce: string): string {
  const development = process.env.NODE_ENV === 'development';
  const modelTextures = process.env.JIRAH_AUTH_3D_PROTOTYPE === 'true' ? ' blob:' : '';
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:", "font-src 'self'",
    `connect-src 'self'${modelTextures}${development ? ' ws: wss:' : ''}`,
    "worker-src 'self' blob:", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'",
  ].join('; ');
}
