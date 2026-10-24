'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { fechaFinca } from '@/lib/cosecha';
import type { ComercialVista } from '@/lib/services/comercial.service';

const input = 'w-full min-h-11 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-2';
const button = 'min-h-11 rounded-lg bg-agri-green-main text-white px-4 py-2 disabled:opacity-50';
type Linea = { origen: string; gavetas: string; bruto: string };
function AnularMovimiento({ movimientoId, tipo, actualizar }: { movimientoId: string; tipo: 'ENTREGA' | 'DEVOLUCION'; actualizar: () => Promise<void> }) {
  const [motivo, setMotivo] = useState(''), [confirmado, setConfirmado] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const id = useRef<string | undefined>(undefined);
  async function anular() {
    if (!navigator.onLine) { setError('La anulación requiere conexión.'); return; }
    setBusy(true); setError(''); id.current ??= crypto.randomUUID();
    try {
      const response = await fetch('/api/comercial/anulaciones', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id.current, movimientoId, tipo, motivo }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      await actualizar();
    } catch (e) { setError((e instanceof Error ? e.message : 'No se pudo confirmar la anulación.') + ' Si perdió conexión, reintente con el mismo motivo.'); }
    finally { setBusy(false); }
  }
  return <details className="mt-3 p-3 border border-amber-300 rounded-lg"><summary className="cursor-pointer font-semibold">Anular {tipo === 'ENTREGA' ? 'entrega' : 'devolución'}</summary>
    <form className="mt-3 space-y-3" onSubmit={e => { e.preventDefault(); void anular(); }}>
      <p>Se conservarán el movimiento original, el motivo y su identidad. Primero deben anularse las devoluciones o reventas que dependan de él.</p>
      <label className="block">Motivo de anulación<textarea required minLength={5} maxLength={1000} disabled={busy} className={input} value={motivo} onChange={e => setMotivo(e.target.value)} /></label>
      <label className="flex items-center gap-2"><input type="checkbox" required disabled={busy} checked={confirmado} onChange={e => setConfirmado(e.target.checked)} />Confirmo la anulación de este movimiento</label>
      {error && <p role="alert" className="text-red-700 dark:text-red-300">{error}</p>}
      <button disabled={busy || !confirmado || motivo.trim().length < 5} className="min-h-11 px-4 rounded-lg bg-amber-800 text-white">Confirmar anulación</button>
    </form></details>;
}
export default function ComercialPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<ComercialVista | null>(null);
  const [pagina, setPagina] = useState(1), [loading, setLoading] = useState(true);
  const loadVersion = useRef(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [comprador, setComprador] = useState('');
  const [fecha, setFecha] = useState('');
  const [tara, setTara] = useState('1.7');
  const [lineas, setLineas] = useState<Linea[]>([{ origen: '', gavetas: '', bruto: '' }]);
  const [entrega, setEntrega] = useState('');
  const [origenRechazo, setOrigenRechazo] = useState('');
  const [rechazo, setRechazo] = useState({ fecha: '', tara: '1.7', gavetas: '', bruto: '', motivo: '' });
  const entregaId = useRef<string | undefined>(undefined), devolucionId = useRef<string | undefined>(undefined);
  const load = useCallback(async () => {
    const version = ++loadVersion.current; setLoading(true);
    try {
      const res = await fetch('/api/comercial/entregas?pagina=' + pagina);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'No se pudo cargar el flujo comercial.');
      if (version === loadVersion.current) { setData(body); setError(''); }
    } catch (e) { if (version === loadVersion.current) setError(e instanceof Error ? e.message : 'No se pudo cargar el flujo comercial.'); }
    finally { if (version === loadVersion.current) setLoading(false); }
  }, [pagina]);
  useEffect(() => { if (session?.user?.rol === 'ADMIN') void Promise.resolve().then(load); }, [session?.user?.rol, load]);
  if (session?.user?.rol !== 'ADMIN') return <p>Esta sección requiere un administrador.</p>;
  const selectedBuyer = data?.compradores.find(c => c.id === comprador);
  const opciones = [
    ...(data?.disponibles ?? []).map(d => ({ ...d, key: `c:${d.clasificacionId}:${d.categoria}` })),
    ...(data?.devoluciones ?? []).filter(d => d.disponibleKg > 0).flatMap(d => ['N1', 'N2', 'N3'].map(categoria => ({ key: `r:${d.id}:${categoria}`,
      clasificacionId: null, devolucionId: d.id, categoria, descripcion: `Devolución ${d.fecha} · ${d.id.slice(0, 8)} · ${categoria}`, disponibleKg: d.disponibleKg }))),
  ].filter(d => selectedBuyer && ((d.categoria === 'G' || d.categoria === 'P') === (selectedBuyer.tipo === 'EXPORTADOR')));
  const selectedEntrega = data?.entregas.find(e => e.id === entrega);
  async function enviar(kind: 'entregas' | 'devoluciones') {
    if (!navigator.onLine) { setError('Las entregas y devoluciones requieren conexión para comprobar los saldos.'); return; }
    setBusy(true); setError(''); setMessage('');
    const ref = kind === 'entregas' ? entregaId : devolucionId;
    ref.current ??= crypto.randomUUID();
    try {
      const body = kind === 'entregas' ? { id: ref.current, compradorId: comprador, fecha: fecha || fechaFinca(), taraKg: Number(tara),
        detalles: lineas.map(l => { const o = opciones.find(o => o.key === l.origen); return { clasificacionId: o?.clasificacionId, devolucionId: o?.devolucionId,
          categoria: o?.categoria, numGavetas: Number(l.gavetas), pesoBrutoKg: Number(l.bruto) }; }) }
        : { id: ref.current, entregaId: entrega, detalleOrigenId: origenRechazo || null, fecha: rechazo.fecha || fechaFinca(),
          taraKg: Number(rechazo.tara), numGavetas: Number(rechazo.gavetas), pesoBrutoKg: Number(rechazo.bruto), motivo: rechazo.motivo };
      const res = await fetch(`/api/comercial/${kind}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? 'No se pudo registrar la operación.');
      ref.current = undefined;
      if (kind === 'entregas') setLineas([{ origen: '', gavetas: '', bruto: '' }]);
      else setRechazo(r => ({ ...r, gavetas: '', bruto: '', motivo: '' }));
      setMessage('Operación confirmada por el servidor.'); await load();
    } catch (e) { setError((e instanceof Error ? e.message : 'No se obtuvo confirmación del servidor.') + ' Si perdió la conexión, reintente con los mismos datos.'); }
    finally { setBusy(false); }
  }
  return <div className="max-w-7xl mx-auto space-y-6 text-agri-green-dark dark:text-gray-100">
    <header className="flex flex-wrap justify-between gap-3"><div><h1 className="text-2xl font-bold">Entregas y devoluciones</h1>
      <p>Registre la fruta entregada y el rechazo pesado al volver a la finca.</p></div><button className={button} disabled={busy} onClick={() => void load()}>Actualizar saldos</button></header>
    {error && <p role="alert" className="p-3 bg-red-50 text-red-900 rounded-lg">{error}</p>}
    {message && <p role="status" className="p-3 bg-green-50 text-green-900 rounded-lg">{message}</p>}
    {!data ? <p role="status">{loading ? 'Cargando…' : 'No se pudieron consultar los datos. Use Actualizar saldos para reintentar.'}</p> : <>
      <form onSubmit={e => { e.preventDefault(); void enviar('entregas'); }} className="p-5 border rounded-xl space-y-4">
        <h2 className="text-xl font-bold">Nueva entrega</h2><p className="text-sm">Puede reunir varios lotes y campañas. Solo se ofrecen jornadas clasificadas dentro del margen o aprobadas. El saldo se controla en kilos netos.</p>
        <fieldset disabled={busy} className="grid sm:grid-cols-3 gap-3">
          <label>Comprador<select aria-label="Comprador" required className={input} value={comprador} onChange={e => { setComprador(e.target.value); setLineas([{ origen: '', gavetas: '', bruto: '' }]); }}>
            <option value="">Seleccione</option>{data.compradores.map(c => <option key={c.id} value={c.id}>{c.nombre} · {c.tipo}</option>)}</select></label>
          <label>Fecha de entrega<input className={input} type="date" value={fecha} onChange={e => setFecha(e.target.value)} /><span className="text-xs">Vacía: hoy en la finca.</span></label>
          <label>Tara de entrega (kg/gaveta)<input required className={input} type="number" min="0.001" max="10" step="0.001" value={tara} onChange={e => setTara(e.target.value)} /></label>
        </fieldset>
        {lineas.map((l, index) => <fieldset key={index} disabled={busy} className="grid md:grid-cols-[2fr_1fr_1fr_auto] gap-3 items-end">
          <label>Origen y categoría<select aria-label={`Origen ${index + 1}`} required className={input} value={l.origen} onChange={e => setLineas(ls => ls.map((v, i) => i === index ? { ...v, origen: e.target.value } : v))}>
            <option value="">Seleccione</option>{opciones.map(o => <option key={o.key} value={o.key}>{o.descripcion} · saldo {o.disponibleKg.toFixed(3)} kg</option>)}</select></label>
          <label>Gavetas<input aria-label={`Gavetas entrega ${index + 1}`} required className={input} type="number" min="1" step="1" value={l.gavetas} onChange={e => setLineas(ls => ls.map((v, i) => i === index ? { ...v, gavetas: e.target.value } : v))} /></label>
          <label>Bruto (kg)<input aria-label={`Bruto entrega ${index + 1}`} required className={input} type="number" min="0.001" step="0.001" value={l.bruto} onChange={e => setLineas(ls => ls.map((v, i) => i === index ? { ...v, bruto: e.target.value } : v))} /></label>
          <button type="button" className={input} disabled={lineas.length === 1} onClick={() => setLineas(ls => ls.filter((_, i) => i !== index))}>Quitar</button>
        </fieldset>)}
        <div className="flex flex-wrap gap-3"><button type="button" className={input + ' w-auto'} disabled={busy || lineas.length >= 100} onClick={() => setLineas(ls => [...ls, { origen: '', gavetas: '', bruto: '' }])}>Añadir origen</button>
          <button disabled={busy || !comprador} className={button}>Registrar entrega</button></div>
      </form>
      <form onSubmit={e => { e.preventDefault(); void enviar('devoluciones'); }} className="p-5 border rounded-xl space-y-4">
        <h2 className="text-xl font-bold">Devolución del comprador</h2><p className="text-sm">El rechazo pasa a nacional. Indique la cantidad real de gavetas y el bruto pesados en finca; no se deduce la cantidad a partir del peso.</p>
        <fieldset disabled={busy} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <label>Entrega<select aria-label="Entrega" required className={input} value={entrega} onChange={e => { setEntrega(e.target.value); setOrigenRechazo(''); }}>
            <option value="">Seleccione</option>{data.entregas.filter(e => !e.anulacion && e.tipoComprador === 'EXPORTADOR').map(e => <option key={e.id} value={e.id}>{e.fecha} · {e.nombreComprador} · {e.id.slice(0, 8)} · {e.aceptadoKg.toFixed(3)} kg pendientes</option>)}</select><span className="text-xs">Entregas de la página actual. Para una anterior, cambie la página del historial.</span></label>
          <label>Origen informado<select className={input} value={origenRechazo} onChange={e => setOrigenRechazo(e.target.value)}><option value="">Sin atribuir</option>
            {selectedEntrega?.detalles.map(d => <option key={d.id} value={d.id}>{d.clasificacion?.jornada.campana.codigo} · {d.clasificacion?.jornada.lote.codigo} · {d.categoria}</option>)}</select></label>
          <label>Fecha de devolución<input className={input} type="date" value={rechazo.fecha} onChange={e => setRechazo(r => ({ ...r, fecha: e.target.value }))} /></label>
          <label>Gavetas devueltas<input required className={input} type="number" min="1" step="1" value={rechazo.gavetas} onChange={e => setRechazo(r => ({ ...r, gavetas: e.target.value }))} /></label>
          <label>Bruto devuelto (kg)<input required className={input} type="number" min="0.001" step="0.001" value={rechazo.bruto} onChange={e => setRechazo(r => ({ ...r, bruto: e.target.value }))} /></label>
          <label>Tara en finca (kg/gaveta)<input required className={input} type="number" min="0.001" max="10" step="0.001" value={rechazo.tara} onChange={e => setRechazo(r => ({ ...r, tara: e.target.value }))} /></label>
          <label className="sm:col-span-2">Motivo<textarea required minLength={5} maxLength={1000} className={input} value={rechazo.motivo} onChange={e => setRechazo(r => ({ ...r, motivo: e.target.value }))} /></label>
        </fieldset><button disabled={busy || !entrega} className={button}>Registrar devolución</button>
      </form>
      <section className="space-y-3"><h2 className="text-xl font-bold">Historial de entregas ({data.totalEntregas})</h2>
        <nav className="flex flex-wrap items-center gap-3 text-sm" aria-label="Paginación de entregas">
          <button className={input + ' w-auto'} disabled={busy || loading || pagina === 1} onClick={() => { setData(null); setEntrega(''); setOrigenRechazo(''); setPagina(p => p - 1); }}>Anterior</button>
          <span>Página {data.pagina} de {data.paginas}</span>
          <button className={input + ' w-auto'} disabled={busy || loading || pagina >= data.paginas} onClick={() => { setData(null); setEntrega(''); setOrigenRechazo(''); setPagina(p => p + 1); }}>Siguiente</button>
        </nav>
        {!data.entregas.length && <p>Todavía no hay entregas registradas.</p>}
        {data.entregas.map(e => <details key={e.id} data-entrega-id={e.id} className="p-4 border rounded-xl"><summary className="cursor-pointer font-semibold">{e.anulacion ? 'ANULADA · ' : ''}{e.fecha} · {e.nombreComprador} · {e.entregadoKg.toFixed(3)} kg entregados · {e.rechazadoKg.toFixed(3)} kg devueltos vigentes</summary>
          <div className="mt-3 space-y-2 text-sm"><p>Referencia: {e.id} · tara: {e.taraKg} kg · responsable: {e.responsable.nombres} {e.responsable.apellidos}</p>
            {!e.anulacion && e.tipoComprador === 'EXPORTADOR' && <p>Exportación aceptada: {e.aceptadoKg.toFixed(3)} kg · rechazo: {e.rechazoPct?.toFixed(2)} % de lo entregado</p>}
            {e.anulacion ? <p className="text-amber-800 dark:text-amber-200">Anulada por {e.anulacion.responsable.nombres} {e.anulacion.responsable.apellidos} · {e.anulacion.motivo} · {new Date(String(e.anulacion.createdAt)).toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })}. Excluida de saldos.</p> : <AnularMovimiento movimientoId={e.id} tipo="ENTREGA" actualizar={load} />}
            <ul>{e.detalles.map(d => <li key={d.id}>{d.clasificacion ? `${d.clasificacion.jornada.fecha} · ${d.clasificacion.jornada.campana.codigo} · ${d.clasificacion.jornada.lote.codigo}` : `Reventa devolución ${d.devolucionId}`} · {d.categoria} · {d.numGavetas} gavetas · bruto {d.pesoBrutoKg.toFixed(3)} · neto {d.pesoNetoKg.toFixed(3)} kg</li>)}</ul>
            <h3 className="font-bold">Devoluciones</h3>{!e.devoluciones.length && <p>Sin devoluciones.</p>}
            <ul>{e.devoluciones.map(d => <li key={d.id} data-devolucion-id={d.id} className="mt-3">{d.anulacion ? 'ANULADA · ' : ''}{d.fecha} · {d.numGavetas} gavetas · {d.pesoNetoKg.toFixed(3)} kg netos · {d.detalleOrigenId ? `Origen ${d.detalleOrigenId}` : 'Sin atribuir'} · {d.motivo} · responsable: {d.responsable.nombres}
              {d.anulacion ? <p className="text-amber-800 dark:text-amber-200">Anulada por {d.anulacion.responsable.nombres} {d.anulacion.responsable.apellidos} · {d.anulacion.motivo} · {new Date(String(d.anulacion.createdAt)).toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })}. Excluida del ajuste.</p> : <AnularMovimiento movimientoId={d.id} tipo="DEVOLUCION" actualizar={load} />}
            </li>)}</ul>
          </div></details>)}
      </section>
    </>}
  </div>;
}
