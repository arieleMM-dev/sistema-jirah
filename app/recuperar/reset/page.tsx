'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Circle, LoaderCircle, ShieldCheck } from 'lucide-react';
import PasswordField from '../../ui/auth/PasswordField';
import styles from '../../ui/auth/auth.module.css';
import { validatePassword } from '@/lib/password-policy';

function subscribeToken(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}
function readToken() { return new URLSearchParams(window.location.hash.slice(1)).get('token'); }
function serverToken() { return undefined; }

function ResetForm() {
  const token = useSyncExternalStore(subscribeToken, readToken, serverToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const feedbackRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (error || success) feedbackRef.current?.focus(); }, [error, success]);
  const requirements = [
    { label: 'Al menos 15 caracteres', met: Array.from(password).length >= 15 },
    { label: 'Hasta 72 bytes', met: new TextEncoder().encode(password).length <= 72 },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!token) { setError('Enlace inválido o sin token. Solicita un nuevo enlace.'); return; }
    const policy = validatePassword(password);
    if (!policy.ok) { setError(policy.mensaje ?? 'Elige una contraseña segura.'); return; }
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden. Revisa ambos campos.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, newPassword: password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'No se pudo guardar la contraseña. Solicita un nuevo enlace o inténtalo más tarde.');
      }
      setSuccess(true);
      window.history.replaceState(null, '', window.location.pathname);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo conectar. Revisa tu conexión e intenta nuevamente.');
    } finally { setLoading(false); }
  }

  if (success) return (
    <div ref={feedbackRef} tabIndex={-1} role="status">
      <div className={styles.successIcon}><ShieldCheck size={28} aria-hidden="true" /></div>
      <h1 className={styles.title}>Contraseña actualizada</h1>
      <p className={styles.description}>Tu nueva contraseña está lista. Inicia sesión para volver al trabajo de la finca.</p>
      <Link href="/login" className={styles.submit}>Ir a iniciar sesión<ArrowRight size={18} aria-hidden="true" /></Link>
    </div>
  );

  if (token === undefined) return <p className={styles.description} role="status">Cargando formulario…</p>;
  if (!token) return (
    <>
      <h1 className={styles.title}>Necesitas un nuevo enlace</h1>
      <p className={styles.description}>Este enlace está incompleto. Solicita otro enlace de recuperación con el correo de tu cuenta.</p>
      <Link href="/recuperar" className={styles.submit}>Solicitar enlace<ArrowRight size={18} aria-hidden="true" /></Link>
    </>
  );

  return (
    <>
      <Link href="/login" className={styles.backLink}><ArrowLeft size={16} aria-hidden="true" />Volver al inicio de sesión</Link>
      <h1 className={styles.title}>Nueva contraseña</h1>
      <p className={styles.description}>Elige una contraseña segura para volver a tu cuenta.</p>
      {error && <div ref={feedbackRef} id="reset-error" tabIndex={-1} role="alert" className={styles.error}>{error}</div>}
      <form onSubmit={handleSubmit} id="reset-form" className={styles.form} aria-busy={loading}>
        <PasswordField id="new-password" label="Nueva contraseña" value={password} onChange={setPassword} autoComplete="new-password" describedBy={error ? 'reset-error password-requirements' : 'password-requirements'} />
        <ul id="password-requirements" className={styles.requirements} aria-label="Requisitos de contraseña">
          {requirements.map(item => <li key={item.label} className={item.met ? styles.met : undefined}>
            {item.met ? <Check size={14} aria-hidden="true" /> : <Circle size={12} aria-hidden="true" />}<span>{item.label}<span className="sr-only">{item.met ? ', cumplido' : ', pendiente'}</span></span>
          </li>)}
        </ul>
        <PasswordField id="confirm-password" label="Confirmar contraseña" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" describedBy={error ? 'reset-error' : undefined} invalid={!!error && password !== confirmPassword} />
        <button id="btn-reset-password" type="submit" disabled={loading} className={styles.submit}>
          <span aria-live="polite">{loading ? 'Guardando…' : 'Guardar contraseña'}</span>
          {loading ? <LoaderCircle size={18} className={styles.spinner} aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
        </button>
        <Link href="/recuperar" className={styles.recoveryLink}>Solicitar un nuevo enlace</Link>
      </form>
    </>
  );
}

export default function ResetPage() {
  return <ResetForm />;
}
