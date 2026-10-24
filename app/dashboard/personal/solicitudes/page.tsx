'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type Solicitud = { id: string; nombres: string; apellidos: string; email: string; cedula: string; emailVerificadoAt: string | null;
  estadoAcceso: string; sessionVersion: number; createdAt: string;
  decisionesAcceso: { id: string; motivo: string; estadoNuevo: string; createdAt: string; administrador: { nombres: string; apellidos: string } }[] };
const control = 'min-h-11 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-agri-green-main';

export default function SolicitudesPage() {
  const [items, setItems] = useState<Solicitud[]>([]), [estado, setEstado] = useState('PENDIENTE'), [pagina, setPagina] = useState(1), [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [decision, setDecision] = useState<{ item: Solicitud; accion: 'APROBAR' | 'RECHAZAR' } | null>(null), [motivo, setMotivo] = useState('');
  const cargar = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError('');
    try {
      const r = await fetch(`/api/agricultores/solicitudes?estado=${estado}&pagina=${pagina}`, { cache: 'no-store', signal });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      setItems(d.solicitudes); setTotal(d.total); setError('');
    } catch (e) { if (!signal?.aborted) setError(e instanceof Error ? e.message : 'No se pudieron consultar las solicitudes.'); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [estado, pagina]);
  useEffect(() => {
    const c = new AbortController();
    void fetch(`/api/agricultores/solicitudes?estado=${estado}&pagina=${pagina}`, { cache: 'no-store', signal: c.signal }).then(async r => {
      const d = await r.json(); if (!r.ok) throw new Error(d.error); setItems(d.solicitudes); setTotal(d.total); setError('');
    }).catch(e => { if (!c.signal.aborted) setError(e instanceof Error ? e.message : 'No se pudieron consultar las solicitudes.'); })
      .finally(() => { if (!c.signal.aborted) setLoading(false); });
    return () => c.abort();
  }, [estado, pagina]);
  async function resolver(event: React.FormEvent) {
    event.preventDefault(); if (!decision) return; setBusy(true); setError(''); setMessage('');
    try {
      const r = await fetch('/api/agricultores/solicitudes', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: decision.item.id, version: decision.item.sessionVersion, accion: decision.accion, motivo }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      setMessage(decision.accion === 'APROBAR' ? 'Acceso de campo aprobado. El trabajador debe ingresar nuevamente para utilizarlo.' : 'Solicitud rechazada. Se conservó el motivo y el historial.');
      setDecision(null); setMotivo(''); await cargar();
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo confirmar la decisión.'); }
    finally { setBusy(false); }
  }
  return <div className="max-w-5xl mx-auto space-y-6 text-gray-900 dark:text-gray-100">
    <header className="space-y-3"><Link className="underline underline-offset-4" href="/dashboard/personal">Volver a personal</Link><h1 className="text-3xl font-bold">Solicitudes de acceso</h1>
      <p>Verifique que la persona pertenece al equipo antes de aprobarla. El acceso de campo permite pesar y clasificar; no otorga administración.</p></header>
    <div className="flex flex-wrap items-end gap-4"><label className="grid gap-1">Estado<select className={control} value={estado} disabled={busy || loading} onChange={e => { setLoading(true); setItems([]); setEstado(e.target.value); setPagina(1); setDecision(null); }}><option value="PENDIENTE">Pendientes</option><option value="RECHAZADO">Rechazadas</option></select></label><button className={control} disabled={busy || loading} onClick={() => void cargar()}>Actualizar solicitudes</button></div>
    {error && <p role="alert" className="text-red-800 dark:text-red-300">{error}</p>}{message && <p role="status">{message}</p>}
    {loading ? <p role="status">Consultando solicitudes…</p> : !items.length ? <p>No hay solicitudes {estado === 'PENDIENTE' ? 'pendientes' : 'rechazadas'}.</p> : <ul className="divide-y divide-gray-200 dark:divide-gray-700">{items.map(item => <li className="py-5 space-y-3" key={item.id}>
      <h2 className="text-lg font-bold">{item.nombres} {item.apellidos}</h2><p className="break-words">{item.email} · Cédula {item.cedula}</p>
      <Link className="inline-flex min-h-11 items-center underline underline-offset-4" href={`/dashboard/personal/${item.id}`}>Ver expediente y corregir datos de contacto</Link>
      <p className="text-sm">{item.emailVerificadoAt ? 'Correo confirmado' : 'Correo todavía sin confirmar'} · Solicitud del {new Date(item.createdAt).toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' })}</p>
      <div className="flex flex-wrap gap-3"><button className={control + ' disabled:opacity-50'} disabled={busy || loading || Boolean(error) || !item.emailVerificadoAt} onClick={() => { setDecision({ item, accion: 'APROBAR' }); setMotivo('Acceso de campo autorizado por administración.'); }}>Aprobar acceso de campo</button>
        {item.estadoAcceso !== 'RECHAZADO' && <button className={control} disabled={busy || loading || Boolean(error)} onClick={() => { setDecision({ item, accion: 'RECHAZAR' }); setMotivo(''); }}>Rechazar solicitud</button>}</div>
      {!item.emailVerificadoAt && <p className="text-sm">Solo se puede aprobar después de que el trabajador confirme su correo.</p>}
      {decision?.item.id === item.id && <form className="space-y-3 max-w-xl" onSubmit={resolver} aria-busy={busy}><p className="font-semibold">{decision.accion === 'APROBAR' ? 'Confirmar aprobación' : 'Confirmar rechazo'} de {item.nombres}</p>
        <label className="grid gap-1">Motivo obligatorio<textarea className={control} required minLength={5} maxLength={1000} value={motivo} onChange={e => setMotivo(e.target.value)} disabled={busy} /></label>
        <div className="flex gap-3"><button className={control} disabled={busy}>{busy ? 'Guardando decisión…' : 'Confirmar decisión'}</button><button className={control} type="button" disabled={busy} onClick={() => setDecision(null)}>Cancelar</button></div></form>}
      {!!item.decisionesAcceso.length && <details><summary className="cursor-pointer underline underline-offset-4">Últimas decisiones ({item.decisionesAcceso.length})</summary><ul>{item.decisionesAcceso.map(d => <li key={d.id} className="py-2 text-sm">{d.estadoNuevo === 'APROBADO' ? 'Aprobada' : 'Rechazada'} · {d.administrador.nombres} {d.administrador.apellidos} · {d.motivo}</li>)}</ul></details>}
    </li>)}</ul>}
    <nav className="flex flex-wrap items-center gap-3" aria-label="Paginación de solicitudes"><button className={control} disabled={pagina === 1 || busy || loading} onClick={() => { setLoading(true); setItems([]); setDecision(null); setPagina(p => p - 1); }}>Anterior</button><span>Página {pagina} · {total} solicitudes</span><button className={control} disabled={pagina * 25 >= total || busy || loading} onClick={() => { setLoading(true); setItems([]); setDecision(null); setPagina(p => p + 1); }}>Siguiente</button></nav>
  </div>;
}
