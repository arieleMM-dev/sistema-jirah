'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type Lote = {
  id: string; codigo: string; nombre: string;
  hectareas: number | null; descripcion: string | null; variedad: string | null;
  isActive: boolean; createdAt: string;
};

type ModalState = 'crear' | 'editar' | 'eliminar' | null;

export default function LotesPage() {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);
  const [selected, setSelected] = useState<Lote | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [form, setForm] = useState({ codigo: '', nombre: '', hectareas: '', descripcion: '', variedad: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const showToast = (msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(() => fetch('/api/catalogos/lotes').then(async response => {
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'No se pudo cargar el catálogo.');
    setLotes(data.lotes ?? []);
  }).catch((e: unknown) => setToast({ msg: e instanceof Error ? e.message : 'Error de conexión', type: 'error' }))
    .finally(() => setLoading(false)), []);

  useEffect(() => { load(); }, [load]);

  function openCrear() {
    setForm({ codigo: '', nombre: '', hectareas: '', descripcion: '', variedad: '' });
    setErrors({});
    setSelected(null);
    setModal('crear');
  }

  function openEditar(l: Lote) {
    setForm({ codigo: l.codigo, nombre: l.nombre, hectareas: l.hectareas ? String(l.hectareas) : '', descripcion: l.descripcion ?? '', variedad: l.variedad ?? '' });
    setErrors({});
    setSelected(l);
    setModal('editar');
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.codigo.trim()) e.codigo = 'El código es obligatorio';
    if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio';
    if (form.hectareas && (isNaN(parseFloat(form.hectareas)) || parseFloat(form.hectareas) <= 0)) {
      e.hectareas = 'Las hectáreas deben ser un número positivo';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleGuardar() {
    if (!validate()) return;
    setSaving(true);
    try {
      const body = {
        codigo: form.codigo.trim().toUpperCase(),
        nombre: form.nombre.trim(),
        hectareas: form.hectareas ? parseFloat(form.hectareas) : undefined,
        descripcion: form.descripcion.trim() || undefined,
        variedad: form.variedad.trim(),
      };
      const url    = modal === 'editar' ? `/api/catalogos/lotes/${selected!.id}` : '/api/catalogos/lotes';
      const method = modal === 'editar' ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setErrors({ general: data.error }); return; }
      setModal(null);
      showToast(modal === 'editar' ? 'Lote actualizado' : 'Lote registrado');
      load();
    } catch { setErrors({ general: 'No se pudo confirmar la operación. Revise la conexión y vuelva a consultar el catálogo.' }); }
    finally { setSaving(false); }
  }

  async function handleEliminar() {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/catalogos/lotes/${selected.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { showToast(data.error, 'error'); setModal(null); return; }
      setModal(null);
      showToast('Lote inactivado');
      load();
    } catch { showToast('No se pudo confirmar la inactivación. Revise la conexión.', 'error'); }
    finally { setSaving(false); }
  }

  const filtered = lotes.filter(l => l.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || l.codigo.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5">
          <div className={`px-5 py-3 rounded-lg shadow-lg font-medium text-sm flex items-center gap-2 ${toast.type === 'success' ? 'bg-agri-green-main text-white' : 'bg-red-600 text-white'}`}>
            {toast.msg}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/catalogos" className="text-xs font-medium text-agri-slate hover:text-agri-green-main transition-colors inline-flex items-center gap-1 mb-2">
            ← Catálogos
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-agri-green-dark dark:text-white tracking-tight">Lotes</h1>
        </div>
        <button className="inline-flex items-center justify-center gap-2 min-h-[44px] px-6 text-sm font-semibold text-white bg-agri-green-main hover:bg-agri-green-dark rounded-lg shadow-sm hover:shadow transition-all" onClick={openCrear}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo Lote
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg className="h-4 w-4 text-agri-slate/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
        <input 
          type="text" 
          className="min-h-[44px] w-full pl-11 pr-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-agri-green-main focus:border-agri-green-main transition-colors"
          placeholder="Buscar lote por código o nombre..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin h-8 w-8 border-4 border-agri-green-main border-t-transparent rounded-full" />
          </div>
        ) : lotes.length === 0 ? (
          <div className="text-center py-16 px-6">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-agri-slate/30 mb-4"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
            <h3 className="text-base font-bold text-agri-green-dark dark:text-white mb-1">No existen lotes registrados</h3>
            <p className="text-sm text-agri-slate">Comience creando uno nuevo.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-6">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-agri-slate/30 mb-4"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <h3 className="text-base font-bold text-agri-green-dark dark:text-white mb-1">No se encontraron coincidencias</h3>
            <p className="text-sm text-agri-slate">Intente con otro término de búsqueda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-agri-green-dark">
                  <th className="px-6 py-3 text-xs font-semibold text-white uppercase tracking-wider">Código</th>
                  <th className="px-6 py-3 text-xs font-semibold text-white uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-3 text-xs font-semibold text-white uppercase tracking-wider">Hectáreas</th>
                  <th className="px-6 py-3 text-xs font-semibold text-white uppercase tracking-wider">Descripción</th>
                  <th className="px-6 py-3 text-xs font-semibold text-white uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-xs font-semibold text-white uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => (
                  <tr key={l.id} onClick={() => l.isActive && openEditar(l)} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors cursor-pointer even:bg-gray-50/50 dark:even:bg-gray-800/30">
                    <td className="px-6 py-4"><span className="font-mono font-semibold text-agri-green-dark dark:text-gray-200">{l.codigo}</span></td>
                    <td className="px-6 py-4 text-sm text-gray-800 dark:text-gray-200">{l.nombre}</td>
                    <td className="px-6 py-4 font-mono text-agri-slate">{l.hectareas ? `${l.hectareas} ha` : '—'}</td>
                    <td className="px-6 py-4 text-sm text-agri-slate max-w-[200px] truncate">{l.descripcion ?? '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${l.isActive ? 'bg-agri-green-main/10 text-agri-green-dark dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                        {l.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                      {l.isActive && (
                        <button className="text-sm font-medium text-agri-slate hover:text-red-600 transition-colors px-3 py-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => { setSelected(l); setModal('eliminar'); }}>
                          Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear/Editar */}
      {(modal === 'crear' || modal === 'editar') && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setModal(null)}>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-agri-green-dark dark:text-white mb-6">{modal === 'crear' ? 'Nuevo Lote' : 'Editar Lote'}</h3>

            {errors.general && <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium border border-red-200 dark:border-red-800">{errors.general}</div>}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-agri-green-dark dark:text-gray-300 mb-2">Código *</label>
                  <input className={`min-h-[44px] w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-agri-green-main focus:border-agri-green-main transition-colors font-mono ${modal === 'editar' ? 'bg-gray-50 dark:bg-gray-800/50 text-agri-slate cursor-not-allowed' : 'bg-white dark:bg-gray-700'}`}
                    placeholder="Ej: L-01" value={form.codigo}
                    onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))}
                    readOnly={modal === 'editar'} />
                  {errors.codigo && <p className="text-xs text-red-500 font-medium mt-1">{errors.codigo}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-agri-green-dark dark:text-gray-300 mb-2">Hectáreas</label>
                  <input className="min-h-[44px] w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-agri-green-main focus:border-agri-green-main transition-colors font-mono" type="number" step="0.01" min="0.01"
                    placeholder="Ej: 2.5" value={form.hectareas}
                    onChange={e => setForm(f => ({ ...f, hectareas: e.target.value }))} />
                  {errors.hectareas && <p className="text-xs text-red-500 font-medium mt-1">{errors.hectareas}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-agri-green-dark dark:text-gray-300 mb-2">Nombre *</label>
                <input className="min-h-[44px] w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-agri-green-main focus:border-agri-green-main transition-colors"
                  placeholder="Ej: Lote Noreste" value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
                {errors.nombre && <p className="text-xs text-red-500 font-medium mt-1">{errors.nombre}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium">Variedad
                  <input aria-label="Variedad del lote" list="variedades-registradas" maxLength={200} className="mt-2 mb-4 min-h-11 w-full rounded-lg border px-4 bg-white dark:bg-gray-700" value={form.variedad} onChange={e => setForm(f => ({ ...f, variedad: e.target.value }))} />
                </label>
                <datalist id="variedades-registradas">{[...new Set(lotes.map(l => l.variedad).filter((v): v is string => Boolean(v)))].map(v => <option key={v} value={v} />)}</datalist>
                <label className="block text-sm font-medium text-agri-green-dark dark:text-gray-300 mb-2">Descripción</label>
                <input className="min-h-[44px] w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-agri-green-main focus:border-agri-green-main transition-colors"
                  placeholder="Observaciones del área..." value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button className="min-h-[44px] px-6 rounded-lg text-sm font-semibold border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-agri-green-dark dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all" onClick={() => setModal(null)}>Cancelar</button>
              <button className="min-h-[44px] px-6 rounded-lg text-sm font-semibold shadow-sm bg-agri-green-main text-white hover:bg-agri-green-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all" onClick={handleGuardar} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Eliminar */}
      {modal === 'eliminar' && selected && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setModal(null)}>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-agri-green-dark dark:text-white mb-3">¿Inactivar lote {selected.codigo}?</h3>
            <p className="text-sm text-agri-slate dark:text-gray-400 leading-relaxed mb-6">
              El lote quedará inactivo. Su historial de cosechas pasadas se mantendrá intacto para auditoría.
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button className="min-h-[44px] px-6 rounded-lg text-sm font-semibold border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-agri-green-dark dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all" onClick={() => setModal(null)}>Cancelar</button>
              <button className="min-h-[44px] px-6 rounded-lg text-sm font-semibold shadow-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all" onClick={handleEliminar} disabled={saving}>
                {saving ? 'Eliminando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
