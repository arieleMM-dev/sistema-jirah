'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { ReporteCosecha } from '@/lib/services/reporte.service';
import { estadosJornada } from '@/lib/reportes/filas';
import { exportarReporte } from '@/lib/reportes/exportar';

const input = 'min-w-0 max-w-full min-h-[44px] rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2';
const numero = (v: number | null, decimales = 3) => v === null ? '—' : v.toLocaleString('es-EC', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });

function ReportesContent() {
  const params = useSearchParams();
  const [filtros, setFiltros] = useState(() => ({ fechaDesde: params.get('fechaDesde') ?? '', fechaHasta: params.get('fechaHasta') ?? '',
    campanaId: params.get('campanaId') ?? '', loteId: params.get('loteId') ?? '' }));
  const [reporte, setReporte] = useState<ReporteCosecha | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v));
    void fetch(`/api/reportes/cosecha?${query}`, { signal: controller.signal, cache: 'no-store' }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'No se pudo cargar el reporte.');
      setReporte(data); setError('');
    }).catch((e: unknown) => {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Error de conexión.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [filtros, revision]);
  function cambiar(clave: keyof typeof filtros, valor: string) { setLoading(true); setError(''); setFiltros(f => ({ ...f, [clave]: valor })); }
  async function exportar(formato: 'csv' | 'xlsx' | 'pdf') {
    if (!reporte || loading || error) return;
    setExportando(true);
    try { await exportarReporte(reporte, formato); }
    catch { setError('No se pudo generar el archivo. Actualice el reporte y vuelva a intentar.'); }
    finally { setExportando(false); }
  }
  const t = reporte?.totales;
  return <div className="space-y-6 text-agri-green-dark dark:text-gray-100">
    <header className="flex flex-wrap justify-between gap-4"><div><h1 className="text-2xl font-bold">Reporte de cosecha</h1>
      <p className="text-sm mt-1">Todos los registros del período, organizados por campaña, jornada y lote.</p></div>
      <button className={input} onClick={() => { setLoading(true); setRevision(n => n + 1); }}>Actualizar</button></header>
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      <label className="min-w-0 grid gap-1 text-sm">Desde<input className={input} type="date" value={filtros.fechaDesde} onChange={e => cambiar('fechaDesde', e.target.value)} /></label>
      <label className="min-w-0 grid gap-1 text-sm">Hasta<input className={input} type="date" value={filtros.fechaHasta} onChange={e => cambiar('fechaHasta', e.target.value)} /></label>
      <label className="col-span-2 lg:col-span-1 min-w-0 grid gap-1 text-sm">Campaña<select className={input} aria-label="Campaña del reporte" value={filtros.campanaId} onChange={e => cambiar('campanaId', e.target.value)}><option value="">Todas</option>{reporte?.campanas.map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}</select></label>
      <label className="col-span-2 lg:col-span-1 min-w-0 grid gap-1 text-sm">Lote<select className={input} aria-label="Lote del reporte" value={filtros.loteId} onChange={e => cambiar('loteId', e.target.value)}><option value="">Todos</option>{reporte?.lotes.map(l => <option key={l.id} value={l.id}>{l.codigo} — {l.nombre}</option>)}</select></label>
      <button className={input + ' self-end'} onClick={() => { setLoading(true); setFiltros({ fechaDesde: '', fechaHasta: '', campanaId: '', loteId: '' }); }}>Limpiar filtros</button>
    </div>
    {error && <p role="alert" className="p-4 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200 rounded-lg">{error}</p>}
    {loading ? <p role="status">Cargando el reporte completo…</p> : !error && reporte && t && <>
      <div className="flex flex-wrap gap-3">{(['csv','xlsx','pdf'] as const).map(f => <button key={f} className={input} disabled={exportando || (!reporte.jornadas.length && !reporte.historicos.length)} onClick={() => void exportar(f)}>Descargar {f.toUpperCase()}</button>)}</div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{[
        ['Cosechado neto', `${numero(t.cosechado)} kg`], ['Exportación original', `${numero(t.exportacion)} kg (${numero(t.pctExportacion, 2)} %)`],
        ['Nacional original', `${numero(t.nacional)} kg (${numero(t.pctNacional, 2)} %)`], ['Total clasificado', `${numero(t.totalClasificado)} kg`],
      ].map(([label, valor]) => <div key={label} className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"><p className="text-sm">{label}</p><p className="text-lg font-bold mt-2">{valor}</p></div>)}</div>
      <p className="text-sm">{t.numGavetas} gavetas cosechadas · {t.jornadasPendientes} jornadas sin clasificar · {t.pendientesAprobacion} descuadres pendientes de aprobación.</p>
      <p className="text-sm">Cuadre de jornadas clasificadas: {numero(t.cosechadoClasificado)} − {numero(t.totalClasificado)} = <strong>{numero(t.diferenciaKg)} kg ({numero(t.margenErrorPct, 2)} %)</strong>. Las jornadas sin clasificar no entran en este porcentaje. Cada jornada conserva su propia revisión de ±4 %.</p>
      <section className="rounded-xl bg-white dark:bg-gray-800 p-4 overflow-x-auto"><h2 className="font-bold mb-3">Categorías originales</h2>
        <table className="w-full text-sm text-left"><thead><tr>{['Categoría','Gavetas','Bruto kg','Neto kg'].map(v => <th className="p-2" key={v}>{v}</th>)}</tr></thead>
          <tbody>{reporte.categorias.map(c => <tr key={c.categoria} className="border-t border-gray-200 dark:border-gray-700"><td className="p-2">{c.categoria}</td><td>{c.numGavetas}</td><td>{numero(c.pesoBrutoKg)}</td><td>{numero(c.pesoNetoKg)}</td></tr>)}</tbody></table>
      </section>
      <section className="space-y-3"><h2 className="font-bold">Jornadas y lotes ({reporte.jornadas.length})</h2>
        <div className="p-4 border rounded-xl space-y-2"><h3 className="font-bold">Resultado comercial ajustado</h3>
          <p>Rechazo atribuido: {numero(reporte.comercial.rechazoAtribuidoKg)} kg · sin atribuir en entregas relacionadas: {numero(reporte.comercial.rechazoSinAtribuirKg)} kg.</p>
          {reporte.comercial.ajusteIncompleto ? <p>No es posible calcular el ajuste de este filtro: hay devoluciones sin atribuir en entregas que también contienen otros orígenes.</p> : <>
            <p>Exportación ajustada: {numero(reporte.comercial.exportacionAjustada)} kg ({numero(reporte.comercial.pctExportacionAjustada, 2)} %).</p>
            <p>Nacional ajustada: {numero(reporte.comercial.nacionalAjustada)} kg ({numero(reporte.comercial.pctNacionalAjustada, 2)} %).</p>
          </>}
          <p className="text-xs">El rechazo pasa de exportación a nacional. Los rechazos sin atribuir solo afectan al total cuando todos los orígenes de su entrega están incluidos; nunca se reparten entre lotes. Las descargas detallan las entregas relacionadas y sus orígenes.</p>
        </div>
        {!reporte.jornadas.length && <p>No hay jornadas en este período.</p>}
        {reporte.jornadas.map(j => <details key={j.id} className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <summary className="cursor-pointer font-semibold">{j.fecha} · {j.campana.codigo} · {j.lote.codigo} · {numero(j.pesoNetoKg)} kg · {estadosJornada[j.estado]}</summary>
          <div className="space-y-3 mt-4 text-sm"><p>{j.campana.cultivo} · Funda {j.campana.funda}</p><p>{j.numGavetas} gavetas · Bruto {numero(j.pesoBrutoKg)} kg · Tara {numero(j.taraBase)} kg/gaveta</p>
            {j.clasificacion && <><p>Exportación {numero(j.clasificacion.pesoExportacionKg)} kg · Nacional {numero(j.clasificacion.pesoNacionalKg)} kg · Diferencia {numero(j.clasificacion.diferenciaKg)} kg ({numero(j.clasificacion.margenErrorPct, 2)} %)</p>
              <ul>{j.clasificacion.detalles.map(d => <li key={d.categoria}>{d.categoria}: {d.numGavetas} gavetas · bruto {numero(d.pesoBrutoKg)} kg · neto {numero(d.pesoNetoKg)} kg</li>)}</ul>
              <p>Clasificador: {j.clasificacion.clasificador.nombres} {j.clasificacion.clasificador.apellidos}. {j.clasificacion.observaciones}</p>
              {j.clasificacion.aprobador && <p>Aprobó: {j.clasificacion.aprobador.nombres} {j.clasificacion.aprobador.apellidos} · {j.clasificacion.motivoAprobacion}</p>}</>}
            <h3 className="font-semibold">Pesajes ({j.pesajes.length})</h3><ul>{j.pesajes.map(p => <li key={p.id}>{new Date(p.fechaRegistro).toLocaleTimeString('es-EC', { timeZone: 'America/Guayaquil' })} · {p.agricultor.nombres} {p.agricultor.apellidos} · {p.numGavetas} gavetas · {numero(p.pesoNetoKg)} kg netos</li>)}</ul>
          </div></details>)}
      </section>
      {reporte.historicos.length > 0 && <section className="p-4 rounded-xl bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100 space-y-3"><h2 className="font-bold">Registros anteriores ({reporte.historicos.length})</h2>
        <p className="text-sm">Se incluyen completos en las descargas y se conservan aparte de los porcentajes por categorías. No contienen información suficiente para reconstruir G/P/N1/N2/N3.</p>
        <ul className="text-sm">{reporte.historicos.map(p => <li key={p.id}>{new Date(p.fechaRegistro).toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' })} · {p.campana.codigo} · {p.lote.codigo} · {p.numGavetas} gavetas · {numero(p.pesoNetoKg)} kg</li>)}</ul>
      </section>}
    </>}
  </div>;
}

export default function ReportesPage() {
  return <Suspense fallback={<p>Cargando filtros…</p>}><ReportesContent /></Suspense>;
}
