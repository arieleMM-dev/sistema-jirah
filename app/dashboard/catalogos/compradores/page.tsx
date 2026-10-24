'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type Comprador = {
  id: string; nombre: string; ruc: string | null;
  tipo: 'EXPORTADOR' | 'MAYORISTA'; contacto: string | null;
  toleranciaPct: number; isActive: boolean; createdAt: string;
};

type ModalState = 'crear' | 'editar' | 'eliminar' | null;

export default function CompradoresPage() {
  const [compradores, setCompradores] = useState<Comprador[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);
  const [selected, setSelected] = useState<Comprador | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [form, setForm] = useState({
    nombre: '', ruc: '', tipo: 'EXPORTADOR' as 'EXPORTADOR' | 'MAYORISTA',
    contacto: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const showToast = (msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(() => fetch('/api/catalogos/compradores').then(async response => {
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'No se pudo cargar el catálogo.');
    setCompradores(data.compradores ?? []);
  }).catch((e: unknown) => setToast({ msg: e instanceof Error ? e.message : 'Error de conexión', type: 'error' }))
    .finally(() => setLoading(false)), []);

  useEffect(() => { load(); }, [load]);

  function openCrear() {
    setForm({ nombre: '', ruc: '', tipo: 'EXPORTADOR', contacto: '' });
    setErrors({});
    setSelected(null);
    setModal('crear');
  }

  function openEditar(c: Comprador) {
    setForm({ nombre: c.nombre, ruc: c.ruc ?? '', tipo: c.tipo, contacto: c.contacto ?? '' });
    setErrors({});
    setSelected(c);
    setModal('editar');
  }

  function validate() {
    const e: Record<string, string> = {};
    
    const nom = form.nombre.trim();
    if (!nom || !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nom) || nom.length < 2 || nom.length > 50) {
      e.nombre = 'Este campo solo puede contener letras y espacios';
    }

    const rucVal = form.ruc.trim();
    if (rucVal && !/^\d{10}001$/.test(rucVal)) {
      e.ruc = 'El documento de identidad no es válido';
    }

    
    const contactoVal = form.contacto.trim();
    if (contactoVal && !/^09\d{8}$/.test(contactoVal)) {
      e.contacto = 'El teléfono debe tener 10 dígitos y empezar con 09';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleGuardar() {
    if (!validate()) return;
    setSaving(true);
    try {
      const body = {
        nombre: form.nombre.trim(),
        ruc: form.ruc.trim() || undefined,
        tipo: form.tipo,
        contacto: form.contacto.trim() || undefined,
      };
      const url    = modal === 'editar' ? `/api/catalogos/compradores/${selected!.id}` : '/api/catalogos/compradores';
      const method = modal === 'editar' ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setErrors({ general: data.error }); return; }
      setModal(null);
      showToast(modal === 'editar' ? 'Comprador actualizado' : 'Comprador registrado');
      load();
    } finally { setSaving(false); }
  }

  async function handleEliminar() {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/catalogos/compradores/${selected.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { showToast(data.error, 'error'); setModal(null); return; }
      setModal(null);
      showToast('Comprador eliminado del directorio');
      load();
    } finally { setSaving(false); }
  }

  const filtered = compradores.filter(c =>
    c.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.ruc && c.ruc.includes(searchQuery)) ||
    (c.contacto && c.contacto.includes(searchQuery))
  );

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
          <h1 className="text-2xl md:text-3xl font-bold text-agri-green-dark dark:text-white tracking-tight">Compradores</h1>
        </div>
        <button className="inline-flex items-center justify-center gap-2 min-h-[44px] px-6 text-sm font-semibold text-white bg-agri-green-main hover:bg-agri-green-dark rounded-lg shadow-sm hover:shadow transition-all" onClick={openCrear}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo Comprador
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
          placeholder="Buscar por nombre, RUC o contacto..." 
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
        ) : compradores.length === 0 ? (
          <div className="text-center py-16 px-6">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-agri-slate/30 mb-4"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            <h3 className="text-base font-bold text-agri-green-dark dark:text-white mb-1">No existen compradores registrados</h3>
            <p className="text-sm text-agri-slate">Agregue los exportadores o mayoristas que compran la pitahaya.</p>
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
                  <th className="px-6 py-3 text-xs font-semibold text-white uppercase tracking-wider">Razón Social</th>
                  <th className="px-6 py-3 text-xs font-semibold text-white uppercase tracking-wider">RUC</th>
                  <th className="px-6 py-3 text-xs font-semibold text-white uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-3 text-xs font-semibold text-white uppercase tracking-wider">Contacto</th>
                  <th className="px-6 py-3 text-xs font-semibold text-white uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-xs font-semibold text-white uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} onClick={() => c.isActive && openEditar(c)} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors cursor-pointer even:bg-gray-50/50 dark:even:bg-gray-800/30">
                    <td className="px-6 py-4 text-sm font-semibold text-agri-green-dark dark:text-gray-200">{c.nombre}</td>
                    <td className="px-6 py-4 font-mono text-agri-slate text-sm">{c.ruc ?? '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.tipo === 'EXPORTADOR' ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' : 'bg-agri-clay/10 text-agri-earth dark:bg-amber-500/10 dark:text-amber-400'}`}>
                        {c.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-agri-slate text-sm">{c.contacto ?? '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.isActive ? 'bg-agri-green-main/10 text-agri-green-dark dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                        {c.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                      {c.isActive && (
                        <button className="text-sm font-medium text-agri-slate hover:text-red-600 transition-colors px-3 py-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => { setSelected(c); setModal('eliminar'); }}>
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
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-agri-green-dark dark:text-white mb-6">{modal === 'crear' ? 'Nuevo Comprador' : 'Editar Comprador'}</h3>

            {errors.general && <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium border border-red-200 dark:border-red-800">{errors.general}</div>}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-agri-green-dark dark:text-gray-300 mb-2">Razón Social *</label>
                <input className="min-h-[44px] w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-agri-green-main focus:border-agri-green-main transition-colors"
                  placeholder="Ej: Agroexport Cía. Ltda." value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
                {errors.nombre && <p className="text-xs text-red-500 font-medium mt-1">{errors.nombre}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-agri-green-dark dark:text-gray-300 mb-2">RUC (13 dígitos)</label>
                  <input className="min-h-[44px] w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-agri-green-main focus:border-agri-green-main transition-colors font-mono"
                    placeholder="Ej: 1791234567001" maxLength={13}
                    value={form.ruc} onChange={e => setForm(f => ({ ...f, ruc: e.target.value.replace(/\D/g, '') }))} />
                  {errors.ruc && <p className="text-xs text-red-500 font-medium mt-1">{errors.ruc}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-agri-green-dark dark:text-gray-300 mb-2">Tipo *</label>
                  <select className="min-h-[44px] w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-agri-green-main focus:border-agri-green-main transition-colors" value={form.tipo}
                    onChange={e => setForm(f => ({ ...f, tipo: e.target.value as 'EXPORTADOR' | 'MAYORISTA' }))}>
                    <option value="EXPORTADOR">Exportador</option>
                    <option value="MAYORISTA">Mayorista</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-agri-green-dark dark:text-gray-300 mb-2">Celular de Contacto</label>
                  <input className="min-h-[44px] w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-agri-green-main focus:border-agri-green-main transition-colors font-mono"
                    placeholder="09XXXXXXXX" maxLength={10}
                    value={form.contacto} onChange={e => setForm(f => ({ ...f, contacto: e.target.value.replace(/\D/g, '') }))} />
                  {errors.contacto && <p className="text-xs text-red-500 font-medium mt-1">{errors.contacto}</p>}
                </div>
                <div>
                  <p className="text-sm font-medium text-agri-green-dark dark:text-gray-300">Cuadre de cosecha: ±4 %</p>
                  <p className="text-xs text-agri-slate dark:text-gray-400 mt-2">Se calcula por jornada y lote, sobre exportación + nacional. Es una regla de la finca; no cambia según el comprador.</p>
                </div>
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
            <h3 className="text-lg font-bold text-agri-green-dark dark:text-white mb-3">¿Eliminar comprador?</h3>
            <p className="text-sm text-agri-slate dark:text-gray-400 leading-relaxed mb-6">
              <strong className="text-agri-green-dark dark:text-white">{selected.nombre}</strong> será ocultado del directorio comercial. Las ventas históricas asociadas a este cliente se mantendrán intactas.
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button className="min-h-[44px] px-6 rounded-lg text-sm font-semibold border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-agri-green-dark dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all" onClick={() => setModal(null)}>Cancelar</button>
              <button className="min-h-[44px] px-6 rounded-lg text-sm font-semibold shadow-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all" onClick={handleEliminar} disabled={saving}>
                {saving ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
