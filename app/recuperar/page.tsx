'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function RecuperarPage() {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch('/api/auth/recuperar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      // Siempre mostrar confirmación por seguridad
      setEnviado(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-hero">
        <div className="auth-hero-logo">
          <div className="auth-hero-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              <circle cx="12" cy="9" r="2.5"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '2px' }}>Sistema Agrícola</div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Finca <span style={{ color: 'var(--emerald-400)' }}>Jirah</span></div>
          </div>
        </div>
        <h1 className="auth-hero-title">Recupera<br />tu acceso<br />al sistema</h1>
        <p className="auth-hero-subtitle">
          Recibirás un enlace en tu correo registrado. El enlace es válido por 1 hora por seguridad.
        </p>
      </div>

      <div className="auth-form-panel">
        <div className="auth-form-card">
          {!enviado ? (
            <>
              <div className="auth-form-header">
                <Link href="/login" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.875rem', textDecoration: 'none', marginBottom: '1.5rem' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                  Volver al inicio de sesión
                </Link>
                <h2 className="auth-form-title">¿Olvidaste tu contraseña?</h2>
                <p className="auth-form-desc">Ingresa tu correo electrónico y te enviaremos un enlace de recuperación.</p>
              </div>

              <form onSubmit={handleSubmit} id="recuperar-form">
                <div className="form-group">
                  <label htmlFor="email-recuperar" className="form-label">Correo electrónico</label>
                  <input
                    id="email-recuperar"
                    type="email"
                    className="form-input"
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <button
                  id="btn-enviar-enlace"
                  type="submit"
                  className={`btn btn-primary btn-full ${loading ? 'btn-loading' : ''}`}
                  disabled={loading}
                >
                  {!loading && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                    </svg>
                  )}
                  {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                </button>
              </form>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--emerald-400)" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <h2 style={{ marginBottom: '0.75rem' }}>Revisa tu correo</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.6 }}>
                Si el correo es válido, recibirás un enlace de recuperación en los próximos minutos. El enlace expira en <strong>1 hora</strong>.
              </p>
              <Link href="/login" className="btn btn-secondary" style={{ display: 'inline-flex' }}>
                Volver al inicio de sesión
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
