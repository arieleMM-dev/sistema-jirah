export function isAdminResource(pathname: string): boolean {
  return pathname === '/dashboard' || [
    '/dashboard/personal', '/dashboard/catalogos', '/dashboard/comercial', '/dashboard/reportes',
    '/api/agricultores', '/api/catalogos/compradores', '/api/comercial', '/api/reportes', '/api/dashboard', '/api/campo/ajustes',
  ].some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'));
}

export function isKnownRole(role: unknown): boolean {
  return typeof role === 'string' && ['ADMIN', 'AGRICULTOR', 'CLASIFICADOR', 'AGRICULTOR_CLASIFICADOR'].includes(role);
}
