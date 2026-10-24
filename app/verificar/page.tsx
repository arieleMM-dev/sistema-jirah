'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { signIn, signOut } from 'next-auth/react';
import PasswordField from '../ui/auth/PasswordField';
import styles from '../ui/auth/auth.module.css';
import { clearOfflineAccess } from '@/lib/auth/offline-session';

export default function VerificarPage() {
  const token = useSyncExternalStore(subscribeToken, readToken, () => '');
  const [identity, setIdentity] = useState<string | null>(null), [ready, setReady] = useState(false);
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [error, setError] = useState(''), [done, setDone] = useState(false), [busy, setBusy] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  useEffect(() => {
    const c = new AbortController();
    void fetch('/api/auth/estado', { cache: 'no-store', signal: c.signal }).then(async r => {
      if (!r.ok) return; const data = await r.json(); if (data.user?.email) setIdentity(data.user.email);
    }).catch(() => { /* Puede confirmar tras ingresar en este mismo formulario. */ }).finally(() => { if (!c.signal.aborted) setReady(true); });
    return () => c.abort();
  }, []);
  async function confirmar(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      if (!identity) {
        const result = await signIn('credentials', { email, password, redirect: false });
        if (!result?.ok || result.error) throw new Error('No pudimos ingresar. Revisa tu correo y contraseña.');
        clearOfflineAccess();
      }
      const r = await fetch('/api/auth/verificar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
      const data = await r.json(); if (!r.ok) throw new Error(data.error);
      history.replaceState(null, '', window.location.pathname); window.dispatchEvent(new HashChangeEvent('hashchange'));
      setPassword(''); setDone(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo confirmar el correo. Comprueba la conexión.'); }
    finally { setBusy(false); }
  }
  return <><h1 className={styles.title}>{done ? 'Correo confirmado' : 'Confirma que eres tú'}</h1>
    <p className={styles.description}>{done ? 'Tu solicitud está lista para que el administrador la revise. Confirmar el correo todavía no habilita acceso a los datos de la finca.' : 'Usa la misma cuenta con la que solicitaste acceso a Finca JIRAH.'}</p>
    {error && <div ref={errorRef} tabIndex={-1} role="alert" className={styles.error}>{error}</div>}
    {!ready ? <p role="status">Comprobando tu sesión…</p> : done ? <Link className={styles.backLink} href="/bienvenida">Ver mi solicitud</Link> : !/^[a-f0-9]{64}$/i.test(token) ? <><p role="alert">Abre el enlace completo que recibiste por correo. Puedes solicitar uno nuevo desde tu bienvenida.</p><Link className={styles.backLink} href="/bienvenida">Ir a mi bienvenida</Link></> : <form className={styles.form} onSubmit={confirmar} aria-busy={busy}>
      {identity ? <><p className={styles.identityCopy}>Vas a confirmar el correo de <strong>{identity}</strong>.</p><button type="button" className={styles.backLink} disabled={busy} onClick={() => { void signOut({ redirect: false }).then(() => { clearOfflineAccess(); setIdentity(null); }).catch(() => setError('No se pudo cerrar la sesión. Comprueba la conexión.')); }}>Usar otra cuenta</button></> : <>
        <div className={styles.field}><label htmlFor="email">Correo electrónico</label><input className={styles.input} id="email" name="email" type="email" autoComplete="username" spellCheck={false} autoCapitalize="none" required value={email} onChange={e => setEmail(e.target.value)} /></div>
        <PasswordField id="password" label="Contraseña" value={password} onChange={setPassword} autoComplete="current-password" />
      </>}
      <button className={styles.submit} disabled={busy}>{busy ? 'Confirmando…' : identity ? 'Confirmar mi correo' : 'Ingresar y confirmar mi correo'}</button>
    </form>}
    <Link className={styles.backLink} href="/login">Volver al acceso</Link>
  </>;
}

function readToken() { return new URLSearchParams(window.location.hash.slice(1)).get('token') ?? ''; }
function subscribeToken(callback: () => void) { window.addEventListener('hashchange', callback); return () => window.removeEventListener('hashchange', callback); }
