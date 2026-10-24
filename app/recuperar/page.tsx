'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, LoaderCircle, MailCheck } from 'lucide-react';
import styles from '../ui/auth/auth.module.css';

export default function RecuperarPage() {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const feedbackRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (error || enviado) feedbackRef.current?.focus(); }, [error, enviado]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/recuperar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        setError(response.status === 429 ? 'Demasiados intentos. Espera unos minutos antes de solicitar otro enlace.' : 'No se pudo solicitar el enlace. Inténtalo más tarde o contacta al administrador.');
        return;
      }
      // La confirmación no revela si existe una cuenta con este correo.
      setEnviado(true);
    } catch {
      setError('No se pudo conectar. Revisa tu conexión e intenta nuevamente.');
    } finally { setLoading(false); }
  }

  return (
    <>
      <Link href="/login" className={styles.backLink}><ArrowLeft size={16} aria-hidden="true" />Volver al inicio de sesión</Link>
      {enviado ? (
        <div ref={feedbackRef} tabIndex={-1} role="status">
          <div className={styles.successIcon}><MailCheck size={28} aria-hidden="true" /></div>
          <h1 className={styles.title}>Revisa tu correo</h1>
          <p className={styles.description}>Si el correo corresponde a una cuenta activa, recibirás un enlace para crear una nueva contraseña. El enlace es válido por 1 hora.</p>
          <p className={styles.hint}>Si no lo encuentras, revisa la carpeta de spam o comunícate con el administrador.</p>
        </div>
      ) : (
        <>
          <h1 className={styles.title}>Recupera tu acceso</h1>
          <p className={styles.description}>Ingresa el correo de tu cuenta para solicitar un enlace de recuperación.</p>
          {error && <div ref={feedbackRef} id="recovery-error" tabIndex={-1} role="alert" className={styles.error}>{error}</div>}
          <form onSubmit={handleSubmit} id="recuperar-form" className={styles.form} aria-busy={loading}>
            <div className={styles.field}>
              <label htmlFor="email-recuperar">Correo electrónico</label>
              <input id="email-recuperar" name="email" type="email" autoComplete="email" inputMode="email" spellCheck={false} autoCapitalize="none" placeholder="nombre@correo.com" value={email} onChange={e => setEmail(e.target.value)} required maxLength={254} aria-describedby={error ? 'recovery-error' : undefined} className={styles.input} />
            </div>
            <button id="btn-enviar-enlace" type="submit" disabled={loading} className={styles.submit}>
              <span aria-live="polite">{loading ? 'Enviando…' : 'Enviar enlace de recuperación'}</span>
              {loading ? <LoaderCircle size={18} className={styles.spinner} aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
            </button>
          </form>
        </>
      )}
    </>
  );
}
