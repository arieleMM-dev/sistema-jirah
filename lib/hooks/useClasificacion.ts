import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { CATEGORIAS, calcularClasificacion, fechaFinca, mensajeCosecha } from '@/lib/cosecha';
import { jornadasLocales } from '@/lib/local-jornadas';
import type { JornadaVista } from '@/lib/types/cosecha';
import { offlineService } from '@/lib/services/offline.service';
import { networkSyncSubject } from '@/lib/observers/SyncObserver';

type CategoryForm = Record<typeof CATEGORIAS[number], { gavetas: string; bruto: string }>;
const emptyForm = (): CategoryForm => Object.fromEntries(CATEGORIAS.map(c => [c, { gavetas: '0', bruto: '0' }])) as CategoryForm;

export function useClasificacion() {
  const { data: session } = useSession();
  const actor = session?.user;
  const [jornadas, setJornadas] = useState<JornadaVista[]>([]);
  const [registrosAnteriores, setRegistrosAnteriores] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [observaciones, setObservaciones] = useState('');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pagina, setPagina] = useState(1), [paginas, setPaginas] = useState(1), [soloPreparadas, setSoloPreparadas] = useState(false);
  const loadVersion = useRef(0);
  const invalidateLoad = useCallback(() => { loadVersion.current++; }, []);
  const [saving, setSaving] = useState(false);
  const selected = jornadas.find(j => j.id === selectedId) ?? null;

  const loadData = useCallback(async () => {
    if (!actor?.id) return;
    const version = ++loadVersion.current;
    let context = await offlineService.getContext(actor.id) ?? { userId: actor.id };
    let networkError: string | null = null;
    let preparedOnly = true;
    if (navigator.onLine) {
      try {
        const response = await fetch('/api/campo/jornadas?pagina=' + pagina);
        if (!response.ok) throw new Error('No se pudieron cargar las jornadas.');
        const data: { jornadas: JornadaVista[]; registrosAnteriores: number; paginas: number } = await response.json();
        if (version !== loadVersion.current) return;
        if (pagina === 1) await offlineService.saveContext(actor.id, data);
        setPaginas(data.paginas); preparedOnly = false;
        context = { ...context, ...data };
      } catch (e: unknown) { networkError = e instanceof Error ? e.message : 'Error de conexión.'; }
    }
    const [pending, classifications] = await Promise.all([offlineService.getPendingPesajes(actor.id), offlineService.getPendingClasificaciones(actor.id)]);
    if (version !== loadVersion.current) return;
    if (preparedOnly) { setPagina(1); setPaginas(1); }
    setSoloPreparadas(preparedOnly);
    setJornadas(jornadasLocales(context, pending, classifications, actor));
    setRegistrosAnteriores(context.registrosAnteriores ?? 0);
    setError(networkError ?? (!context.jornadas && !context.campanas ? 'Conéctese una vez para disponer de las jornadas y catálogos en este dispositivo.' : null));
    setLoading(false);
  }, [actor, pagina]);

  useEffect(() => {
    const refresh = () => { void loadData().catch(() => { setError('No se pudo leer el almacenamiento local.'); setLoading(false); }); };
    refresh();
    window.addEventListener('online', refresh);
    const observer = { onSyncEvent: (event: string) => { if (event === 'sync-complete' || event === 'sync-failed') refresh(); } };
    networkSyncSubject.subscribe(observer);
    return () => { invalidateLoad(); window.removeEventListener('online', refresh); networkSyncSubject.unsubscribe(observer); };
  }, [loadData, invalidateLoad]);

  const preview = useMemo(() => {
    if (!selected || selected.clasificacion) return null;
    try {
      if (CATEGORIAS.some(c => !form[c].gavetas.trim() || !form[c].bruto.trim())) return { error: 'Complete las cantidades y pesos; use cero para categorías vacías.' };
      return { value: calcularClasificacion(selected.pesoNetoKg, selected.taraBase,
        CATEGORIAS.map(categoria => ({ categoria, numGavetas: Number(form[categoria].gavetas), pesoBrutoKg: Number(form[categoria].bruto) }))) };
    } catch (e) { return { error: mensajeCosecha(e) }; }
  }, [selected, form]);

  function seleccionar(jornada: JornadaVista) {
    setSelectedId(jornada.id); setForm(emptyForm()); setObservaciones(''); setMotivo(''); setError(null);
  }

  async function guardar() {
    if (!actor || !selected || !preview?.value || selected.pendienteLocal) return;
    if (selected.fecha !== fechaFinca()) { setError('Solo puede capturar la clasificación en el día de cosecha.'); return; }
    const payload = { localId: offlineService.generateLocalId(), versionFormato: 2 as const, jornadaId: selected.id,
      version: selected.version, pesajeIds: selected.pesajes.map(p => p.id).sort(), detalles: preview.value.detalles,
      timestamp: new Date().toISOString(), clasificador_id: actor.id, observaciones: observaciones || undefined };
    setSaving(true); setError(null);
    try {
      await offlineService.saveClasificacion(payload);
      setSelectedId(null); setForm(emptyForm()); setObservaciones('');
      await loadData();
      window.dispatchEvent(new Event('jirah-queue-changed'));
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'No se pudo guardar.'); }
    finally { setSaving(false); }
  }

  async function aprobar() {
    if (!selected || actor?.rol !== 'ADMIN') return;
    if (!navigator.onLine) { setError('La aprobación del administrador requiere conexión.'); return; }
    setSaving(true); setError(null);
    try {
      const response = await fetch('/api/campo/jornadas/aprobaciones', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jornadaId: selected.id, version: selected.version, motivo }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error); return; }
      setMotivo(''); await loadData();
    } catch { setError('No se pudo aprobar. Compruebe la conexión.'); }
    finally { setSaving(false); }
  }

  return { jornadas, registrosAnteriores, selected, seleccionar, form, setForm, observaciones, setObservaciones,
    pagina, paginas, soloPreparadas, cambiarPagina: (p: number) => { setSelectedId(null); setLoading(true); setPagina(p); },
    motivo, setMotivo, preview, error, loading, saving, guardar, aprobar, isAdmin: actor?.rol === 'ADMIN',
    actualizar: () => loadData().catch(() => setError('No se pudo actualizar la lista.')) };
}
