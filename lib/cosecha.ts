// Cálculos compartidos por la vista previa, la API y la sincronización.
export const CATEGORIAS = ['G', 'P', 'N1', 'N2', 'N3'] as const;
export type CategoriaFruta = typeof CATEGORIAS[number];
export type PesoCategoria = { categoria: CategoriaFruta; numGavetas: number; pesoBrutoKg: number };
export const kg = (value: number) => Math.round((value + Number.EPSILON) * 1000) / 1000;

export function fechaFinca(date: Date = new Date()): string {
  if (!Number.isFinite(date.getTime())) throw new Error('FECHA_INVALIDA');
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'America/Guayaquil', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const part = (type: string) => parts.find(p => p.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function jornadaId(campanaId: string, loteId: string, fecha: string) {
  return [campanaId, loteId, fecha].map(encodeURIComponent).join('/');
}

export function calcularClasificacion(pesoCosechadoKg: number, taraBase: number, raw: unknown) {
  if (!Number.isFinite(pesoCosechadoKg) || pesoCosechadoKg < 0 || !Number.isFinite(taraBase) || taraBase <= 0) throw new Error('DATOS_INVALIDOS');
  if (!Array.isArray(raw) || raw.length !== CATEGORIAS.length) throw new Error('CATEGORIAS_INVALIDAS');
  const detalles = CATEGORIAS.map(categoria => {
    const matches = raw.filter(value => value && typeof value === 'object' && value.categoria === categoria);
    if (matches.length !== 1) throw new Error('CATEGORIAS_INVALIDAS');
    const { numGavetas, pesoBrutoKg } = matches[0];
    if (!Number.isSafeInteger(numGavetas) || numGavetas < 0 || !Number.isFinite(pesoBrutoKg) || pesoBrutoKg < 0 ||
      (numGavetas === 0 && pesoBrutoKg !== 0) || (numGavetas > 0 && pesoBrutoKg <= 0)) throw new Error('PESOS_CATEGORIA_INVALIDOS');
    const pesoNetoKg = kg(pesoBrutoKg - numGavetas * taraBase);
    if (!Number.isFinite(pesoNetoKg) || pesoBrutoKg < numGavetas * taraBase) throw new Error('NETO_CATEGORIA_NEGATIVO');
    return { categoria, numGavetas: numGavetas as number, pesoBrutoKg: pesoBrutoKg as number, pesoNetoKg };
  });
  const pesoExportacionKg = kg(detalles.filter(d => d.categoria === 'G' || d.categoria === 'P').reduce((sum, d) => sum + d.pesoNetoKg, 0));
  const pesoNacionalKg = kg(detalles.filter(d => d.categoria.startsWith('N')).reduce((sum, d) => sum + d.pesoNetoKg, 0));
  const totalClasificado = kg(pesoExportacionKg + pesoNacionalKg);
  if (!Number.isFinite(totalClasificado) || totalClasificado <= 0) throw new Error('TOTAL_CLASIFICADO_CERO');
  const diferenciaKg = kg(pesoCosechadoKg - totalClasificado);
  const margenErrorPct = diferenciaKg / totalClasificado * 100;
  // Comparar masas evita que el redondeo visual apruebe 4,001 % como 4,00 %.
  const dentroDelMargen = Math.abs(diferenciaKg) <= totalClasificado * 0.04 + 1e-9;
  return { detalles, pesoExportacionKg, pesoNacionalKg, totalClasificado, diferenciaKg, margenErrorPct, dentroDelMargen };
}

export function mensajeCosecha(error: unknown): string {
  const messages: Record<string, string> = {
    FECHA_INVALIDA: 'Fecha de captura inválida.', DATOS_INVALIDOS: 'Revise los datos enviados.',
    CATEGORIAS_INVALIDAS: 'Incluya una vez cada categoría: G, P, N1, N2 y N3.',
    PESOS_CATEGORIA_INVALIDOS: 'Revise pesos y cantidades enteras por categoría. Una categoría sin gavetas debe tener peso cero.',
    NETO_CATEGORIA_NEGATIVO: 'El bruto de una categoría es menor que la tara de sus gavetas.',
    TOTAL_CLASIFICADO_CERO: 'El total clasificado debe ser mayor que cero para calcular el cuadre.',
    JORNADA_NO_ENCONTRADA: 'Jornada no encontrada.', JORNADA_CERRADA: 'La jornada ya fue clasificada. El pesaje sigue pendiente de revisión.',
    JORNADA_MODIFICADA: 'La jornada cambió o faltan pesajes por sincronizar. Actualice y revise sus datos antes de guardar.',
    CLASIFICACION_EXISTENTE: 'La jornada ya tiene otra clasificación.', IDENTIDAD_CONFLICTIVA: 'El identificador corresponde a otro contenido.',
    MISMA_JORNADA: 'La clasificación debe capturarse el mismo día de la cosecha.',
    APROBACION_NO_AUTORIZADA: 'Solo un administrador activo puede aprobar un descuadre.',
    MOTIVO_REQUERIDO: 'Escriba el motivo de aprobación (entre 5 y 1000 caracteres).',
    NO_REQUIERE_APROBACION: 'Esta jornada no tiene un descuadre pendiente de aprobación.',
    PESAJE_AGRUPADO: 'Clasifique la jornada completa desde la pantalla de clasificación.',
    PARAMETROS_INVALIDOS: 'Los límites deben ser números positivos y el mínimo G debe superar al mínimo P.',
  };
  return error instanceof Error ? messages[error.message] ?? 'No se pudo completar la operación. Intente nuevamente.' : 'No se pudo completar la operación.';
}
