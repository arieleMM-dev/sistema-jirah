'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import PasswordField from '../ui/auth/PasswordField';
import styles from '../ui/auth/auth.module.css';
import { clearOfflineAccess } from '@/lib/auth/offline-session';

export default function RegistroPage() {
  const router = useRouter();
  const [form, setForm] = useState({ nombres: '', apellidos: '', cedula: '', email: '', password: '' });
  const [confirm, setConfirm] = useState(''), [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  async function registrar(event: React.FormEvent) {
    event.preventDefault(); setError(''); setMessage('');
    if (form.password !== confirm) { setError('Las contraseñas no coinciden.'); return; }
    setBusy(true);
    try {
      const response = await fetch('/api/auth/registro', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setMessage(data.message);
      const result = await signIn('credentials', { email: form.email, password: form.password, redirect: false });
      if (result?.ok && !result.error) { clearOfflineAccess(); router.replace('/bienvenida'); }
      setForm(f => ({ ...f, password: '' })); setConfirm('');
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo solicitar el acceso. Comprueba la conexión.'); }
    finally { setBusy(false); }
  }
  return <>
    <h1 className={styles.title}>Tu lugar en la finca</h1>
    <p className={styles.description}>Crea tu cuenta con tu correo personal. Confírmalo y el administrador revisará tu acceso al equipo.</p>
    {error && <div ref={errorRef} tabIndex={-1} role="alert" className={styles.error}>{error}</div>}
    {message && <p role="status" className={styles.description}>{message}</p>}
    <form onSubmit={registrar} className={`${styles.form} ${styles.compactForm}`} aria-busy={busy}>
      <div className={styles.nameFields}>{(['nombres','apellidos'] as const).map(key => <div className={styles.field} key={key}>
        <label htmlFor={key}>{key === 'nombres' ? 'Nombres' : 'Apellidos'}</label>
        <input className={styles.input} id={key} name={key} autoComplete={key === 'nombres' ? 'given-name' : 'family-name'} required minLength={2} maxLength={50} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
      </div>)}</div>
      <div className={styles.field}><label htmlFor="cedula">Cédula ecuatoriana</label><input className={styles.input} id="cedula" name="cedula" inputMode="numeric" autoComplete="off" pattern="[0-9]{10}" required maxLength={10} value={form.cedula} onChange={e => setForm(f => ({ ...f, cedula: e.target.value }))} /></div>
      <div className={styles.field}><label htmlFor="email">Correo electrónico</label><input className={styles.input} id="email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required maxLength={100} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
      <PasswordField id="password" label="Contraseña" value={form.password} onChange={password => setForm(f => ({ ...f, password }))} autoComplete="new-password" describedBy="password-policy" />
      <p id="password-policy" className={styles.help}>Usa una frase de al menos 15 caracteres y hasta 72 bytes. Evita contraseñas comunes.</p>
      <PasswordField id="confirm-password" label="Confirmar contraseña" value={confirm} onChange={setConfirm} autoComplete="new-password" />
      <button className={styles.submit} disabled={busy}><span aria-live="polite">{busy ? 'Creando tu solicitud…' : 'Crear mi cuenta'}</span></button>
    </form>
    <Link href="/login" className={styles.backLink}>Ya tengo cuenta. Iniciar sesión</Link>
  </>;
}
