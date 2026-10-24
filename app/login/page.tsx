'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import PasswordField from '../ui/auth/PasswordField';
import styles from '../ui/auth/auth.module.css';
import { clearOfflineAccess } from '@/lib/auth/offline-session';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await signIn('credentials', { email, password, redirect: false });
      if (result?.error) {
        if (result.error === 'ACCESO_LIMITE') {
          setError('Demasiados intentos. Espere 15 minutos antes de volver a ingresar.');
        } else if (result.error === 'ACCOUNT_INACTIVE') {
          setError('Su cuenta se encuentra desactivada. Comuníquese con el administrador.');
        } else {
          setError('Correo o contraseña incorrectos');
        }
      } else if (result?.ok) {
        clearOfflineAccess();
        const res = await fetch('/api/auth/session', { cache: 'no-store' });
        if (!res.ok) throw new Error('No se pudo obtener la sesión');
        const data = await res.json();
        if (!data.user?.id) throw new Error('No se pudo obtener la sesión');
        router.replace(data.user.estadoAcceso !== 'APROBADO' ? '/bienvenida'
          : data.user.rol === 'ADMIN' ? '/dashboard' : '/dashboard/campo/pesaje');
      } else {
        setError('No se pudo iniciar sesión. Compruebe la conexión.');
      }
    } catch {
      setError('No se pudo iniciar sesión. Compruebe la conexión.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className={styles.title}>Iniciar Sesión</h1>
      <p className={styles.description}>Tu cosecha, de principio a fin.<br />Ingresa para continuar con el trabajo de la finca.</p>
      {error && <div id="login-error" ref={errorRef} tabIndex={-1} role="alert" className={styles.error}>{error}</div>}
      <form onSubmit={handleSubmit} className={styles.form} aria-busy={loading}>
        <div className={styles.field}>
          <label htmlFor="email">Correo electrónico</label>
          <input id="email" name="email" type="email" inputMode="email" autoComplete="username" spellCheck={false} autoCapitalize="none" placeholder="nombre@correo.com" value={email} onChange={e => setEmail(e.target.value)} required maxLength={254} aria-describedby={error ? 'login-error' : undefined} className={styles.input} />
        </div>
        <PasswordField id="password" label="Contraseña" value={password} onChange={setPassword} autoComplete="current-password" describedBy={error ? 'login-error' : undefined} />
        <Link href="/recuperar" className={styles.recoveryLink}>¿Olvidaste tu contraseña?</Link>
        <button type="submit" disabled={loading} className={styles.submit}>
          <span aria-live="polite">{loading ? 'Ingresando…' : 'Ingresar al Sistema'}</span>
          {loading ? <LoaderCircle size={18} className={styles.spinner} aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
        </button>
      </form>
      <p className={styles.accessNote}>¿Todavía no tienes cuenta? <Link href="/registro" className={styles.backLink}>Solicitar acceso</Link></p>
    </>
  );
}
