import { useState, useEffect, useCallback } from 'react';
import { offlineService } from '@/lib/services/offline.service';

export type Campana = { id: string; codigo: string; nombre: string; taraBase: number };
export type Lote    = { id: string; codigo: string; nombre: string };

export function usePesaje(userId: string | undefined) {
  const [campanas, setCampanas] = useState<Campana[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [historial, setHistorial] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    campanaId: '', loteId: '', numGavetas: '', pesoBrutoKg: '', observaciones: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [calc, setCalc] = useState<{ taraTotal: number; pesoNeto: number } | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cRes, lRes, hRes] = await Promise.all([
        fetch('/api/catalogos/campanias'),
        fetch('/api/catalogos/lotes'),
        fetch('/api/campo/pesajes')
      ]);

      if (!cRes.ok || !lRes.ok || !hRes.ok) {
        throw new Error('Error al cargar datos del catálogo.');
      }

      const [c, l, h] = await Promise.all([cRes.json(), lRes.json(), hRes.json()]);

      setCampanas((c.campanas ?? []).filter((camp: any) => camp.isActive));
      setLotes((l.lotes ?? []).filter((lote: any) => lote.isActive));
      setHistorial(h.pesajes?.slice(0, 10) ?? []);
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Recálculo dinámico seguro
  useEffect(() => {
    const campana = campanas.find(c => c.id === form.campanaId);
    const gavetas = parseInt(form.numGavetas);
    const pesoBruto = parseFloat(form.pesoBrutoKg);
    
    if (campana && !isNaN(gavetas) && gavetas > 0 && !isNaN(pesoBruto) && pesoBruto > 0) {
      const taraTotal = +(gavetas * campana.taraBase).toFixed(3);
      const pesoNeto  = +(pesoBruto - taraTotal).toFixed(3);
      setCalc({ taraTotal, pesoNeto });
    } else {
      setCalc(null);
    }
  }, [form.campanaId, form.numGavetas, form.pesoBrutoKg, campanas]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.campanaId) e.campanaId = 'Seleccione una campaña';
    if (!form.loteId) e.loteId = 'Seleccione un lote';
    
    const gv = parseInt(form.numGavetas);
    if (!form.numGavetas || isNaN(gv) || gv <= 0) e.numGavetas = 'Debe ser mayor a 0';
    
    const pb = parseFloat(form.pesoBrutoKg);
    if (!form.pesoBrutoKg || isNaN(pb) || pb <= 0) e.pesoBrutoKg = 'Peso inválido';
    
    if (calc && calc.pesoNeto < 0) e.pesoBrutoKg = 'El peso neto resulta negativo';
    
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleGuardar = async () => {
    if (!validate()) return { success: false, msg: 'Errores en el formulario', type: 'error' };
    setSaving(true);
    try {
      if (!navigator.onLine) {
        await offlineService.savePesaje({
          peso_bruto: parseFloat(form.pesoBrutoKg),
          num_gavetas: parseInt(form.numGavetas),
          agricultor_id: userId || '',
          campana_codigo: form.campanaId,
          lote_codigo: form.loteId,
          observaciones: form.observaciones || undefined,
        });
        resetForm();
        return { success: true, msg: 'Modo Offline: Pesaje guardado localmente.', type: 'info' };
      }

      const res = await fetch('/api/campo/pesajes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campanaId: form.campanaId,
          loteId: form.loteId,
          numGavetas: parseInt(form.numGavetas),
          pesoBrutoKg: parseFloat(form.pesoBrutoKg),
          observaciones: form.observaciones || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrors({ general: data.error || 'Error al guardar' });
        return { success: false, msg: data.error || 'Error en el servidor', type: 'error' };
      }

      resetForm();
      await loadData();
      return { success: true, msg: 'Cosecha registrada exitosamente.', type: 'success' };
    } catch (err: any) {
      setErrors({ general: err.message || 'Error desconocido' });
      return { success: false, msg: err.message || 'Fallo de red', type: 'error' };
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm(f => ({ ...f, numGavetas: '', pesoBrutoKg: '', observaciones: '' }));
    setCalc(null);
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
