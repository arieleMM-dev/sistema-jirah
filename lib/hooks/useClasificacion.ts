import { useState, useEffect, useCallback } from 'react';
import { offlineService } from '@/lib/services/offline.service';

export type PesajePendiente = {
  id: string; fechaRegistro: string; pesoBrutoKg: number; numGavetas: number; pesoNetoKg: number;
  campana: { codigo: string; nombre: string; taraBase: number };
  lote:    { codigo: string; nombre: string };
  agricultor: { nombres: string; apellidos: string };
};

export function useClasificacion() {
  const [pendientes, setPendientes] = useState<PesajePendiente[]>([]);
  const [selected, setSelected] = useState<PesajePendiente | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    gvExp: '', pbExp: '', gvNac: '', pbNac: '', desce: '', obs: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [verificado, setVerificado] = useState(false);
  const [calculo, setCalculo] = useState<{
    netoExp: number; netoNac: number; total: number; margen: number; ok: boolean;
  } | null>(null);
  
  const [descuadreAlerta, setDescuadreAlerta] = useState<number | null>(null);
  const [forzar, setForzar] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/campo/clasificaciones');
      if (!res.ok) throw new Error('Error al cargar clasificaciones');
      const data = await res.json();
      setPendientes(data.pendientes ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setForm({ gvExp: '', pbExp: '', gvNac: '', pbNac: '', desce: '', obs: '' });
    setErrors({});
    setVerificado(false);
    setCalculo(null);
    setDescuadreAlerta(null);
    setForzar(false);
  };

  const seleccionar = (p: PesajePendiente) => {
    setSelected(p);
    resetForm();
  };

  const calcular = () => {
    const e: Record<string, string> = {};
    const gve = parseInt(form.gvExp); const pbe = parseFloat(form.pbExp);
    const gvn = parseInt(form.gvNac); const pbn = parseFloat(form.pbNac);
    const desc = parseFloat(form.desce || '0');

    if (!form.gvExp || isNaN(gve) || gve < 0) e.gvExp = 'Gavetas inválidas';
    if (!form.pbExp || isNaN(pbe) || pbe < 0) e.pbExp = 'Peso bruto inválido';
    if (!form.gvNac || isNaN(gvn) || gvn < 0) e.gvNac = 'Gavetas inválidas';
    if (!form.pbNac || isNaN(pbn) || pbn < 0) e.pbNac = 'Peso bruto inválido';
    if (isNaN(desc) || desc < 0) e.desce = 'Descarte inválido';
    
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    if (!selected) return;

    const tara = selected.campana.taraBase;
    const netoExp = +(pbe - gve * tara).toFixed(3);
    const netoNac = +(pbn - gvn * tara).toFixed(3);
    const total = +(netoExp + netoNac + desc).toFixed(3);
    const base = selected.pesoNetoKg;
    const margen = base > 0 ? +((Math.abs(total - base) / base) * 100).toFixed(2) : 0;
    const ok = margen <= 4.0;

    setCalculo({ netoExp, netoNac, total, margen, ok });
    setVerificado(true);
    setDescuadreAlerta(ok ? null : margen);
    setForzar(false);
  };

  const handleGuardar = async (clasificadorId: string | undefined) => {
    if (!selected || !calculo) return { success: false, msg: 'Faltan datos por calcular', type: 'error' };
    setSaving(true);
    try {
      if (!navigator.onLine) {
        await offlineService.saveClasificacion({
          pesaje_local_id: selected.id,
          exportacion_kg: calculo.netoExp,
          nacional_kg: calculo.netoNac,
          descarte_kg: parseFloat(form.desce || '0'),
          clasificador_id: clasificadorId || '',
          observaciones: form.obs || undefined,
        });
        resetForm();
        setSelected(null);
        return { success: true, msg: 'Modo Offline: Clasificación guardada localmente.', type: 'info' };
      }

      const res = await fetch('/api/campo/clasificaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pesajeId: selected.id,
          exportacionKg: calculo.netoExp,
          nacionalKg: calculo.netoNac,
          descarteKg: parseFloat(form.desce || '0'),
          forzarDescuadre: forzar,
          observaciones: form.obs || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrors({ general: data.error });
        return { success: false, msg: data.error || 'Error al guardar', type: 'error' };
      }

      resetForm();
      setSelected(null);
      await loadData();
      return { success: true, msg: 'Clasificación registrada exitosamente.', type: 'success' };
    } catch (err: any) {
      setErrors({ general: err.message || 'Error de red' });
      return { success: false, msg: err.message || 'Error de red', type: 'error' };
    } finally {
      setSaving(false);
    }
  };

  return {
    pendientes, selected, loading, error, form, setForm,
    errors, verificado, setVerificado, calculo, descuadreAlerta, forzar, setForzar, saving,
    seleccionar, resetForm, calcular, handleGuardar
  };
}
