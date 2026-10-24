'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type Comprador = { id: string; nombre: string; tipo: string; isActive: boolean };
type Campana = {
  id: string; codigo: string; nombre: string; funda: string; cultivo: string;
  taraBase: number; isActive: boolean; createdAt: string;
  comprador: Comprador | null;
  minimoPGr: number; minimoGGr: number; fechaNacimiento: string | null;
};

type ModalState = 'crear' | 'editar' | 'cerrar' | null;

const FUNDA_COLORS = [
  { value: 'Amarilla',  hex: '#FCD34D' },
  { value: 'Azul',      hex: '#60A5FA' },
  { value: 'Verde',     hex: '#4ADE80' },
  { value: 'Roja',      hex: '#F87171' },
  { value: 'Blanca',    hex: '#E4E4E7' },
  { value: 'Naranja',   hex: '#FB923C' },
];

function FundaDot({ color }: { color: string }) {
  const c = FUNDA_COLORS.find(f => f.value === color);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0 border border-black/10" style={{ background: c?.hex ?? '#ccc' }} />
      <span className="text-sm">{color}</span>
    </span>
  );
}

export default function CampaniasPage() {
  const [campanas, setCampanas] = useState<Campana[]>([]);
  const [compradores, setCompradores] = useState<Comprador[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);
  const [selected, setSelected] = useState<Campana | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const [form, setForm] = useState({
    codigo: '', nombre: '', funda: 'Amarilla', cultivo: 'Pitahaya', taraBase: '1.70', compradorId: '', minimoPGr: '180', minimoGGr: '280', fechaNacimiento: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const showToast = (msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(() => Promise.all([
        fetch('/api/catalogos/campanias').then(r => r.json()),
        fetch('/api/catalogos/compradores').then(r => r.json()),
      ]).then(([c, comp]) => {
      setCampanas(c.campanas ?? []);
      setCompradores((comp.compradores ?? []).filter((c: Comprador) => c.isActive));
    }).catch(() => { setErrors({ general: 'No se pudieron cargar las campañas y compradores.' });
    }).finally(() => { setLoading(false); }), []);

  useEffect(() => { load(); }, [load]);

  function openCrear() {
    setForm({ codigo: '', nombre: '', funda: 'Amarilla', cultivo: 'Pitahaya', taraBase: '1.70', compradorId: '', minimoPGr: '180', minimoGGr: '280', fechaNacimiento: '' });
    setErrors({});
    setSelected(null);
    setModal('crear');
  }

  function openEditar(c: Campana) {
    setForm({ codigo: c.codigo, nombre: c.nombre, funda: c.funda, cultivo: c.cultivo, taraBase: String(c.taraBase), compradorId: c.comprador?.id ?? '', minimoPGr: String(c.minimoPGr), minimoGGr: String(c.minimoGGr), fechaNacimiento: c.fechaNacimiento ?? '' });
    setErrors({});
    setSelected(c);
    setModal('editar');
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.codigo.trim())  e.codigo  = 'El código es obligatorio';
    if (!form.nombre.trim())  e.nombre  = 'El nombre es obligatorio';
    if (!form.funda.trim()) e.funda = 'Ingrese un color de funda';
    if (!form.cultivo.trim()) e.cultivo = 'El cultivo es obligatorio';
    const tara = parseFloat(form.taraBase);
    if (isNaN(tara) || tara <= 0 || tara > 10) e.taraBase = 'Tara inválida (0–10 kg)';
    if (!form.minimoPGr || !form.minimoGGr || !Number.isFinite(Number(form.minimoPGr)) || !Number.isFinite(Number(form.minimoGGr)) ||
      Number(form.minimoPGr) <= 0 || Number(form.minimoGGr) <= Number(form.minimoPGr)) e.parametros = 'El mínimo G debe ser mayor al mínimo P, ambos positivos.';
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
        funda: form.funda.trim(), cultivo: form.cultivo.trim(),
        taraBase: parseFloat(form.taraBase),
        compradorId: form.compradorId || null,
        minimoPGr: Number(form.minimoPGr), minimoGGr: Number(form.minimoGGr), fechaNacimiento: form.fechaNacimiento || null,
      };
      const url  = modal === 'editar' ? `/api/catalogos/campanias/${selected!.id}` : '/api/catalogos/campanias';
      const method = modal === 'editar' ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setErrors({ general: data.error }); return; }
      setModal(null);
      showToast(modal === 'editar' ? 'Campaña actualizada' : 'Campaña registrada');
      load();
    } catch { setErrors({ general: 'No se pudo confirmar la operación. Revise la conexión y vuelva a consultar el catálogo.' }); }
    finally { setSaving(false); }
  }

  async function handleCerrar() {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/catalogos/campanias/${selected.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { showToast(data.error, 'error'); setModal(null); return; }
      setModal(null);
      showToast('Campaña cerrada exitosamente');
      load();
    } catch { showToast('No se pudo confirmar el cierre. Revise la conexión.', 'error'); }
    finally { setSaving(false); }
  }

  const filtered = campanas.filter(c =>
    c.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.nombre.toLowerCase().includes(searchQuery.toLowerCase())
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
          <h1 className="text-2xl md:text-3xl font-bold text-agri-green-dark dark:text-white tracking-tight">Campañas</h1>
        </div>
        <button className="inline-flex items-center justify-center gap-2 min-h-[44px] px-6 text-sm font-semibold text-white bg-agri-green-main hover:bg-agri-green-dark rounded-lg shadow-sm hover:shadow transition-all" onClick={openCrear}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nueva Campaña
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
          placeholder="Buscar campaña por código o nombre..." 
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
        ) : campanas.length === 0 ? (
          <div className="text-center py-16 px-6">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-agri-slate/30 mb-4"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
            <h3 className="text-base font-bold text-agri-green-dark dark:text-white mb-1">No existen campañas registradas</h3>
            <p className="text-sm text-agri-slate">Comience creando una nueva campaña de cosecha.</p>
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
                  <th className="px-6 py-3 text-xs font-semibold text-white uppercase tracking-wider">Funda</th>
                  <th className="px-6 py-3 text-xs font-semibold text-white uppercase tracking-wider">Tara (kg)</th>
                  <th className="px-6 py-3 text-xs font-semibold text-white uppercase tracking-wider">Comprador</th>
                  <th className="px-6 py-3 text-xs font-semibold text-white uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-xs font-semibold text-white uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} onClick={() => openEditar(c)} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors cursor-pointer even:bg-gray-50/50 dark:even:bg-gray-800/30">
                    <td className="px-6 py-4"><span className="font-mono font-semibold text-agri-green-dark dark:text-gray-200">{c.codigo}</span></td>
                    <td className="px-6 py-4 text-sm text-gray-800 dark:text-gray-200">{c.nombre}</td>
                    <td className="px-6 py-4"><FundaDot color={c.funda} /></td>
                    <td className="px-6 py-4 font-mono text-agri-slate">{c.taraBase.toFixed(2)} kg</td>
                    <td className="px-6 py-4 text-sm text-agri-slate">{c.comprador?.nombre ?? '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.isActive ? 'bg-agri-green-main/10 text-agri-green-dark dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                        {c.isActive ? 'Activa' : 'Cerrada'}
                      </span>
                    </td>
                    <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                      {c.isActive && (
                        <button className="text-sm font-medium text-agri-slate hover:text-red-600 transition-colors px-3 py-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => { setSelected(c); setModal('cerrar'); }}>
                          Cerrar
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
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 w-full max-w-md max-h-[90dvh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-agri-green-dark dark:text-white mb-6">{modal === 'crear' ? 'Nueva Campaña' : 'Editar Campaña'}</h3>

            {errors.general && <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium border border-red-200 dark:border-red-800">{errors.general}</div>}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-agri-green-dark dark:text-gray-300 mb-2">Código *</label>
                <input className={`min-h-[44px] w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-agri-green-main focus:border-agri-green-main transition-colors ${modal === 'editar' ? 'bg-gray-50 dark:bg-gray-800/50 text-agri-slate cursor-not-allowed' : 'bg-white dark:bg-gray-700'}`}
                  placeholder="Ej: 2026-A" value={form.codigo}
                  onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))}
                  readOnly={modal === 'editar'} />
                {errors.codigo && <p className="text-xs text-red-500 font-medium mt-1">{errors.codigo}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-agri-green-dark dark:text-gray-300 mb-2">Nombre *</label>
                <input className="min-h-[44px] w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-agri-green-main focus:border-agri-green-main transition-colors"
                  placeholder="Ej: Cosecha Verano 2026" value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
                {errors.nombre && <p className="text-xs text-red-500 font-medium mt-1">{errors.nombre}</p>}
              </div>

              <label className="block text-sm font-medium">Cultivo *
                <input aria-label="Cultivo" list="cultivos-registrados" maxLength={200} className="mt-2 min-h-11 w-full rounded-lg border px-4 bg-white dark:bg-gray-700" value={form.cultivo} onChange={e => setForm(f => ({ ...f, cultivo: e.target.value }))} />
                <datalist id="cultivos-registrados">{[...new Set(['Pitahaya', ...campanas.map(c => c.cultivo)])].map(c => <option key={c} value={c} />)}</datalist>
                {errors.cultivo && <span className="text-red-500">{errors.cultivo}</span>}
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-agri-green-dark dark:text-gray-300 mb-2">Color de Funda *</label>
                  <input aria-label="Color de funda" list="fundas-registradas" maxLength={200} className="min-h-[44px] w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm" value={form.funda} onChange={e => setForm(f => ({ ...f, funda: e.target.value }))} />
                  <datalist id="fundas-registradas">{[...new Set([...FUNDA_COLORS.map(c => c.value), ...campanas.map(c => c.funda)])].map(c => <option key={c} value={c} />)}</datalist>
                  {errors.funda && <p className="text-xs text-red-500 font-medium mt-1">{errors.funda}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-agri-green-dark dark:text-gray-300 mb-2">Tara Gaveta (kg) *</label>
                  <input className="min-h-[44px] w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-agri-green-main focus:border-agri-green-main transition-colors font-mono" type="number" step="0.01" min="0.1" max="10"
                    value={form.taraBase} onChange={e => setForm(f => ({ ...f, taraBase: e.target.value }))} />
                  <p className="text-xs text-agri-slate mt-1">Por defecto: 1.70 kg</p>
                  {errors.taraBase && <p className="text-xs text-red-500 font-medium mt-1">{errors.taraBase}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-agri-green-dark dark:text-gray-300 mb-2">Nacimiento de la fruta (opcional)</label>
                <input aria-label="Nacimiento de la fruta" type="date" className="min-h-[44px] w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm" value={form.fechaNacimiento} onChange={e => setForm(f => ({ ...f, fechaNacimiento: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-agri-green-dark dark:text-gray-300">Mínimo P (g)<input aria-label="Mínimo P en gramos" type="number" min="0.001" step="0.001" className="mt-2 min-h-[44px] w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4" value={form.minimoPGr} onChange={e => setForm(f => ({ ...f, minimoPGr: e.target.value }))} /></label>
                <label className="text-sm text-agri-green-dark dark:text-gray-300">Mínimo G (g)<input aria-label="Mínimo G en gramos" type="number" min="0.001" step="0.001" className="mt-2 min-h-[44px] w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4" value={form.minimoGGr} onChange={e => setForm(f => ({ ...f, minimoGGr: e.target.value }))} /></label>
              </div>
              <p className="text-xs text-agri-slate">Los límites se aplican a jornadas nuevas. Las jornadas existentes conservan sus parámetros.</p>
              {errors.parametros && <p role="alert" className="text-sm text-red-600">{errors.parametros}</p>}
              <div>
                <label className="block text-sm font-medium text-agri-green-dark dark:text-gray-300 mb-2">Comprador Asignado</label>
                <select className="min-h-[44px] w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-agri-green-main focus:border-agri-green-main transition-colors" value={form.compradorId}
                  onChange={e => setForm(f => ({ ...f, compradorId: e.target.value }))}>
                  <option value="">— Sin comprador asignado —</option>
                  {compradores.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre} ({c.tipo})</option>
                  ))}
                </select>
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

      {/* Modal Cerrar */}
      {modal === 'cerrar' && selected && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setModal(null)}>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-agri-green-dark dark:text-white mb-3">¿Cerrar campaña {selected.codigo}?</h3>
            <p className="text-sm text-agri-slate dark:text-gray-400 leading-relaxed mb-6">
              El cierre impide nuevas capturas. Los teléfonos podrán enviar pesajes capturados antes de este momento; si la jornada ya fue clasificada, requerirán conciliación administrativa con historial. El servidor no puede conocer los pendientes de un teléfono desconectado.
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button className="min-h-[44px] px-6 rounded-lg text-sm font-semibold border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-agri-green-dark dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all" onClick={() => setModal(null)}>Cancelar</button>
              <button className="min-h-[44px] px-6 rounded-lg text-sm font-semibold shadow-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all" onClick={handleCerrar} disabled={saving}>
                {saving ? 'Cerrando...' : 'Confirmar Cierre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
