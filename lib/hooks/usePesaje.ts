import { useState, useEffect, useCallback, useMemo } from 'react';
import { offlineService } from '@/lib/services/offline.service';
import type { CampanaCampo, LoteCampo } from '@/lib/types/cosecha';
import { networkSyncSubject } from '@/lib/observers/SyncObserver';

export type Campana = CampanaCampo;
export type Lote = LoteCampo;
type PesajeHistorial = {
  id: string; fechaRegistro: string; numGavetas: number; pesoBrutoKg: number; pesoNetoKg: number;
  campana: { codigo: string }; lote: { codigo: string }; clasificacion: { id: string } | null;
  jornada: { id: string; fecha: string; estado: string } | null;
};

export function usePesaje(userId: string | undefined) {
  const [campanas, setCampanas] = useState<Campana[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [historial, setHistorial] = useState<PesajeHistorial[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    campanaId: '', loteId: '', numGavetas: '', pesoBrutoKg: '', observaciones: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(() => Promise.all([
        fetch('/api/catalogos/campanias'),
        fetch('/api/catalogos/lotes'),
        fetch('/api/campo/pesajes?limite=10')
      ]).then(async ([cRes, lRes, hRes]) => {

      if (!cRes.ok || !lRes.ok || !hRes.ok) {
        throw new Error('Error al cargar datos del catálogo.');
      }

      const [c, l, h]: [{ campanas?: Campana[] }, { lotes?: Lote[] }, { pesajes?: PesajeHistorial[] }] = await Promise.all([cRes.json(), lRes.json(), hRes.json()]);

      setCampanas((c.campanas ?? []).filter(camp => camp.isActive));
      setLotes((l.lotes ?? []).filter(lote => lote.isActive));
      setHistorial(h.pesajes?.slice(0, 10) ?? []);
      if (userId) await offlineService.saveContext(userId, { campanas: c.campanas ?? [], lotes: l.lotes ?? [] });
      setError(null);
    }).catch(async (err: unknown) => {
      let cached;
      try { cached = userId ? await offlineService.getContext(userId) : undefined; }
      catch { setError('No se pudo acceder al almacenamiento local.'); return; }
      if (cached?.campanas && cached?.lotes) {
        setCampanas(cached.campanas.filter(c => c.isActive)); setLotes(cached.lotes.filter(l => l.isActive));
        setHistorial([]); setError(null);
      } else setError(err instanceof Error ? err.message : 'Error de conexión');
    }).finally(() => {
      setLoading(false);
    }), [userId]);

  useEffect(() => {
    loadData();
    const observer = { onSyncEvent: (event: string) => { if (event === 'sync-complete') void loadData(); } };
    networkSyncSubject.subscribe(observer);
    return () => networkSyncSubject.unsubscribe(observer);
  }, [loadData]);

  // Recálculo dinámico seguro
  const calc = useMemo(() => {
    const campana = campanas.find(c => c.id === form.campanaId);
    const gavetas = Number(form.numGavetas);
    const pesoBruto = Number(form.pesoBrutoKg);
    
    if (campana && Number.isSafeInteger(gavetas) && gavetas > 0 && Number.isFinite(pesoBruto) && pesoBruto > 0) {
      const taraTotal = +(gavetas * campana.taraBase).toFixed(3);
      const pesoNeto  = +(pesoBruto - taraTotal).toFixed(3);
      return { taraTotal, pesoNeto };
    }
    return null;
  }, [form.campanaId, form.numGavetas, form.pesoBrutoKg, campanas]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.campanaId) e.campanaId = 'Seleccione una campaña';
    if (!form.loteId) e.loteId = 'Seleccione un lote';
    
    const gv = Number(form.numGavetas);
    if (!form.numGavetas || !Number.isSafeInteger(gv) || gv <= 0) e.numGavetas = 'Debe ser un entero mayor a 0';
    
    const pb = Number(form.pesoBrutoKg);
    if (!form.pesoBrutoKg || !Number.isFinite(pb) || pb <= 0) e.pesoBrutoKg = 'Peso inválido';
    
    if (calc && calc.pesoNeto < 0) e.pesoBrutoKg = 'El peso neto resulta negativo';
    
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleGuardar = async () => {
    if (!validate()) return { success: false, msg: 'Errores en el formulario', type: 'error' };
    setSaving(true);
    try {
      const campana = campanas.find(c => c.id === form.campanaId);
      if (!userId || !campana) throw new Error('Inicie sesión y seleccione una campaña.');
        await offlineService.savePesaje({
          peso_bruto: Number(form.pesoBrutoKg),
          num_gavetas: Number(form.numGavetas),
          tara_base: campana.taraBase,
          version_parametros: campana.versionParametros,
          minimo_p_gr: campana.minimoPGr,
          minimo_g_gr: campana.minimoGGr,
          agricultor_id: userId,
          campana_codigo: form.campanaId,
          lote_codigo: form.loteId,
          observaciones: form.observaciones || undefined,
        });
        resetForm();
        window.dispatchEvent(new Event('jirah-queue-changed'));
        return { success: true, msg: 'Pesaje guardado en este dispositivo. Revise su confirmación en Pendientes.', type: 'info' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Fallo de red';
      setErrors({ general: message });
      return { success: false, msg: message, type: 'error' };
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm(f => ({ ...f, numGavetas: '', pesoBrutoKg: '', observaciones: '' }));
    setErrors({});
  };

  return {
    campanas,
    lotes,
    historial,
    loading,
    error,
    form,
    setForm,
    calc,
    errors,
    saving,
    handleGuardar
  };
}
