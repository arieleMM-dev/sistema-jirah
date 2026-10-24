import type { ReporteCosecha } from '@/lib/services/reporte.service';

export type CeldaReporte = string | number | null;
export const estadosJornada: Record<string, string> = {
  ABIERTA: 'Sin clasificar', CLASIFICADA: 'Dentro del margen', PENDIENTE_APROBACION: 'Pendiente de aprobación', APROBADA: 'Aprobada con descuadre',
};
function fragmentos(texto: string) {
  const partes: string[] = [];
  for (let inicio = 0; inicio < texto.length;) {
    let fin = Math.min(inicio + 32000, texto.length);
    if (fin < texto.length && /[\uD800-\uDBFF]/.test(texto[fin - 1])) fin--;
    partes.push(texto.slice(inicio, fin)); inicio = fin;
  }
  return partes.length ? partes : [''];
}

export function filasReporte(r: ReporteCosecha) {
  const t = r.totales;
  return {
    Resumen: [
      ['Finca JIRAH — Reporte de cosecha'], ['Generado', r.generadoEn],
      ['Desde', r.filtros.fechaDesde ?? 'Todas'], ['Hasta', r.filtros.fechaHasta ?? 'Todas'],
      ['Campaña ID', r.filtros.campanaId ?? 'Todas'], ['Lote ID', r.filtros.loteId ?? 'Todos'],
      ['Indicador', 'Valor'], ['Cosechado neto (kg)', t.cosechado], ['Gavetas cosechadas', t.numGavetas],
      ['Cosechado neto de jornadas clasificadas (kg)', t.cosechadoClasificado],
      ['Exportación original (kg)', t.exportacion], ['Nacional original (kg)', t.nacional],
      ['Total clasificado (kg)', t.totalClasificado], ['Diferencia en jornadas clasificadas (kg)', t.diferenciaKg],
      ['Diferencia / clasificado (%)', t.margenErrorPct], ['Exportación original (%)', t.pctExportacion], ['Nacional original (%)', t.pctNacional],
      ['Jornadas sin clasificar', t.jornadasPendientes], ['Descuadres sin aprobar', t.pendientesAprobacion],
      ['Pesajes históricos sin categorías reconstruibles', r.historicos.length],
      ['Rechazo atribuido a orígenes del filtro (kg)', r.comercial.rechazoAtribuidoKg],
      ['Rechazo sin atribuir en entregas relacionadas (kg)', r.comercial.rechazoSinAtribuirKg],
      ['Exportación ajustada (kg)', r.comercial.exportacionAjustada], ['Nacional ajustada (kg)', r.comercial.nacionalAjustada],
      ['Exportación ajustada (%)', r.comercial.pctExportacionAjustada], ['Nacional ajustada (%)', r.comercial.pctNacionalAjustada],
      ['Ajuste comercial', r.comercial.ajusteIncompleto ? 'No calculable: rechazo sin atribuir en entregas con orígenes fuera del filtro.' : 'El ajuste agregado no reparte rechazos sin atribuir entre lotes.'],
      ['Alcance', 'Clasificación original y ajuste comercial separado. Los históricos se detallan aparte; no se incluyen en los porcentajes por categorías.'],
    ],
    Jornadas: [
      ['Fecha', 'Campaña', 'Lote', 'Funda', 'Estado', 'Gavetas cosechadas', 'Bruto cosechado kg', 'Neto cosechado kg', 'Tara kg', 'P desde g', 'G desde g',
        'Exportación kg', 'Nacional kg', 'Clasificado kg', 'Diferencia kg', 'Diferencia %', 'Exportación %', 'Nacional %', 'Clasificador', 'Fecha clasificación', 'Observaciones', 'Aprobador', 'Motivo aprobación', 'Fecha aprobación', 'Cultivo'],
      ...r.jornadas.map(j => { const c = j.clasificacion; return [j.fecha, j.campana.codigo, j.lote.codigo, j.campana.funda, estadosJornada[j.estado], j.numGavetas, j.pesoBrutoKg, j.pesoNetoKg, j.taraBase, j.minimoPGr, j.minimoGGr,
        c?.pesoExportacionKg ?? null, c?.pesoNacionalKg ?? null, c?.totalClasificado ?? null, c?.diferenciaKg ?? null, c?.margenErrorPct ?? null,
        c ? c.pesoExportacionKg / c.totalClasificado * 100 : null, c ? c.pesoNacionalKg / c.totalClasificado * 100 : null,
        c ? `${c.clasificador.nombres} ${c.clasificador.apellidos}` : '', c?.fechaRegistro ?? '', c?.observaciones ?? '',
        c?.aprobador ? `${c.aprobador.nombres} ${c.aprobador.apellidos}` : '', c?.motivoAprobacion ?? '', c?.fechaAprobacion ?? '', j.campana.cultivo]; }),
    ],
    Categorias: [
      ['Fecha', 'Campaña', 'Lote', 'Categoría', 'Gavetas', 'Bruto kg', 'Tara por gaveta kg', 'Neto kg'],
      ...r.jornadas.flatMap(j => (j.clasificacion?.detalles ?? []).map(d => [j.fecha, j.campana.codigo, j.lote.codigo, d.categoria, d.numGavetas, d.pesoBrutoKg, j.taraBase, d.pesoNetoKg])),
    ],
    Pesajes: [
      ['ID', 'Fecha y hora UTC', 'Jornada Ecuador', 'Campaña', 'Lote', 'Responsable', 'Gavetas', 'Bruto kg', 'Tara por gaveta kg', 'Neto kg'],
      ...r.jornadas.flatMap(j => j.pesajes.map(p => [p.id, p.fechaRegistro, j.fecha, j.campana.codigo, j.lote.codigo, `${p.agricultor.nombres} ${p.agricultor.apellidos}`, p.numGavetas, p.pesoBrutoKg, j.taraBase, p.pesoNetoKg])),
    ],
    Entregas: [
      ['Entrega ID', 'Fecha', 'Comprador', 'Tipo al entregar', 'Responsable', 'Detalle ID', 'Jornada origen', 'Campaña', 'Lote', 'Devolución origen (reventa)', 'Categoría', 'Gavetas', 'Bruto kg', 'Tara kg', 'Neto kg', 'Fuera del filtro', 'Estado'],
      ...r.entregas.flatMap(e => e.detalles.map(d => [e.id, e.fecha, e.nombreComprador, e.tipoComprador, `${e.responsable.nombres} ${e.responsable.apellidos}`, d.id,
        d.clasificacion?.jornada.fecha ?? '', d.clasificacion?.jornada.campana.codigo ?? '', d.clasificacion?.jornada.lote.codigo ?? '',
        d.devolucionId ?? '', d.categoria, d.numGavetas, d.pesoBrutoKg, e.taraKg, d.pesoNetoKg, e.incluyeOrigenesFueraDelFiltro ? 'Incluye otros orígenes; no sumar todo al filtro' : 'No', e.anulacion ? 'ANULADA: excluir de saldos' : 'VIGENTE'])),
    ],
    Devoluciones: [
      ['ID', 'Entrega ID', 'Comprador', 'Fecha', 'Origen detalle ID', 'Gavetas', 'Bruto kg', 'Tara kg', 'Neto kg', 'Motivo', 'Responsable', 'Registrado UTC', 'Estado'],
      ...r.entregas.flatMap(e => e.devoluciones.map(d => [d.id, e.id, e.nombreComprador, d.fecha, d.detalleOrigenId ?? 'Sin atribuir', d.numGavetas, d.pesoBrutoKg, d.taraKg, d.pesoNetoKg,
        d.motivo, `${d.responsable.nombres} ${d.responsable.apellidos}`, d.createdAt, d.anulacion ? 'ANULADA: excluir de saldos' : 'VIGENTE'])),
    ],
    Anulaciones: [
      ['ID', 'Entrega ID', 'Devolución ID', 'Fecha UTC', 'Administrador', 'Motivo', 'Parte', 'Movimiento anterior JSON (concatenar partes)'],
      ...r.entregas.flatMap(e => [e.anulacion, ...e.devoluciones.map(d => d.anulacion)].flatMap(a => a ? fragmentos(a.antes).map((parte, i) => [a.id, a.entregaId ?? '', a.devolucionId ?? '', a.createdAt, `${a.responsable.nombres} ${a.responsable.apellidos}`, a.motivo, i + 1, parte]) : [])),
    ],
    Correcciones: [
      ['ID', 'Jornada ID', 'Fecha UTC', 'Administrador', 'Motivo', 'Parte', 'Valores anteriores JSON (concatenar partes)', 'Valores posteriores JSON (concatenar partes)'],
      ...r.revisiones.flatMap(v => { const antes = fragmentos(v.antes), despues = fragmentos(v.despues);
        return Array.from({ length: Math.max(antes.length, despues.length) }, (_, i) => [v.id, v.jornadaId, v.createdAt,
          `${v.responsable.nombres} ${v.responsable.apellidos}`, v.motivo, i + 1, antes[i] ?? '', despues[i] ?? '']); }),
    ],
    Historicos: [
      ['ID', 'Fecha y hora UTC', 'Campaña', 'Lote', 'Responsable', 'Gavetas', 'Bruto kg', 'Tara total kg', 'Neto kg', 'Exportación kg', 'Nacional kg', 'Descarte histórico kg', 'Observaciones'],
      ...r.historicos.map(p => [p.id, p.fechaRegistro, p.campana.codigo, p.lote.codigo, `${p.agricultor.nombres} ${p.agricultor.apellidos}`, p.numGavetas, p.pesoBrutoKg, p.taraTotal, p.pesoNetoKg,
        p.clasificacion?.pesoExportacionKg ?? null, p.clasificacion?.pesoNacionalKg ?? null, p.clasificacion?.pesoDescarte ?? null, p.observaciones ?? '']),
    ],
  } satisfies Record<string, CeldaReporte[][]>;
}

export function csvSeguro(rows: CeldaReporte[][]) {
  return '\ufeff' + rows.map(row => row.map(cell => {
    let text = cell === null ? '' : String(cell);
    // Evitar que valores de catálogos/observaciones se ejecuten como fórmulas al abrir CSV.
    if (typeof cell === 'string' && /^[\s]*[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  }).join(',')).join('\r\n');
}
