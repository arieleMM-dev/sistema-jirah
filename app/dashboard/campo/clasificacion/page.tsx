'use client';

import { useClasificacion } from '@/lib/hooks/useClasificacion';
import { CATEGORIAS, fechaFinca } from '@/lib/cosecha';
import CorreccionJornada from './CorreccionJornada';

const inputClass = 'min-h-[44px] w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm';
const stateLabels = { ABIERTA: 'Por clasificar', CLASIFICADA: 'Dentro del margen', PENDIENTE_APROBACION: 'Requiere aprobación', APROBADA: 'Aprobada por administrador' };

export default function ClasificacionPage() {
  const h = useClasificacion();
  const j = h.selected;
  const result = j?.clasificacion ?? h.preview?.value;
  const descriptions = j ? {
    G: `Grande, desde ${j.minimoGGr} g`, P: `Pequeña, desde ${j.minimoPGr} hasta menos de ${j.minimoGGr} g`,
    N1: 'Nacional grande, selección visual', N2: 'Nacional mediana, selección visual', N3: 'Nacional pequeña, selección visual',
  } : null;
  return <div className="max-w-7xl mx-auto space-y-6 text-agri-green-dark dark:text-gray-100">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-2xl font-bold">Clasificación por jornada y lote</h1>
        <p className="text-sm text-agri-slate dark:text-gray-400 mt-1">Reúna los pesajes del día y clasifique la fruta manteniendo separado cada lote.</p></div>
      <button className={inputClass + ' w-auto'} onClick={() => void h.actualizar()}>Actualizar jornadas</button>
    </header>
    {h.error && <p role="alert" className="p-4 rounded-lg bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200">{h.error}</p>}
    {h.registrosAnteriores > 0 && <p className="text-sm p-4 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100 rounded-lg">
      Se conservan {h.registrosAnteriores} pesajes anteriores a la organización por jornadas. No se han repartido entre categorías ni agrupado automáticamente.
    </p>}
    {h.loading ? <p role="status">Cargando jornadas…</p> : <div className="grid lg:grid-cols-3 gap-6 items-start">
      <aside className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <h2 className="font-bold">Jornadas registradas ({h.jornadas.length})</h2>
        <p className="text-sm">{h.soloPreparadas ? 'Sin servidor: jornadas preparadas y capturas locales de esta cuenta.' : 'Hasta 25 jornadas por página, además de sus capturas pendientes. Sin conexión se conserva la primera página preparada.'}</p>
        {h.jornadas.length === 0 && <p className="text-sm">Registre un pesaje para iniciar una jornada.</p>}
        <div className="space-y-2 max-h-[700px] overflow-y-auto">{h.jornadas.map(group => <button key={group.id} onClick={() => h.seleccionar(group)}
          className={`w-full text-left border rounded-lg p-3 space-y-1 ${j?.id === group.id ? 'border-agri-green-main bg-agri-green-main/10' : 'border-gray-200 dark:border-gray-700'}`}>
          <span className="block font-semibold">{group.lote.codigo} · {group.campana.codigo}</span>
          <span className="block text-sm">{group.fecha} · {group.pesoNetoKg.toFixed(2)} kg netos</span>
          <span className="block text-xs">{group.pesajes.length} pesajes · {group.numGavetas} gavetas</span>
          <span className="block text-xs font-semibold">{group.pendienteLocal ? 'Guardada en dispositivo; pendiente de sincronizar' : stateLabels[group.estado]}</span>
        </button>)}</div>
        {!h.soloPreparadas && <nav className="flex flex-wrap items-center gap-2 text-sm" aria-label="Paginación de jornadas">
          <button className={inputClass + ' w-auto'} disabled={h.loading || h.pagina === 1} onClick={() => h.cambiarPagina(h.pagina - 1)}>Anterior</button>
          <span>Página {h.pagina} de {h.paginas}</span>
          <button className={inputClass + ' w-auto'} disabled={h.loading || h.pagina >= h.paginas} onClick={() => h.cambiarPagina(h.pagina + 1)}>Siguiente</button>
        </nav>}
      </aside>
      <section className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-5">
        {!j ? <p>Seleccione una jornada para clasificar o consultar su resultado.</p> : <>
          <header><h2 className="text-lg font-bold">{j.lote.nombre} · {j.campana.nombre}</h2>
            <p className="text-sm">Jornada {j.fecha} · {j.numGavetas} gavetas cosechadas · tara aplicada {j.taraBase.toFixed(2)} kg</p>
            <p className="font-semibold mt-2">Cosechado neto: {j.pesoNetoKg.toFixed(3)} kg</p></header>
          <details className="text-sm"><summary className="cursor-pointer">Ver pesajes y responsables ({j.pesajes.length})</summary>
            <ul className="mt-2 space-y-1">{j.pesajes.map(p => <li key={p.id}>{p.agricultor.nombres} {p.agricultor.apellidos} · {new Date(p.fechaRegistro).toLocaleTimeString('es-EC', { timeZone: 'America/Guayaquil' })} · {p.numGavetas} gavetas · {p.pesoNetoKg.toFixed(3)} kg netos</li>)}</ul>
          </details>
          <div className="space-y-3">{CATEGORIAS.map(categoria => {
            const saved = j.clasificacion?.detalles.find(d => d.categoria === categoria);
            return <fieldset key={categoria} disabled={Boolean(j.clasificacion || j.pendienteLocal) || h.saving}
              className="grid sm:grid-cols-3 gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <legend className="px-1 font-semibold">{categoria} — {descriptions?.[categoria]}</legend>
              <label className="text-sm">Gavetas<input aria-label={`Gavetas ${categoria}`} type="number" min="0" step="1" className={inputClass}
                value={saved?.numGavetas ?? h.form[categoria].gavetas} onChange={e => h.setForm(f => ({ ...f, [categoria]: { ...f[categoria], gavetas: e.target.value } }))} /></label>
              <label className="text-sm">Peso bruto (kg)<input aria-label={`Peso bruto ${categoria}`} type="number" min="0" step="0.001" className={inputClass}
                value={saved?.pesoBrutoKg ?? h.form[categoria].bruto} onChange={e => h.setForm(f => ({ ...f, [categoria]: { ...f[categoria], bruto: e.target.value } }))} /></label>
              <p className="text-sm self-end py-3">Neto: {(saved?.pesoNetoKg ?? h.preview?.value?.detalles.find(d => d.categoria === categoria)?.pesoNetoKg)?.toFixed(3) ?? '—'} kg</p>
            </fieldset>;
          })}</div>
          {!j.clasificacion && !j.pendienteLocal && <label className="block text-sm">Observaciones<textarea maxLength={2000} className={inputClass} value={h.observaciones} onChange={e => h.setObservaciones(e.target.value)} /></label>}
          {result && <div className="p-4 rounded-lg bg-agri-green-main/10 space-y-2" aria-live="polite">
            <p>Exportación: <strong>{result.pesoExportacionKg.toFixed(3)} kg</strong> · {(result.pesoExportacionKg / result.totalClasificado * 100).toFixed(2)} %</p>
            <p>Nacional: <strong>{result.pesoNacionalKg.toFixed(3)} kg</strong> · {(result.pesoNacionalKg / result.totalClasificado * 100).toFixed(2)} %</p>
            <p>Total clasificado: <strong>{result.totalClasificado.toFixed(3)} kg</strong></p>
            <p>Diferencia cosechado − clasificado: <strong>{result.diferenciaKg.toFixed(3)} kg ({result.margenErrorPct.toFixed(2)} %)</strong></p>
            <p className="font-semibold">{result.dentroDelMargen ? 'Dentro del margen de ±4 %' : j.estado === 'APROBADA' ? 'Fuera del margen: aprobado por el administrador' : 'Fuera del margen: requiere aprobación del administrador'}</p>
            <p className="text-xs">Porcentaje calculado sobre el total clasificado.</p>
          </div>}
          {!j.clasificacion && !j.pendienteLocal && <>
            {h.preview?.error && <p role="status" className="text-sm">{h.preview.error}</p>}
            {j.fecha !== fechaFinca() && <p className="text-sm text-amber-700 dark:text-amber-200">La captura de clasificación corresponde al día de cosecha. Esta jornada es de otra fecha.</p>}
            <p className="text-sm">Guarde cuando haya terminado de registrar todos los pesajes de este lote y jornada.</p>
            <button disabled={h.saving || !h.preview?.value || j.fecha !== fechaFinca()} onClick={() => void h.guardar()}
              className="min-h-[44px] px-5 rounded-lg bg-agri-green-main text-white font-semibold disabled:opacity-50">{h.saving ? 'Guardando…' : 'Guardar clasificación de la jornada'}</button>
          </>}
          {j.pendienteLocal && <p role="status" className="p-3 rounded bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100">La clasificación está guardada en este dispositivo. Su confirmación y cualquier aprobación necesitan sincronización.</p>}
          {j.clasificacion && <div className="text-sm space-y-1">
            <p>Clasificado por {j.clasificacion.clasificador.nombres} {j.clasificacion.clasificador.apellidos} · {new Date(j.clasificacion.fechaRegistro).toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })}</p>
            {j.clasificacion.observaciones && <p>Observaciones: {j.clasificacion.observaciones}</p>}
          </div>}
          {j.estado === 'PENDIENTE_APROBACION' && (h.isAdmin ? <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
            <label className="block text-sm">Motivo de aprobación<textarea minLength={5} maxLength={1000} className={inputClass} value={h.motivo} onChange={e => h.setMotivo(e.target.value)} /></label>
            <button disabled={h.saving || h.motivo.trim().length < 5} onClick={() => void h.aprobar()} className="min-h-[44px] px-5 rounded-lg bg-amber-700 text-white disabled:opacity-50">Aprobar descuadre</button>
          </div> : <p>El administrador debe revisar y aprobar este descuadre.</p>)}
          {j.clasificacion?.fechaAprobacion && <p className="text-sm">Aprobado por {j.clasificacion.aprobador?.nombres} {j.clasificacion.aprobador?.apellidos}: {j.clasificacion.motivoAprobacion} · {new Date(j.clasificacion.fechaAprobacion).toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })}</p>}
          {h.isAdmin && j.clasificacion && <CorreccionJornada key={`${j.id}:${j.version}`} jornada={j} actualizar={h.actualizar} />}
        </>}
      </section>
    </div>}
  </div>;
}
