'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
);
const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
);

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  let strengthScore = 0;
  if (password.length >= 8) strengthScore += 1;
  if (/[A-Z]/.test(password)) strengthScore += 1;
  if (/\d/.test(password)) strengthScore += 1;

  let strengthLabel = 'Muy débil';
  let strengthColor = 'var(--zinc-300)';
  if (password.length > 0) {
    if (strengthScore === 1) { strengthLabel = 'Débil'; strengthColor = 'var(--red-400)'; }
    if (strengthScore === 2) { strengthLabel = 'Media'; strengthColor = 'var(--amber-400)'; }
    if (strengthScore === 3) { strengthLabel = 'Fuerte'; strengthColor = 'var(--emerald-500)'; }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Enlace inválido o sin token.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al restablecer la contraseña.');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: '1rem 0' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--emerald-400)" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
          </svg>
        </div>
        <h2 style={{ marginBottom: '0.75rem' }}>¡Contraseña actualizada!</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.6 }}>
          Tu contraseña ha sido restablecida exitosamente. Ahora puedes iniciar sesión con tu nueva credencial.
        </p>
        <Link href="/login" className="btn btn-primary" style={{ display: 'inline-flex' }}>
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="auth-form-header">
        <h2 className="auth-form-title">Nueva contraseña</h2>
        <p className="auth-form-desc">Ingresa tu nueva contraseña para acceder al sistema.</p>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} id="reset-form">
        <div className="form-group" style={{ position: 'relative' }}>
          <label htmlFor="new-password" className="form-label">Nueva contraseña</label>
          <div style={{ position: 'relative' }}>
            <input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              placeholder="Mínimo 8 caracteres, 1 mayúscula, 1 número"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoFocus
              style={{ paddingRight: '40px', transition: 'border-color 0.2s, box-shadow 0.2s' }}
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          
          {/* Indicador de Fortaleza */}
          <div style={{ marginTop: '8px', display: 'flex', gap: '4px', height: '4px' }}>
             <div style={{ flex: 1, background: password.length > 0 ? strengthColor : 'var(--border)', borderRadius: '2px', transition: 'all 0.3s' }}></div>
             <div style={{ flex: 1, background: strengthScore >= 2 ? strengthColor : 'var(--border)', borderRadius: '2px', transition: 'all 0.3s' }}></div>
             <div style={{ flex: 1, background: strengthScore >= 3 ? strengthColor : 'var(--border)', borderRadius: '2px', transition: 'all 0.3s' }}></div>
          </div>
          <div style={{ fontSize: '0.75rem', color: strengthColor, marginTop: '4px', textAlign: 'right', fontWeight: 500, minHeight: '16px' }}>
             {password.length > 0 ? strengthLabel : ''}
          </div>
        </div>

        <div className="form-group" style={{ position: 'relative' }}>
          <label htmlFor="confirm-password" className="form-label">Confirmar contraseña</label>
          <div style={{ position: 'relative' }}>
            <input
              id="confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              className="form-input"
              placeholder="Repite tu nueva contraseña"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              style={{ paddingRight: '40px', transition: 'border-color 0.2s, box-shadow 0.2s' }}
            />
            <button 
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
            >
              {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>
        <button
          id="btn-reset-password"
          type="submit"
          className={`btn btn-primary btn-full ${loading ? 'btn-loading' : ''}`}
          disabled={loading || !token}
        >
          {loading ? 'Guardando...' : 'Guardar contraseña'}
        </button>
      </form>
    </>
  );
}

export default function ResetPage() {
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
        <h1 className="auth-hero-title">Restablece<br />tu contraseña</h1>
        <p className="auth-hero-subtitle">
          Crea una nueva contraseña segura para proteger tu cuenta y tus datos agrícolas.
        </p>
      </div>

      <div className="auth-form-panel">
        <div className="auth-form-card">
          <Suspense fallback={<div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Cargando...</div>}>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
