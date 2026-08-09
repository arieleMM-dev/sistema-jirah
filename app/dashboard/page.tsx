'use client';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useDashboardStats, Actividad } from '@/lib/hooks/useDashboardStats';
import { DownloadCloud, FileText, FileSpreadsheet, Plus } from 'lucide-react';

export default function DashboardContent() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const { stats, loading, filters, setFilters } = useDashboardStats();
  
  const { fechaDesde, fechaHasta, loteId, campanaId } = filters;
  const { setFechaDesde, setFechaHasta, setLoteId, setCampanaId, clearFilters } = setFilters;

  function exportarCSV() {
    if (!stats?.actividadReciente.length) return;
    const rows = stats.actividadReciente.map(a => [
      new Date(a.fechaRegistro).toLocaleDateString('es-EC'),
      a.campana.codigo,
      `${a.lote.codigo} - ${a.lote.nombre}`,
      `${a.agricultor.nombres} ${a.agricultor.apellidos}`,
      a.pesoBrutoKg.toFixed(2),
      a.pesoNetoKg.toFixed(2),
      a.clasificacion ? (a.clasificacion.dentroDelMargen ? 'OK' : 'ALERTA') : 'SIN CLASIFICAR',
    ]);
    const csv = [
      ['Fecha', 'Campaña', 'Lote', 'Agricultor', 'Peso Bruto (kg)', 'Peso Neto (kg)', 'Estado'],
      ...rows,
    ].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `reporte_jirah_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportarPDF() {
    if (!stats?.actividadReciente.length) return;
    const doc = new jsPDF();
    doc.text(`Reporte Finca Jirah - ${new Date().toLocaleDateString('es-EC')}`, 14, 15);
    const body = stats.actividadReciente.map(a => [
      new Date(a.fechaRegistro).toLocaleDateString('es-EC'),
      a.campana.codigo,
      `${a.lote.codigo} - ${a.lote.nombre}`,
      `${a.agricultor.nombres} ${a.agricultor.apellidos}`,
      a.pesoBrutoKg.toFixed(2),
      a.pesoNetoKg.toFixed(2),
      a.clasificacion ? (a.clasificacion.dentroDelMargen ? 'OK' : 'ALERTA') : 'PENDIENTE'
    ]);
    autoTable(doc, {
      head: [['Fecha', 'Campaña', 'Lote', 'Agricultor', 'Bruto (kg)', 'Neto (kg)', 'Estado']],
      body,
      startY: 20,
    });
    doc.save(`reporte_jirah_${new Date().toISOString().slice(0,10)}.pdf`);
  }

  function exportarExcel() {
    if (!stats?.actividadReciente.length) return;
    const data = stats.actividadReciente.map(a => ({
      Fecha: new Date(a.fechaRegistro).toLocaleDateString('es-EC'),
      Campaña: a.campana.codigo,
      Lote: `${a.lote.codigo} - ${a.lote.nombre}`,
      Agricultor: `${a.agricultor.nombres} ${a.agricultor.apellidos}`,
      'Peso Bruto (kg)': a.pesoBrutoKg,
      'Peso Neto (kg)': a.pesoNetoKg,
      Estado: a.clasificacion ? (a.clasificacion.dentroDelMargen ? 'OK' : 'ALERTA') : 'PENDIENTE'
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Actividad Reciente');
    XLSX.writeFile(workbook, `reporte_jirah_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  const hoy = new Date();
  const dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const fechaStr = `${dias[hoy.getDay()]}, ${hoy.getDate()} de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()}`;

  const maxKg = stats?.kgPorLote.length ? Math.max(...stats.kgPorLote.map(l => l.kg)) : 1;

  const syncStatus = (a: Actividad) => {
    if (!a.clasificacion) return { label: 'PENDIENTE', bg: 'bg-amber-100 dark:bg-amber-500/20', text: 'text-amber-700 dark:text-amber-400' };
    if (a.clasificacion.auditFlag) return { label: 'AUDITORIA', bg: 'bg-red-100 dark:bg-red-500/20', text: 'text-red-700 dark:text-red-400' };
    return { label: 'CLASIFICADO', bg: 'bg-green-100 dark:bg-green-500/20', text: 'text-green-700 dark:text-green-400' };
  };

  return (
    <div className="w-full">
      {/* Bienvenida */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-agri-green-dark dark:text-white tracking-tight">
            Bienvenido, <span className="text-agri-green-main dark:text-emerald-400">{user?.nombres ?? '...'}</span> 👋
          </h1>
          <div className="text-sm text-agri-slate dark:text-gray-400 mt-1">
            Panel de control — Finca Jirah · Pitahaya Amarilla · {fechaStr}
          </div>
        </div>
        <Link 
          href="/dashboard/campo/pesaje" 
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-6 text-sm font-semibold text-white bg-agri-green-main hover:bg-agri-green-dark rounded-lg shadow-sm hover:shadow transition-all"
        >
          <Plus size={16} />
          Nuevo Pesaje
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm">
        <div className="text-xs font-bold text-agri-slate dark:text-gray-400 uppercase tracking-wider px-2">Filtros:</div>
        <input type="date" className="min-h-[44px] rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-agri-green-main focus:border-agri-green-main transition-colors w-36" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} placeholder="Desde" />
        <input type="date" className="min-h-[44px] rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-agri-green-main focus:border-agri-green-main transition-colors w-36" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} placeholder="Hasta" />
        <select className="min-h-[44px] rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-agri-green-main focus:border-agri-green-main transition-colors min-w-[180px]" value={loteId} onChange={e => setLoteId(e.target.value)}>
          <option value="">Todos los lotes</option>
          {stats?.lotes.map(l => <option key={l.id} value={l.id}>{l.codigo} — {l.nombre}</option>)}
        </select>
        <select className="min-h-[44px] rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-agri-green-main focus:border-agri-green-main transition-colors min-w-[180px]" value={campanaId} onChange={e => setCampanaId(e.target.value)}>
          <option value="">Todas las campañas</option>
          {stats?.campanas.map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}
        </select>
        {(fechaDesde || fechaHasta || loteId || campanaId) && (
          <button className="min-h-[44px] px-4 text-sm font-medium text-agri-slate hover:text-agri-green-dark dark:text-gray-400 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700" onClick={clearFilters}>
            Limpiar
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 transition-all">
          <div className="w-10 h-10 rounded-lg bg-agri-green-main/10 dark:bg-agri-green-main/20 flex items-center justify-center text-agri-green-main dark:text-emerald-400 mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>
          </div>
          <div className="text-xs font-bold text-agri-slate dark:text-gray-400 uppercase tracking-widest mb-1">Kg Cosechados</div>
          <div className="text-3xl font-extrabold text-agri-green-dark dark:text-white tracking-tight">
            {loading ? '...' : stats?.kgTotal.toLocaleString('es-EC', { maximumFractionDigits: 0 }) ?? 0}
          </div>
          <div className="text-xs text-agri-slate dark:text-gray-400 mt-2 font-mono">{stats?.totalPesajes ?? 0} registros de pesaje</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 transition-all">
          <div className="w-10 h-10 rounded-lg bg-agri-clay/10 dark:bg-amber-500/10 flex items-center justify-center text-agri-clay dark:text-amber-400 mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
          </div>
          <div className="text-xs font-bold text-agri-slate dark:text-gray-400 uppercase tracking-widest mb-1">Campaña Activa</div>
          <div className="text-2xl font-bold text-agri-green-dark dark:text-white tracking-tight truncate font-mono">
            {loading ? '...' : stats?.campanaActiva?.codigo ?? '—'}
          </div>
          <div className="text-xs text-agri-slate dark:text-gray-400 mt-2 truncate">{stats?.campanaActiva?.nombre ?? 'Sin campaña activa'}</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 transition-all">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          </div>
          <div className="text-xs font-bold text-agri-slate dark:text-gray-400 uppercase tracking-widest mb-1">Lotes Activos</div>
          <div className="text-3xl font-extrabold text-agri-green-dark dark:text-white tracking-tight">
            {loading ? '...' : stats?.lotesConActividad ?? 0}
          </div>
          <div className="text-xs text-agri-slate dark:text-gray-400 mt-2">en el período seleccionado</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 transition-all">
          <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-400 mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div className="text-xs font-bold text-agri-slate dark:text-gray-400 uppercase tracking-widest mb-1">Alertas Margen</div>
          <div className={`text-3xl font-extrabold tracking-tight ${(stats?.alertasMargen ?? 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-agri-green-dark dark:text-white'}`}>
            {loading ? '...' : stats?.alertasMargen ?? 0}
          </div>
          <div className={`text-xs mt-2 font-mono ${(stats?.alertasMargen ?? 0) > 0 ? 'text-red-500' : 'text-agri-slate dark:text-gray-400'}`}>
            clasificaciones fuera de ±4%
          </div>
        </div>
      </div>

      {/* Gráficos y Tablas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Gráfico */}
        <div className="w-full overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-sm font-bold text-agri-green-dark dark:text-white">Kg Netos por Lote</h3>
            {(fechaDesde || fechaHasta) && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Filtrado</span>
            )}
          </div>
          <div className="p-6">
            {!stats?.kgPorLote.length ? (
              <div className="text-center py-12 text-sm text-agri-slate dark:text-gray-400">No existen registros de cosecha.</div>
            ) : (
              <>
                <div className="flex items-end gap-3 h-48 pt-4 relative">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 dark:opacity-10">
                    <div className="border-t border-dashed border-zinc-400 w-full"></div>
                    <div className="border-t border-dashed border-zinc-400 w-full"></div>
                    <div className="border-t border-dashed border-zinc-400 w-full"></div>
                    <div className="border-t border-dashed border-zinc-400 w-full"></div>
                  </div>

                  {stats.kgPorLote.map(l => {
                    const pct = maxKg > 0 ? (l.kg / maxKg) * 100 : 0;
                    return (
                      <div key={l.codigo} className="flex-1 flex flex-col items-center justify-end group relative z-10 h-full">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-agri-green-dark text-white text-[0.65rem] px-2 py-1 rounded shadow-lg whitespace-nowrap z-20 font-mono">
                          {l.kg.toLocaleString('es-EC')} kg
                        </div>
                        <div className="text-[0.65rem] text-agri-slate dark:text-gray-400 font-semibold mb-1 font-mono">
                          {l.kg >= 1000 ? `${(l.kg/1000).toFixed(1)}t` : `${l.kg.toFixed(0)}`}
                        </div>
                        <div 
                          className={`w-full max-w-[40px] rounded-t-md transition-all duration-500 hover:opacity-80 ${l.alertas > 0 ? 'bg-agri-clay' : 'bg-agri-green-main'}`} 
                          style={{ height: `${pct}%`, minHeight: '4px' }} 
                        />
                        <div className="text-[0.65rem] text-agri-slate dark:text-gray-400 font-medium mt-2 font-mono">{l.codigo}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-4 mt-6 text-xs text-agri-slate dark:text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-agri-green-main"></div> Dentro del margen
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-agri-clay"></div> Alertas detectadas
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tabla */}
        <div className="w-full overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-sm font-bold text-agri-green-dark dark:text-white">Actividad Reciente</h3>
            <div className="flex items-center gap-2">
              <button onClick={exportarCSV} className="text-agri-slate hover:text-agri-green-dark dark:hover:text-white transition-colors p-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700" title="Exportar CSV"><DownloadCloud size={16} /></button>
              <button onClick={exportarExcel} className="text-agri-slate hover:text-agri-green-main transition-colors p-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700" title="Exportar Excel"><FileSpreadsheet size={16} /></button>
              <button onClick={exportarPDF} className="text-agri-slate hover:text-red-600 transition-colors p-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700" title="Exportar PDF"><FileText size={16} /></button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-agri-green-dark">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Lote / Agricultor</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Neto</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody>
                {!stats?.actividadReciente.length ? (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-sm text-agri-slate dark:text-gray-400">No hay actividad reciente</td>
                  </tr>
                ) : (
                  stats.actividadReciente.map(a => {
                    const status = syncStatus(a);
                    return (
                      <tr key={a.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors even:bg-gray-50/50 dark:even:bg-gray-800/30">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-agri-slate">
                          {new Date(a.fechaRegistro).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-agri-green-dark dark:text-gray-200 font-mono">{a.lote.codigo}</div>
                          <div className="text-xs text-agri-slate dark:text-gray-400 truncate max-w-[140px]">{a.agricultor.nombres} {a.agricultor.apellidos}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold font-mono text-agri-slate">
                          {a.pesoNetoKg.toFixed(1)}kg
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}>
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
