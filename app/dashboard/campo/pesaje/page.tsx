'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { usePesaje } from '@/lib/hooks/usePesaje';

export default function PesajePage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const {
    campanas, lotes, historial, loading, error, form, setForm,
    calc, errors, saving, handleGuardar
  } = usePesaje(userId);

  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const onSubmit = async () => {
    const result = await handleGuardar();
    if (result) {
      setToast({ msg: result.msg, type: result.type });
      setTimeout(() => setToast(null), 4000);
    }
  };

  const campanaSeleccionada = campanas.find(c => c.id === form.campanaId);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5">
          <div className={`px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 border ${
            toast.type === 'success' ? 'bg-agri-green-main/10 border-agri-green-main/20 text-agri-green-dark dark:bg-green-900/30 dark:border-green-800 dark:text-green-300' :
            toast.type === 'error' ? 'bg-red-50/95 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300' :
            'bg-blue-50/95 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300'
          } backdrop-blur-md`}>
            {toast.msg}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-agri-green-dark dark:text-white tracking-tight">Registrar Cosecha</h1>
        <p className="text-sm text-agri-slate dark:text-gray-400 mt-1">Pesaje bruto de pitahaya por lote — CU-05.1</p>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-agri-green-main border-t-transparent rounded-full" />
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          
          {/* Formulario de Pesaje */}
          <div className="xl:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
            {errors.general && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800 text-sm font-semibold">
                {errors.general}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-agri-green-dark dark:text-gray-300 mb-2">Campaña Activa <span className="text-red-500">*</span></label>
                <select 
                  className="min-h-[44px] w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-agri-green-main focus:border-agri-green-main"
                  value={form.campanaId}
                  onChange={e => setForm(f => ({ ...f, campanaId: e.target.value }))}
                >
                  <option value="">— Seleccionar campaña —</option>
                  {campanas.map(c => (
                    <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>
                  ))}
                </select>
                {errors.campanaId && <p className="text-xs text-red-500 font-medium">{errors.campanaId}</p>}
                {campanaSeleccionada && (
                  <p className="text-xs font-semibold text-agri-green-main dark:text-emerald-400 mt-1 bg-agri-green-main/10 dark:bg-emerald-900/20 inline-block px-2 py-1 rounded-md font-mono">Tara Base: {campanaSeleccionada.taraBase} kg/gaveta</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-agri-green-dark dark:text-gray-300 mb-2">Lote Asignado <span className="text-red-500">*</span></label>
                <select 
                  className="min-h-[44px] w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-agri-green-main focus:border-agri-green-main"
                  value={form.loteId}
                  onChange={e => setForm(f => ({ ...f, loteId: e.target.value }))}
                >
                  <option value="">— Seleccionar lote —</option>
                  {lotes.map(l => (
                    <option key={l.id} value={l.id}>{l.codigo} — {l.nombre}</option>
                  ))}
                </select>
                {errors.loteId && <p className="text-xs text-red-500 font-medium">{errors.loteId}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-agri-green-dark dark:text-gray-300 mb-2">Nº de Gavetas <span className="text-red-500">*</span></label>
                <input 
                  type="number" min="1" step="1" placeholder="Ej: 8"
                  className="min-h-[44px] w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm shadow-sm transition-colors placeholder:text-agri-slate/50 focus:outline-none focus:ring-2 focus:ring-agri-green-main focus:border-agri-green-main"
                  value={form.numGavetas}
                  onChange={e => setForm(f => ({ ...f, numGavetas: e.target.value }))}
                />
                {errors.numGavetas && <p className="text-xs text-red-500 font-medium">{errors.numGavetas}</p>}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-agri-green-dark dark:text-gray-300 mb-2">Peso Bruto Total (kg) <span className="text-red-500">*</span></label>
                <input 
                  type="number" min="0.1" step="0.1" placeholder="Ej: 154.5"
                  className="min-h-[44px] w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm shadow-sm transition-colors placeholder:text-agri-slate/50 focus:outline-none focus:ring-2 focus:ring-agri-green-main focus:border-agri-green-main font-mono"
                  value={form.pesoBrutoKg}
                  onChange={e => setForm(f => ({ ...f, pesoBrutoKg: e.target.value }))}
                />
                {errors.pesoBrutoKg && <p className="text-xs text-red-500 font-medium">{errors.pesoBrutoKg}</p>}
              </div>
            </div>

            <div className="space-y-2 mb-8">
              <label className="block text-sm font-medium text-agri-green-dark dark:text-gray-300 mb-2">Observaciones (Opcional)</label>
              <textarea 
                className="min-h-[44px] w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-sm shadow-sm transition-colors placeholder:text-agri-slate/50 focus:outline-none focus:ring-2 focus:ring-agri-green-main focus:border-agri-green-main resize-none min-h-[5rem]"
                placeholder="Notas sobre el estado de la fruta..."
                value={form.observaciones}
                onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
              <button 
                onClick={onSubmit}
                disabled={saving}
                className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-lg text-sm font-semibold shadow-sm bg-agri-green-main text-white hover:bg-agri-green-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {saving ? 'Registrando...' : 'Confirmar Cosecha'}
              </button>
            </div>
          </div>

          {/* Panel Lateral: Cálculo en Tiempo Real */}
          <div className="xl:col-span-1 flex flex-col gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 relative overflow-hidden">
              <h2 className="text-lg font-bold text-agri-green-dark dark:text-white tracking-tight mb-6">Calculadora</h2>
              
              {calc ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-sm font-medium text-agri-slate">Peso Bruto</span>
                    <span className="font-mono text-agri-slate font-semibold">{parseFloat(form.pesoBrutoKg).toFixed(2)} kg</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-sm font-medium text-agri-slate">Tara Total ({form.numGavetas} gv)</span>
                    <span className="font-mono text-red-500 font-semibold">-{calc.taraTotal.toFixed(2)} kg</span>
                  </div>
                  <div className={`mt-4 p-4 rounded-lg flex justify-between items-center ${calc.pesoNeto >= 0 ? 'bg-agri-green-main/10 dark:bg-emerald-950/30 border border-agri-green-main/20 dark:border-emerald-900/50' : 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50'}`}>
                    <span className={`text-sm font-bold ${calc.pesoNeto >= 0 ? 'text-agri-green-dark dark:text-emerald-400' : 'text-red-600'}`}>Peso Neto</span>
                    <span className={`font-mono text-xl font-bold tracking-tight ${calc.pesoNeto >= 0 ? 'text-agri-green-main dark:text-emerald-500' : 'text-red-600'}`}>
                      {calc.pesoNeto.toFixed(2)} kg
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center opacity-50">
                  <svg className="w-12 h-12 mb-4 text-agri-slate/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"></path><path d="M3 6h18"></path></svg>
                  <p className="text-sm font-medium text-agri-slate max-w-[200px]">Ingresa los datos para previsualizar el cálculo neto.</p>
                </div>
              )}
            </div>
            
            <div className="bg-agri-green-main/5 dark:bg-gray-800/50 rounded-lg p-4 border border-agri-green-main/10 dark:border-gray-700 text-sm">
              <div className="font-bold text-agri-green-dark dark:text-white mb-2">Fórmula Estándar</div>
              <code className="text-agri-slate font-mono bg-white dark:bg-gray-900 px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 block text-xs">
                Neto = Bruto - (Gavetas × Tara Base)
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Historial Reciente */}
      {!loading && !error && historial.length > 0 && (
        <div className="mt-8 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-bold text-agri-green-dark dark:text-white tracking-tight">Últimos Registros (Hoy)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-agri-green-dark">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Fecha / Hora</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Campaña</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Lote</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">Gavetas</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Bruto (kg)</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Neto (kg)</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((p: any) => (
                  <tr key={p.id} className="border-b border-gray-100 dark:border-gray-800 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/80 even:bg-gray-50/50 dark:even:bg-gray-800/30">
                    <td className="px-4 py-3 font-mono text-agri-slate">{new Date(p.fechaRegistro).toLocaleDateString('es-EC', { hour: '2-digit', minute:'2-digit' })}</td>
                    <td className="px-4 py-3 font-mono text-agri-slate font-semibold">{p.campana.codigo}</td>
                    <td className="px-4 py-3 font-mono text-agri-slate">{p.lote.codigo}</td>
                    <td className="px-4 py-3 text-center text-agri-slate">{p.numGavetas}</td>
                    <td className="px-4 py-3 font-mono text-agri-slate">{p.pesoBrutoKg.toFixed(2)}</td>
                    <td className="px-4 py-3 font-mono font-bold text-agri-green-main dark:text-emerald-500">{p.pesoNetoKg.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                        p.clasificacion 
                          ? 'bg-agri-green-main/10 text-agri-green-dark border-agri-green-main/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' 
                          : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                      }`}>
                        {p.clasificacion ? 'Clasificado' : 'Pendiente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
