export const TAMANO_PAGINA = 25;
export function paginaValida(value: unknown = 1): number {
  const p = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof p !== 'number' || !Number.isSafeInteger(p) || p < 1 || p > 1_000_000) throw new Error('PAGINACION_INVALIDA');
  return p;
}
export function idFiltro(value?: string | null) {
  if (value == null) return undefined;
  if (!value.length || value.length > 128) throw new Error('FILTRO_INVALIDO');
  return value;
}
