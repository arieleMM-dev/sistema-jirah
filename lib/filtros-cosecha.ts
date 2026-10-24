export type FiltrosCosecha = { fechaDesde?: string | null; fechaHasta?: string | null; campanaId?: string; loteId?: string };

export function validarFiltros(filtros: FiltrosCosecha) {
  for (const fecha of [filtros.fechaDesde, filtros.fechaHasta]) {
    if (fecha && (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !Number.isFinite(Date.parse(fecha)) || new Date(fecha).toISOString().slice(0, 10) !== fecha)) {
      throw new Error('FILTROS_INVALIDOS');
    }
  }
  if (filtros.fechaDesde && filtros.fechaHasta && filtros.fechaDesde > filtros.fechaHasta) throw new Error('FILTROS_INVALIDOS');
  if ([filtros.campanaId, filtros.loteId].some(id => id !== undefined && (typeof id !== 'string' || id.length > 200))) throw new Error('FILTROS_INVALIDOS');
  return {
    fechaDesde: filtros.fechaDesde || undefined, fechaHasta: filtros.fechaHasta || undefined,
    campanaId: filtros.campanaId || undefined, loteId: filtros.loteId || undefined,
  };
}

export function rangoFechasFinca(filtros: FiltrosCosecha) {
  const validos = validarFiltros(filtros);
  return {
    ...validos,
    fechaDesde: validos.fechaDesde ? new Date(`${validos.fechaDesde}T00:00:00.000-05:00`) : undefined,
    fechaHasta: validos.fechaHasta ? new Date(`${validos.fechaHasta}T23:59:59.999-05:00`) : undefined,
  };
}
