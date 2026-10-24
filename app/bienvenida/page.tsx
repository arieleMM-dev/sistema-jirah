'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { Clock3, MailCheck, Mail } from 'lucide-react';
import styles from '../ui/auth/auth.module.css';

type Estado = { nombres: string; email: string; rol: string; estadoAcceso: string; emailVerificado: boolean };
export default function BienvenidaPage() {
  const [user, setUser] = useState<Estado | null>(null), [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [login, setLogin] = useState(false);
  const actualizar = useCallback(async (signal?: AbortSignal) => {
    try {
      const r = await fetch('/api/auth/estado', { cache: 'no-store', signal });
      if (r.status === 401) { setLogin(true); return; }
      if (!r.ok) throw new Error('No se pudo consultar tu solicitud. Comprueba la conexión.');
      const d = await r.json(); setUser(d.user); setError('');
    } catch (e) { if (!signal?.aborted) setError(e instanceof Error ? e.message : 'No se pudo consultar tu solicitud.'); }
  }, []);
  useEffect(() => {
    const c = new AbortController();
    void fetch('/api/auth/estado', { cache: 'no-store', signal: c.signal }).then(async r => {
      if (r.status === 401) { setLogin(true); return; }
      if (!r.ok) throw new Error('No se pudo consultar tu solicitud.'); const d = await r.json(); setUser(d.user);
    }).catch(e => { if (!c.signal.aborted) setError(e instanceof Error ? e.message : 'Comprueba la conexión.'); });
    const refresh = () => { if (navigator.onLine && document.visibilityState === 'visible') void actualizar(c.signal); };
    const timer = setInterval(refresh, 30_000); window.addEventListener('online', refresh);
    return () => { c.abort(); clearInterval(timer); window.removeEventListener('online', refresh); };
  }, [actualizar]);
  async function reenviar() {
    setBusy(true); setError(''); setMessage('');
    try {
      const r = await fetch('/api/auth/reenviar-verificacion', { method: 'POST' }); const d = await r.json();
      if (!r.ok) throw new Error(d.error); setMessage(d.message);
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo solicitar el enlace.'); }
    finally { setBusy(false); }
  }
  const approved = user?.estadoAcceso === 'APROBADO';
  return <>
    <h1 className={styles.title}>Bienvenido a Finca JIRAH</h1>
    <p className={styles.description}>{user ? `${user.nombres}, este es el estado de tu acceso al equipo.` : 'Un lugar para acompañar cada cosecha, desde la finca.'}</p>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {message && <p role="status">{message}</p>}
    {login ? <><p className={styles.description}>Ingresa nuevamente para consultar tu acceso actualizado. Todavía no se habilita captura sin conexión desde esta pantalla.</p><Link className={styles.backLink} href="/login">Iniciar sesión</Link></> : user ? <div className={styles.welcomeStatus}>
      {approved ? <><MailCheck size={32} aria-hidden="true" /><h2>Tu acceso está aprobado</h2><p>Ya puedes continuar con el trabajo de la finca.</p><Link className={styles.submit} href={user.rol === 'ADMIN' ? '/dashboard' : '/dashboard/campo/pesaje'}>Entrar a la finca</Link></> : user.estadoAcceso === 'RECHAZADO' ? <><h2>Tu solicitud no fue aprobada</h2><p>Comunícate con el administrador de la finca si necesitas que revise tu solicitud. Tu cuenta no tiene acceso a los registros.</p></> : <>
        {user.emailVerificado ? <Clock3 size={32} aria-hidden="true" /> : <Mail size={32} aria-hidden="true" />}
        <h2>{user.emailVerificado ? 'El administrador revisará tu acceso' : 'Primero, confirma tu correo'}</h2>
        <p>{user.emailVerificado ? 'Tu correo ya está confirmado. El administrador te asignará acceso como personal de campo cuando apruebe tu solicitud.' : `Confirma el correo ${user.email}. Revisa tu bandeja de entrada y correo no deseado. Si no encuentras el enlace, solicita otro.`}</p>
        {!user.emailVerificado && <button className={styles.submit} onClick={() => void reenviar()} disabled={busy}>{busy ? 'Solicitando enlace…' : 'Reenviar verificación'}</button>}
        <p className={styles.help}>Mientras esperas no puedes consultar datos ni registrar cosechas. La captura sin conexión se prepara después de la aprobación.</p>
      </>}
      <button className={styles.backLink} onClick={() => void actualizar()}>Actualizar estado</button>
    </div> : !error && <p role="status">Consultando tu solicitud…</p>}
    <button className={styles.backLink} onClick={() => void signOut({ callbackUrl: '/login' })}>Cerrar sesión</button>
  </>;
}
