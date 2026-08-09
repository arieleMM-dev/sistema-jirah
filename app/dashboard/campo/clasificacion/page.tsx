'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useClasificacion } from '@/lib/hooks/useClasificacion';

export default function ClasificacionPage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  
  const {
    pendientes, selected, loading, error, form, setForm,
    errors, verificado, setVerificado, calculo, descuadreAlerta, forzar, setForzar, saving,
    seleccionar, resetForm, calcular, handleGuardar
  } = useClasificacion();

  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const onSubmit = async () => {
    const result = await handleGuardar(userId);
    if (result) {
      setToast({ msg: result.msg, type: result.type });
      setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
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
        <h1 className="text-2xl md:text-3xl font-bold text-agri-green-dark dark:text-white tracking-tight">Clasificación de Cosecha</h1>
        <p className="text-sm text-agri-slate dark:text-gray-400 mt-1">Control de calidad y división Exportación/Nacional — CU-05.2</p>
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
          
          {/* Panel Izquierdo: Lista de Pesajes Pendientes */}
          <div className="xl:col-span-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col max-h-[700px]">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-agri-green-dark dark:text-white tracking-tight">Pesajes Pendientes</h2>
              <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-agri-green-main/10 text-agri-green-dark border-agri-green-main/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">{pendientes.length}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
              {pendientes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 opacity-50">
                  <p className="text-sm text-agri-slate">No hay pesajes pendientes.</p>
                </div>
              ) : (
                pendientes.map(p => {
                  const isSelected = selected?.id === p.id;
                  return (
                    <div 
                      key={p.id}
                      onClick={() => seleccionar(p)}
                      className={`p-4 rounded-lg cursor-pointer transition-all duration-200 border ${
                        isSelected 
                          ? 'border-agri-green-main bg-agri-green-main/5 dark:bg-emerald-950/30 shadow-sm' 
                          : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-agri-green-dark dark:text-gray-300">{p.lote.codigo}</span>
                        <span className="text-xs text-agri-slate font-mono">{new Date(p.fechaRegistro).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex justify-between items-end mt-3">
                        <div>
                          <p className="text-[0.65rem] uppercase font-bold text-agri-slate/60 tracking-wider">Campaña</p>
                          <p className="text-sm font-semibold text-agri-green-dark dark:text-gray-200 font-mono">{p.campana.codigo}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[0.65rem] uppercase font-bold text-agri-slate/60 tracking-wider">Peso Neto</p>
                          <p className="text-base font-bold text-agri-green-main dark:text-emerald-500 font-mono">{p.pesoNetoKg.toFixed(2)} kg</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Panel Derecho: Área de Trabajo / Formulario */}
          <div className="xl:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 relative z-10">
            {!selected ? (
              <div className="flex flex-col items-center justify-center h-64 text-center opacity-50">
                <svg className="w-16 h-16 mb-4 text-agri-slate/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                <h3 className="text-lg font-bold text-agri-green-dark dark:text-white tracking-tight">Ningún pesaje seleccionado</h3>
                <p className="text-sm text-agri-slate mt-1">Selecciona un ítem de la lista izquierda para clasificarlo.</p>
              </div>
            ) : (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                {/* Header de la selección */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="bg-gray-100 dark:bg-gray-700 font-mono text-sm px-2.5 py-1 rounded-md border border-gray-200 dark:border-gray-600 font-semibold text-agri-green-dark dark:text-gray-200">
                        {selected.lote.codigo}
                      </span>
                      <span className="text-sm font-medium text-agri-slate">• {selected.campana.nombre}</span>
                    </div>
                    <p className="text-xs text-agri-slate font-medium">Recibido por: {selected.agricultor.nombres} {selected.agricultor.apellidos}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[0.65rem] font-bold text-agri-slate/60 uppercase tracking-wider">Base Neto a Cuadrar</p>
                    <p className="text-2xl font-bold tracking-tight text-agri-green-dark dark:text-white font-mono">{selected.pesoNetoKg.toFixed(2)} kg</p>
                  </div>
                </div>

                {errors.general && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800 text-sm font-semibold">
                    {errors.general}
                  </div>
                )}

                {/* Grid del Formulario */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                  {/* Calidad Exportación */}
                  <div className="space-y-4 p-5 rounded-lg bg-agri-green-main/5 dark:bg-gray-900/30 border border-agri-green-main/10 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-agri-green-main"></div>
                      <h3 className="font-bold text-sm text-agri-green-dark dark:text-white">Calidad Exportación</h3>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-agri-green-dark dark:text-gray-300 mb-2">Gavetas Exportación</label>
                      <input 
                        type="number" min="0" placeholder="Ej: 5"
                        className="min-h-[44px] w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-agri-green-main focus:border-agri-green-main"
                        value={form.gvExp} onChange={e => { setForm(f => ({ ...f, gvExp: e.target.value })); setVerificado(false); }}
                      />
                      {errors.gvExp && <p className="text-xs text-red-500 font-medium">{errors.gvExp}</p>}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-agri-green-dark dark:text-gray-300 mb-2">Peso Bruto Exportación (kg)</label>
                      <input 
                        type="number" min="0" step="0.1" placeholder="Ej: 95.5"
                        className="min-h-[44px] w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-agri-green-main focus:border-agri-green-main font-mono"
                        value={form.pbExp} onChange={e => { setForm(f => ({ ...f, pbExp: e.target.value })); setVerificado(false); }}
                      />
                      {errors.pbExp && <p className="text-xs text-red-500 font-medium">{errors.pbExp}</p>}
                    </div>
                  </div>

                  {/* Calidad Nacional & Descarte */}
                  <div className="space-y-4 p-5 rounded-lg bg-agri-clay/5 dark:bg-gray-900/30 border border-agri-clay/10 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-agri-clay"></div>
                      <h3 className="font-bold text-sm text-agri-green-dark dark:text-white">Nacional &amp; Descarte</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-agri-green-dark dark:text-gray-300 mb-2">Gav. Nac</label>
                        <input 
                          type="number" min="0" placeholder="Ej: 2"
                          className="min-h-[44px] w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-agri-green-main focus:border-agri-green-main"
                          value={form.gvNac} onChange={e => { setForm(f => ({ ...f, gvNac: e.target.value })); setVerificado(false); }}
                        />
                        {errors.gvNac && <p className="text-xs text-red-500 font-medium">{errors.gvNac}</p>}
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-agri-green-dark dark:text-gray-300 mb-2">Bruto Nac (kg)</label>
                        <input 
                          type="number" min="0" step="0.1" placeholder="Ej: 30.2"
                          className="min-h-[44px] w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-agri-green-main focus:border-agri-green-main font-mono"
                          value={form.pbNac} onChange={e => { setForm(f => ({ ...f, pbNac: e.target.value })); setVerificado(false); }}
                        />
                        {errors.pbNac && <p className="text-xs text-red-500 font-medium">{errors.pbNac}</p>}
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      <label className="block text-sm font-medium text-agri-green-dark dark:text-gray-300 mb-2">Descarte Neto (kg)</label>
                      <input 
                        type="number" min="0" step="0.1" placeholder="Ej: 1.5"
                        className="min-h-[44px] w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-agri-green-main focus:border-agri-green-main font-mono"
                        value={form.desce} onChange={e => { setForm(f => ({ ...f, desce: e.target.value })); setVerificado(false); }}
                      />
                      {errors.desce && <p className="text-xs text-red-500 font-medium">{errors.desce}</p>}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 relative z-10 pt-4">
                  <label className="block text-sm font-medium text-agri-green-dark dark:text-gray-300 mb-2">Observaciones (Opcional)</label>
                  <input 
                    className="min-h-[44px] w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-agri-green-main focus:border-agri-green-main"
                    placeholder="Notas sobre el estado de la fruta..."
                    value={form.obs} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))}
                  />
                </div>

                {/* Acciones & Resultados */}
                <div className="pt-6 border-t border-gray-100 dark:border-gray-700 flex flex-col items-center relative z-10">
                  {!verificado ? (
                    <button 
                      onClick={calcular}
                      className="w-full md:w-auto inline-flex items-center justify-center min-h-[44px] px-6 rounded-lg text-sm font-semibold shadow-sm bg-agri-green-main text-white hover:bg-agri-green-dark transition-all"
                    >
                      Calcular y Verificar Cuadre
                    </button>
                  ) : (
                    <div className="w-full space-y-6 animate-in slide-in-from-bottom-2">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-agri-green-main/5 dark:bg-gray-900/30 rounded-lg border border-agri-green-main/10 dark:border-gray-700 text-center">
                          <p className="text-[0.65rem] uppercase font-bold text-agri-slate/60 tracking-wider mb-1">Neto Exportación</p>
                          <p className="text-lg font-mono font-bold text-agri-green-main dark:text-emerald-500">{calculo!.netoExp.toFixed(2)}</p>
                        </div>
                        <div className="p-4 bg-agri-clay/5 dark:bg-gray-900/30 rounded-lg border border-agri-clay/10 dark:border-gray-700 text-center">
                          <p className="text-[0.65rem] uppercase font-bold text-agri-slate/60 tracking-wider mb-1">Neto Nacional</p>
                          <p className="text-lg font-mono font-bold text-agri-clay dark:text-amber-500">{calculo!.netoNac.toFixed(2)}</p>
                        </div>
                        <div className="p-4 bg-red-50/50 dark:bg-gray-900/30 rounded-lg border border-red-100 dark:border-gray-700 text-center">
                          <p className="text-[0.65rem] uppercase font-bold text-agri-slate/60 tracking-wider mb-1">Descarte</p>
                          <p className="text-lg font-mono font-bold text-red-600 dark:text-red-400">{parseFloat(form.desce || '0').toFixed(2)}</p>
                        </div>
                        <div className={`p-4 rounded-lg border text-center ${calculo!.ok ? 'bg-agri-green-main/10 border-agri-green-main/20 dark:bg-emerald-950/30 dark:border-emerald-800' : 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'}`}>
                          <p className={`text-[0.65rem] uppercase font-bold tracking-wider mb-1 ${calculo!.ok ? 'text-agri-green-dark dark:text-emerald-400' : 'text-red-600'}`}>Suma Total</p>
                          <p className={`text-xl font-mono font-bold ${calculo!.ok ? 'text-agri-green-dark dark:text-emerald-400' : 'text-red-600'}`}>{calculo!.total.toFixed(2)}</p>
                        </div>
                      </div>

                      {descuadreAlerta !== null && (
                        <div className="p-5 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
                          <div className="flex items-start gap-3">
                            <svg className="w-6 h-6 text-red-600 dark:text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                            <div>
                              <h4 className="font-bold text-red-800 dark:text-red-400 text-sm">Alerta de Descuadre (±4%)</h4>
                              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                                El margen de diferencia es del <strong className="font-mono">{descuadreAlerta}%</strong> (Límite: 4.0%). Revisa las gavetas, taras y pesos brutos.
                              </p>
                              <div className="mt-3 flex items-center gap-2">
                                <input 
                                  type="checkbox" id="forzar" 
                                  className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 dark:border-gray-600 dark:bg-gray-800"
                                  checked={forzar} onChange={e => setForzar(e.target.checked)} 
                                />
                                <label htmlFor="forzar" className="text-sm font-medium text-red-800 dark:text-red-400 cursor-pointer">
                                  Autorizo forzar el registro asumiendo la discrepancia
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end gap-3">
                        <button 
                          onClick={() => setVerificado(false)}
                          className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-lg text-sm font-semibold border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-agri-green-dark dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all"
                        >
                          Modificar Datos
                        </button>
                        <button 
                          onClick={onSubmit}
                          disabled={saving || (!calculo!.ok && !forzar)}
                          className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-lg text-sm font-semibold shadow-sm bg-agri-green-main text-white hover:bg-agri-green-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          {saving ? 'Registrando...' : 'Confirmar Clasificación'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
