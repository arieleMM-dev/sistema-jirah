'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Agricultor = {
  id: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  email: string;
  telefono: string | null;
  rol: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

export default function AgricultorDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [agricultor, setAgricultor] = useState<Agricultor | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [form, setForm] = useState({ nombres: '', apellidos: '', email: '', telefono: '' });
  const [formError, setFormError] = useState('');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetch(`/api/agricultores/${id}`)
      .then(r => r.json())
      .then(d => {
        setAgricultor(d.agricultor);
        setForm({
          nombres: d.agricultor.nombres,
          apellidos: d.agricultor.apellidos,
          email: d.agricultor.email,
          telefono: d.agricultor.telefono || '',
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    setSaving(true);
    setFormError('');
    try {
      const res = await fetch(`/api/agricultores/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error); return; }
      setAgricultor(prev => prev ? { ...prev, ...form } : prev);
      setEditMode(false);
      showToast('Expediente actualizado');
    } finally {
      setSaving(false);
    }
  }

  async function handleDesactivar() {
    setSaving(true);
    try {
      const res = await fetch(`/api/agricultores/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { showToast(data.error, 'error'); setShowModal(false); return; }
      showToast('Cuenta desactivada exitosamente');
      setShowModal(false);
      setTimeout(() => window.location.reload(), 1500);
    } finally {
      setSaving(false);
    }
  }

  async function handleReactivar() {
    setSaving(true);
    try {
      const res = await fetch(`/api/agricultores/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reactivar' }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error, 'error'); return; }
      showToast('Cuenta reactivada exitosamente');
      setAgricultor(prev => prev ? { ...prev, isActive: true } : prev);
    } finally {
      setSaving(false);
    }
  }

  const rolLabel = (r: string) =>
    ({ AGRICULTOR: 'Agricultor', CLASIFICADOR: 'Clasificador', ADMIN: 'Administrador' }[r] ?? r);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--emerald-500)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 1rem' }} />
          Cargando expediente...
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!agricultor) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👤</div>
        <p>Agricultor no encontrado.</p>
        <Link href="/dashboard/personal" className="btn btn-secondary" style={{ display: 'inline-flex', marginTop: '1rem' }}>
          Volver
        </Link>
      </div>
    );
  }

  const initials = `${agricultor.nombres[0]}${agricultor.apellidos[0]}`.toUpperCase();

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>
            {toast.type === 'success' && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            {toast.msg}
          </div>
        </div>
      )}

      {/* Encabezado */}
      <div className="page-header">
        <div>
          <Link href="/dashboard/personal" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.875rem', textDecoration: 'none', marginBottom: '0.75rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Volver a Personal
          </Link>
          <h1>Expediente del Trabajador</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>CU-03.2/3/4 — Ver, editar y gestionar cuenta</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {!editMode && agricultor.isActive && (
            <button id="btn-editar" className="btn btn-secondary btn-sm" onClick={() => setEditMode(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Editar Datos
            </button>
          )}
          {agricultor.isActive ? (
            <button id="btn-desactivar" className="btn btn-danger btn-sm" onClick={() => setShowModal(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              Desactivar Cuenta
            </button>
          ) : (
            <button id="btn-reactivar" className="btn btn-emerald btn-sm" onClick={handleReactivar} style={{ background: 'var(--emerald-500)', color: 'white' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Reactivar Cuenta
            </button>
          )}
        </div>
      </div>

      {/* Perfil card */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.75rem' }}>
          <div className="user-avatar" style={{
            width: 72, height: 72, fontSize: '1.5rem',
            border: `3px solid ${agricultor.isActive ? 'var(--emerald-500)' : 'var(--gray-600)'}`,
            boxShadow: agricultor.isActive ? '0 0 20px rgba(16,185,129,0.25)' : 'none',
          }}>
            {initials}
          </div>
          <div>
            <h2 style={{ marginBottom: '0.25rem' }}>{agricultor.nombres} {agricultor.apellidos}</h2>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span className={`badge ${agricultor.rol === 'AGRICULTOR' ? 'badge-emerald' : 'badge-blue'}`}>
                {rolLabel(agricultor.rol)}
              </span>
              <span className={`badge ${agricultor.isActive ? 'badge-emerald' : 'badge-red'}`}>
                {agricultor.isActive ? 'Cuenta activa' : 'Cuenta inactiva'}
              </span>
            </div>
          </div>
        </div>

        {/* Datos bloqueados */}
        <div style={{ marginBottom: '1.25rem' }}>
          <p className="form-label" style={{ marginBottom: '0.75rem' }}>Datos estructurales (bloqueados)</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <p className="form-label" style={{ fontSize: '0.7rem' }}>Cédula</p>
              <input className="form-input form-input-readonly" value={agricultor.cedula} readOnly />
            </div>
            <div>
              <p className="form-label" style={{ fontSize: '0.7rem' }}>Rol de Campo</p>
              <input className="form-input form-input-readonly" value={rolLabel(agricultor.rol)} readOnly />
            </div>
          </div>
        </div>

        <div className="divider" />

        {/* Datos editables */}
        <div>
          <p className="form-label" style={{ marginBottom: '0.75rem' }}>
            Datos modificables
            {editMode && (
              <span style={{ color: 'var(--emerald-400)', marginLeft: '0.5rem', fontWeight: 400 }}>
                — Modo edición activo
              </span>
            )}
          </p>

          {formError && (
            <div className="form-error" style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {formError}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label className="form-label" style={{ fontSize: '0.7rem' }}>Nombres</label>
              <input
                className={`form-input ${!editMode ? 'form-input-readonly' : ''}`}
                value={editMode ? form.nombres : agricultor.nombres}
                onChange={e => setForm(f => ({ ...f, nombres: e.target.value }))}
                readOnly={!editMode}
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '0.7rem' }}>Apellidos</label>
              <input
                className={`form-input ${!editMode ? 'form-input-readonly' : ''}`}
                value={editMode ? form.apellidos : agricultor.apellidos}
                onChange={e => setForm(f => ({ ...f, apellidos: e.target.value }))}
                readOnly={!editMode}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label className="form-label" style={{ fontSize: '0.7rem' }}>Correo electrónico</label>
              <input
                className={`form-input ${!editMode ? 'form-input-readonly' : ''}`}
                type="email"
                value={editMode ? form.email : agricultor.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                readOnly={!editMode}
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '0.7rem' }}>Teléfono</label>
              <input
                className={`form-input ${!editMode ? 'form-input-readonly' : ''}`}
                type="text"
                value={editMode ? form.telefono : (agricultor.telefono || '')}
                onChange={e => setForm(f => ({ ...f, telefono: e.target.value.replace(/\D/g, '') }))}
                readOnly={!editMode}
              />
            </div>
          </div>

          {editMode && (
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setEditMode(false);
                  setFormError('');
                  setForm({ nombres: agricultor.nombres, apellidos: agricultor.apellidos, email: agricultor.email, telefono: agricultor.telefono || '' });
                }}
              >
                Cancelar
              </button>
              <button
                id="btn-actualizar"
                className={`btn btn-primary btn-sm ${saving ? 'btn-loading' : ''}`}
                onClick={handleSave}
                disabled={saving}
              >
                {!saving && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {saving ? 'Actualizando...' : 'Actualizar'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Información del sistema */}
      <div className="card">
        <h4 style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Información del sistema
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {[
            {
              label: 'Último acceso',
              value: agricultor.lastLoginAt
                ? new Date(agricultor.lastLoginAt).toLocaleString('es-EC')
                : 'Nunca ha iniciado sesión',
            },
            {
              label: 'Miembro desde',
              value: new Date(agricultor.createdAt).toLocaleDateString('es-EC', {
                year: 'numeric', month: 'long', day: 'numeric',
              }),
            },
          ].map(item => (
            <div key={item.label}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {item.label}
              </p>
              <p style={{ fontSize: '0.9rem' }}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de confirmación */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--red-400)" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3 className="modal-title">¿Está seguro?</h3>
            <p className="modal-desc">
              Este usuario no podrá acceder al sistema, pero su <strong>historial de cosechas se mantendrá intacto</strong>. Esta acción puede revertirse contactando al administrador.
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button
                id="btn-confirmar-desactivar"
                className={`btn btn-danger ${saving ? 'btn-loading' : ''}`}
                onClick={handleDesactivar}
                disabled={saving}
              >
                {saving ? 'Procesando...' : 'Desactivar cuenta'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
