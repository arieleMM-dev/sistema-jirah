'use client';

import { useState, useEffect } from 'react';
import { useSession, SessionProvider } from 'next-auth/react';

function PerfilContent() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [tab, setTab] = useState<'datos' | 'password' | 'preferencias'>('datos');

  // CU-02.1 — Actualizar datos
  const [telefono, setTelefono] = useState('');
  const [savingDatos, setSavingDatos] = useState(false);
  const [toastDatos, setToastDatos] = useState('');

  // CU-02.2 — Cambiar contraseña
  const [pwForm, setPwForm] = useState({ current: '', new: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [pwOk, setPwOk] = useState(false);

  // CU-02.3 — Preferencias (tema)
  const [tema, setTema] = useState<'CLARO' | 'OSCURO'>('OSCURO');

  // Avatar local simulation (UI only for now)
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  
  useEffect(() => {
    // Load local avatar from localStorage if available
    const savedAvatar = localStorage.getItem('jirah-avatar');
    if (savedAvatar) setLocalAvatar(savedAvatar);
    
    fetch('/api/perfil').then(r => r.json()).then(d => {
      setTelefono(d.user?.telefono ?? '');
      setTema(d.user?.tema ?? 'OSCURO');
      if (d.user?.avatar) {
        setLocalAvatar(d.user.avatar);
        localStorage.setItem('jirah-avatar', d.user.avatar);
      }
    });
  }, []);

  // Aplicar tema al DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema === 'CLARO' ? 'light' : 'dark');
    localStorage.setItem('jirah-tema', tema);
  }, [tema]);

  async function saveDatos(e: React.FormEvent) {
    e.preventDefault();
    const tel = telefono.trim();
    if (tel && !/^09\d{8}$/.test(tel)) {
      setToastDatos('error:El teléfono debe tener 10 dígitos y empezar con 09');
      return;
    }
    setSavingDatos(true);
    const res = await fetch('/api/perfil', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefono }),
    });
    setSavingDatos(false);
    if (res.ok) {
      setToastDatos('ok:Datos actualizados correctamente');
    } else {
      const d = await res.json();
      setToastDatos(`error:${d.error}`);
    }
    setTimeout(() => setToastDatos(''), 3500);
  }

  async function saveTema(newTema: 'CLARO' | 'OSCURO') {
    setTema(newTema);
    // Optimistic update — guardamos localmente y sincronizamos en segundo plano (CU-02.3)
    await fetch('/api/perfil', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tema: newTema }),
    }).catch(() => {/* Si no hay internet, el localStorage persiste */});
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError('');
    if (pwForm.new !== pwForm.confirm) { setPwError('Las contraseñas nuevas no coinciden'); return; }
    setSavingPw(true);
    const res = await fetch('/api/perfil', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.new }),
    });
    const data = await res.json();
    setSavingPw(false);
    if (res.ok) {
      setPwOk(true);
      setPwForm({ current: '', new: '', confirm: '' });
      setTimeout(() => setPwOk(false), 4000);
    } else {
      setPwError(data.error);
    }
  }

  const initials = user ? `${user.nombres?.[0] ?? ''}${user.apellidos?.[0] ?? ''}`.toUpperCase() : '?';
  const [toastType, toastMsg] = toastDatos.startsWith('ok:') ? ['success', toastDatos.slice(3)] : toastDatos.startsWith('error:') ? ['error', toastDatos.slice(6)] : ['', ''];

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Toast */}
      {toastDatos && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5">
          <div className={`px-4 py-3 rounded-lg shadow-lg font-medium text-sm flex items-center gap-2 ${toastType === 'success' ? 'bg-agri-green-main text-white' : 'bg-red-600 text-white'}`}>
            {toastMsg}
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-agri-green-dark dark:text-white tracking-tight">Mi Perfil</h1>
        <p className="text-sm text-agri-slate dark:text-gray-400 mt-1">Gestiona tu información personal y preferencias — CU-02</p>
      </div>

      {/* Avatar + info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 flex items-center gap-6">
        <div className="flex-shrink-0 w-20 h-20 rounded-full bg-agri-green-main text-white flex items-center justify-center text-3xl font-bold shadow-sm overflow-hidden">
          {localAvatar ? (
            <img src={localAvatar} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div>
          <h2 className="text-xl font-bold text-agri-green-dark dark:text-white mb-1">{user?.nombres} {user?.apellidos}</h2>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-agri-green-main/10 text-agri-green-dark dark:bg-agri-green-main/20 dark:text-emerald-400 border border-agri-green-main/20 dark:border-emerald-800">
              {user?.rol}
            </span>
            <span className="text-sm text-agri-slate dark:text-gray-400 font-mono">{user?.email}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg">
        {[
          { key: 'datos', label: 'Datos de Contacto' },
          { key: 'password', label: 'Contraseña' },
          { key: 'preferencias', label: 'Preferencias' },
        ].map(t => (
          <button
            key={t.key}
            className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-md transition-all ${tab === t.key ? 'bg-white dark:bg-gray-800 text-agri-green-dark dark:text-white shadow-sm' : 'text-agri-slate hover:text-agri-green-dark dark:text-gray-400 dark:hover:text-gray-200'}`}
            onClick={() => setTab(t.key as any)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* CU-02.1 — Datos mutables */}
      {tab === 'datos' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
          <h3 className="text-lg font-bold text-agri-green-dark dark:text-white mb-6">Datos de Contacto</h3>
          <form onSubmit={saveDatos} id="form-perfil-datos" className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-agri-green-dark dark:text-gray-300 mb-2">Nombres (bloqueado)</label>
                <input className="min-h-[44px] w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 text-sm text-agri-slate cursor-not-allowed" value={user?.nombres ?? ''} readOnly />
              </div>
              <div>
                <label className="block text-sm font-medium text-agri-green-dark dark:text-gray-300 mb-2">Apellidos (bloqueado)</label>
                <input className="min-h-[44px] w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 text-sm text-agri-slate cursor-not-allowed" value={user?.apellidos ?? ''} readOnly />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-agri-green-dark dark:text-gray-300 mb-2">Cédula (bloqueada)</label>
              <input className="min-h-[44px] w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 text-sm text-agri-slate cursor-not-allowed font-mono" value="**********" readOnly />
            </div>
            <div>
              <label htmlFor="telefono" className="block text-sm font-medium text-agri-green-dark dark:text-gray-300 mb-2">Teléfono</label>
              <input id="telefono" type="tel" className="min-h-[44px] w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-agri-green-main focus:border-agri-green-main transition-colors" placeholder="Ej: 0987654321"
                value={telefono} onChange={e => setTelefono(e.target.value.replace(/\D/g, ''))} />
              <p className="text-xs text-agri-slate dark:text-gray-400 mt-1.5">Solo dígitos, 10 caracteres empezando con 09</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-agri-green-dark dark:text-gray-300 mb-2">Avatar / Foto</label>
              <div 
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 flex flex-col items-center justify-center text-agri-slate dark:text-gray-400 cursor-pointer hover:border-agri-green-main hover:text-agri-green-main transition-colors bg-gray-50 dark:bg-gray-800/50"
                onClick={() => document.getElementById('avatar-upload')?.click()}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mb-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <p className="text-sm font-medium">Haz clic aquí para cambiar tu foto</p>
                <p className="text-xs mt-1">PNG o JPG — máximo 2MB</p>
                <input 
                  id="avatar-upload" 
                  type="file" 
                  accept="image/png, image/jpeg" 
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 2 * 1024 * 1024) {
                        setToastDatos('error:La imagen supera los 2MB permitidos');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onloadend = async () => {
                        const b64 = reader.result as string;
                        setLocalAvatar(b64);
                        
                        // CU-02.1: Persistir en servidor
                        const res = await fetch('/api/perfil', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ avatar: b64 }),
                        });
                        
                        if (res.ok) {
                          localStorage.setItem('jirah-avatar', b64);
                          setToastDatos('ok:Avatar actualizado correctamente');
                        } else {
                          const errorData = await res.json();
                          setToastDatos(`error:${errorData.error}`);
                          setLocalAvatar(localStorage.getItem('jirah-avatar')); // Revertir
                        }
                        setTimeout(() => setToastDatos(''), 3500);
                      };
                      reader.readAsDataURL(file);
                    }
                  }} 
                />
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
              <button id="btn-guardar-datos" type="submit" className="inline-flex items-center justify-center min-h-[44px] px-6 text-sm font-bold text-white bg-agri-green-main hover:bg-agri-green-dark rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed" disabled={savingDatos}>
                {!savingDatos && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>}
                {savingDatos ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CU-02.2 — Cambiar contraseña */}
      {tab === 'password' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
          <h3 className="text-lg font-bold text-agri-green-dark dark:text-white mb-2">Cambiar Contraseña</h3>
          <p className="text-sm text-agri-slate dark:text-gray-400 mb-6">Mínimo 8 caracteres, 1 mayúscula y 1 número</p>

          {pwOk && (
            <div className="flex items-center gap-2 p-4 mb-6 text-sm font-medium text-agri-green-dark bg-agri-green-main/10 rounded-lg border border-agri-green-main/20 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              Contraseña actualizada exitosamente
            </div>
          )}

          <form onSubmit={savePassword} id="form-cambiar-password" className="space-y-5">
            {pwError && <div className="p-4 rounded-lg bg-red-50 text-red-600 text-sm font-medium border border-red-200 dark:bg-red-900/30 dark:border-red-900/50 dark:text-red-400">{pwError}</div>}
            
            <div>
              <label htmlFor="current-pw" className="block text-sm font-medium text-agri-green-dark dark:text-gray-300 mb-2">Contraseña actual</label>
              <input id="current-pw" type="password" className="min-h-[44px] w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-agri-green-main focus:border-agri-green-main transition-colors" placeholder="••••••••"
                value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} required />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label htmlFor="new-pw" className="block text-sm font-medium text-agri-green-dark dark:text-gray-300 mb-2">Nueva contraseña</label>
                <input id="new-pw" type="password" className="min-h-[44px] w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-agri-green-main focus:border-agri-green-main transition-colors" placeholder="••••••••"
                  value={pwForm.new} onChange={e => setPwForm(f => ({ ...f, new: e.target.value }))} required />
              </div>
              <div>
                <label htmlFor="confirm-pw" className="block text-sm font-medium text-agri-green-dark dark:text-gray-300 mb-2">Confirmar contraseña</label>
                <input id="confirm-pw" type="password" className="min-h-[44px] w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-agri-green-main focus:border-agri-green-main transition-colors" placeholder="••••••••"
                  value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} required />
                {pwForm.new && pwForm.confirm && pwForm.new !== pwForm.confirm && (
                  <p className="text-xs text-red-500 mt-1.5 font-medium">Las contraseñas no coinciden</p>
                )}
              </div>
            </div>
            
            <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
              <button id="btn-cambiar-password" type="submit" className="inline-flex items-center justify-center min-h-[44px] px-6 text-sm font-bold text-white bg-agri-green-main hover:bg-agri-green-dark rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed" disabled={savingPw}>
                {!savingPw && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
                {savingPw ? 'Actualizando...' : 'Actualizar contraseña'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CU-02.3 — Preferencias */}
      {tab === 'preferencias' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
          <h3 className="text-lg font-bold text-agri-green-dark dark:text-white mb-6">Preferencias de Apariencia</h3>
          <p className="block text-sm font-medium text-agri-green-dark dark:text-gray-300 mb-4">Tema de la interfaz</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(['OSCURO', 'CLARO'] as const).map(t => (
              <button
                key={t}
                id={`btn-tema-${t.toLowerCase()}`}
                onClick={() => saveTema(t)}
                className={`p-6 border-2 rounded-xl text-center transition-all flex flex-col items-center justify-center gap-2 ${tema === t ? 'border-agri-green-main bg-agri-green-main/5 dark:bg-agri-green-main/10' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-transparent'}`}
              >
                <div className="text-4xl mb-2">{t === 'OSCURO' ? '🌙' : '☀️'}</div>
                <div className={`font-bold text-sm ${tema === t ? 'text-agri-green-dark dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>Tema {t === 'OSCURO' ? 'Oscuro' : 'Claro'}</div>
                {tema === t && <div className="text-xs font-semibold text-agri-green-main dark:text-emerald-500 mt-1">✓ Activo</div>}
              </button>
            ))}
          </div>
          <p className="text-xs text-agri-slate dark:text-gray-400 mt-6">
            La preferencia se guarda localmente y se sincroniza con el servidor cuando hay conexión.
          </p>
        </div>
      )}
    </div>
  );
}

export default function PerfilPage() {
  return <SessionProvider><PerfilContent /></SessionProvider>;
}
