'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function validarCedulaFrontend(cedula: string): boolean {
  if (!/^\d{10}$/.test(cedula)) return false;
  const prov = parseInt(cedula.substring(0, 2));
  if (prov < 1 || prov > 24) return false;
  const coef = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let v = parseInt(cedula[i]) * coef[i];
    if (v > 9) v -= 9;
    suma += v;
  }
  const res = suma % 10;
  const dv = res === 0 ? 0 : 10 - res;
  return dv === parseInt(cedula[9]);
}

export default function NuevoAgricultorPage() {
  const router = useRouter();
  const [form, setForm] = useState({ nombres: '', apellidos: '', cedula: '', email: '', telefono: '', rol: 'AGRICULTOR' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ password: string } | null>(null);

  const update = (field: string, val: string) => {
    setForm(f => ({ ...f, [field]: val }));
    setErrors(e => ({ ...e, [field]: '' }));
  };

  function validate(): boolean {
    const e: Record<string, string> = {};
    
    const nom = form.nombres.trim();
    if (!nom || !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nom) || nom.length < 2 || nom.length > 50) {
      e.nombres = 'Este campo solo puede contener letras y espacios (2-50 caracteres)';
    }

    const ape = form.apellidos.trim();
    if (!ape || !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(ape) || ape.length < 2 || ape.length > 50) {
      e.apellidos = 'Este campo solo puede contener letras y espacios (2-50 caracteres)';
    }

    const correo = form.email.trim();
    if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) || correo.length > 100) {
      e.email = 'Ingrese una dirección de correo electrónico válida (max 100 caracteres)';
    }

    if (!validarCedulaFrontend(form.cedula)) {
      e.cedula = 'El documento de identidad no es válido';
    }

    const tel = form.telefono.trim();
    if (tel && !/^09\d{8}$/.test(tel)) {
      e.telefono = 'El teléfono debe tener 10 dígitos y empezar con 09';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    
    const body = {
      nombres: form.nombres.trim(),
      apellidos: form.apellidos.trim(),
      cedula: form.cedula,
      email: form.email.trim(),
      telefono: form.telefono.trim() || undefined,
      rol: form.rol
    };

    try {
      const res = await fetch('/api/agricultores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors({ general: data.error ?? 'Error al crear agricultor' });
        return;
      }
      setSuccessInfo({ password: data._dev_password ?? '(enviada por correo)' });
    } finally {
      setLoading(false);
    }
  }

  if (successInfo) {
    return (
      <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center', padding: '2rem 0' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--emerald-400)" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 style={{ marginBottom: '0.75rem' }}>Agricultor creado exitosamente</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          La cuenta fue creada. La contraseña temporal es:
        </p>
        <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem 1.5rem', marginBottom: '2rem', fontFamily: 'monospace', fontSize: '1.25rem', letterSpacing: '0.1em', color: 'var(--emerald-400)', fontWeight: 700 }}>
          {successInfo.password}
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
          En producción, esta contraseña se envía automáticamente al correo registrado.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={() => { setSuccessInfo(null); setForm({ nombres: '', apellidos: '', cedula: '', email: '', telefono: '', rol: 'AGRICULTOR' }); }}>
            Crear otro
          </button>
          <Link href="/dashboard/personal" className="btn btn-primary">Ver personal</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <Link href="/dashboard/personal" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.875rem', textDecoration: 'none', marginBottom: '0.75rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Volver a Personal
          </Link>
          <h1>Nuevo Registro</h1>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} id="form-nuevo-agricultor" noValidate>
          {errors.general && (
            <div className="form-error" style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {errors.general}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="user-avatar" style={{ width: 64, height: 64, fontSize: '1.25rem', background: 'var(--bg-card)', border: '2px dashed var(--border-color)', color: 'var(--text-muted)' }}>
              {form.nombres || form.apellidos ? `${form.nombres.charAt(0)}${form.apellidos.charAt(0)}`.toUpperCase() : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>}
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>Avatar generado</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Vista previa del perfil del agricultor</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="nombres" className="form-label">Nombres *</label>
              <input id="nombres" type="text" className="form-input" placeholder="Ej: Carlos Eduardo"
                value={form.nombres} onChange={e => update('nombres', e.target.value)} />
              {errors.nombres && <div className="form-error">{errors.nombres}</div>}
            </div>
            <div className="form-group">
              <label htmlFor="apellidos" className="form-label">Apellidos *</label>
              <input id="apellidos" type="text" className="form-input" placeholder="Ej: Moreno Tipán"
                value={form.apellidos} onChange={e => update('apellidos', e.target.value)} />
              {errors.apellidos && <div className="form-error">{errors.apellidos}</div>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="cedula" className="form-label">Cédula de Identidad * (10 dígitos)</label>
            <input id="cedula" type="text" className="form-input" placeholder="Ej: 1723456789" maxLength={10}
              value={form.cedula} onChange={e => update('cedula', e.target.value.replace(/\D/g, ''))} />
            {errors.cedula && <div className="form-error">{errors.cedula}</div>}
            {form.cedula.length === 10 && !errors.cedula && (
              <div style={{ fontSize: '0.8rem', color: validarCedulaFrontend(form.cedula) ? 'var(--emerald-400)' : 'var(--red-400)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {validarCedulaFrontend(form.cedula)
                  ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg> Cédula válida</>
                  : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Cédula inválida</>
                }
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="email" className="form-label">Correo electrónico *</label>
              <input id="email" type="email" className="form-input" placeholder="trabajador@fincajirah.com"
                value={form.email} onChange={e => update('email', e.target.value)} />
              {errors.email && <div className="form-error">{errors.email}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="telefono" className="form-label">Teléfono (Opcional)</label>
              <input id="telefono" type="text" className="form-input" placeholder="Ej: 0987654321"
                value={form.telefono} onChange={e => update('telefono', e.target.value.replace(/\D/g, ''))} />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="rol" className="form-label">Rol de Campo *</label>
            <select id="rol" className="form-input form-select" value={form.rol} onChange={e => update('rol', e.target.value)}>
              <option value="AGRICULTOR">Agricultor — Registra pesajes en campo</option>
              <option value="CLASIFICADOR">Clasificador — Registra clasificación poscosecha</option>
              <option value="AGRICULTOR_CLASIFICADOR">Agricultor + Clasificador — Registra ambos</option>
            </select>
          </div>

          <div className="divider" />

          <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius-md)', padding: '0.875rem 1rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', gap: '0.75rem' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold-400)" strokeWidth="2" style={{ flexShrink: 0, marginTop: '1px' }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>Se generará una <strong>contraseña temporal alfanumérica</strong> automáticamente y se enviará al correo del trabajador. El campo Cédula quedará bloqueado una vez creado el registro.</span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Link href="/dashboard/personal" className="btn btn-secondary">Cancelar</Link>
            <button id="btn-guardar-agricultor" type="submit" className={`btn btn-primary ${loading ? 'btn-loading' : ''}`} disabled={loading}>
              {!loading && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>}
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
