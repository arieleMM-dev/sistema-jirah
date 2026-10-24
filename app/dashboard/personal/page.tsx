'use client';

import Link from 'next/link';
import { usePersonal } from '@/lib/hooks/usePersonal';

export default function PersonalPage() {
  const { agricultores, query, setQuery, loading, error } = usePersonal();

  const rolBadge = (rol: string) => {
    switch(rol) {
      case 'ADMIN': return 'bg-agri-clay/15 text-agri-earth dark:bg-amber-900/30 dark:text-amber-400 border-agri-clay/30 dark:border-amber-900/50';
      case 'AGRICULTOR': return 'bg-agri-green-main/10 text-agri-green-dark dark:bg-green-900/30 dark:text-green-400 border-agri-green-main/20 dark:border-green-900/50';
      case 'CLASIFICADOR': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-900/50';
      default: return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700';
    }
  };

  const rolLabel = (rol: string) => {
    switch(rol) {
      case 'ADMIN': return 'Administrador';
      case 'AGRICULTOR':
      case 'CLASIFICADOR':
      case 'AGRICULTOR_CLASIFICADOR': return 'Personal de campo';
      default: return rol;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Gestión de Personal</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Equipo autorizado para trabajar en la finca.</p>
          <Link className="inline-flex min-h-11 items-center underline underline-offset-4" href="/dashboard/personal/solicitudes">Revisar solicitudes de acceso</Link>
        </div>
        <Link 
          href="/dashboard/personal/nuevo" 
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-6 text-sm font-semibold text-white bg-agri-green-main hover:bg-agri-green-dark rounded-lg shadow-sm hover:shadow transition-all"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo Registro
        </Link>
      </div>

      <div className="bg-white dark:bg-[#111113] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-agri-slate/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <input
              type="search"
              className="w-full pl-11 pr-4 min-h-[44px] rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-agri-green-main focus:border-agri-green-main transition-colors"
              placeholder="Buscar por nombre, apellido o cédula..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <div className="text-sm font-medium text-agri-slate dark:text-gray-400">
            {loading ? 'Buscando...' : `${agricultores.length} usuario${agricultores.length !== 1 ? 's' : ''}`}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-6 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 font-medium border-b border-red-100 dark:border-red-900/30">
            Error al cargar datos: {error}
          </div>
        )}

        {/* Table Content */}
        <div className="overflow-x-auto relative min-h-[300px]">
          {loading && agricultores.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-[#111113]/50 backdrop-blur-sm z-10">
              <div className="animate-spin h-8 w-8 border-4 border-agri-green-main border-t-transparent rounded-full" />
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="bg-agri-green-dark text-white font-semibold text-xs uppercase tracking-wider px-6 py-4 text-left">Usuario</th>
                  <th className="bg-agri-green-dark text-white font-semibold text-xs uppercase tracking-wider px-6 py-4 text-left">Cédula</th>
                  <th className="bg-agri-green-dark text-white font-semibold text-xs uppercase tracking-wider px-6 py-4 text-left">Rol Asignado</th>
                  <th className="bg-agri-green-dark text-white font-semibold text-xs uppercase tracking-wider px-6 py-4 text-left">Estado</th>
                  <th className="bg-agri-green-dark text-white font-semibold text-xs uppercase tracking-wider px-6 py-4 text-left">Último Acceso</th>
                  <th className="bg-agri-green-dark text-white font-semibold text-xs uppercase tracking-wider px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="font-medium">
                {agricultores.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-agri-slate dark:text-gray-400">
                      No se encontraron resultados para &quot;{query}&quot;
                    </td>
                  </tr>
                ) : (
                  agricultores.map(ag => (
                    <tr key={ag.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#1A1A1D] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-agri-green-main/10 text-agri-green-dark dark:bg-agri-green-main/20 dark:text-emerald-400 flex items-center justify-center font-bold text-sm ring-1 ring-agri-green-main/20">
                            {ag.nombres[0]}{ag.apellidos[0]}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-gray-200">{ag.nombres} {ag.apellidos}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{ag.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-agri-slate dark:text-gray-400">{ag.cedula}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${rolBadge(ag.rol)}`}>
                          {rolLabel(ag.rol)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${ag.isActive ? 'bg-agri-green-main' : 'bg-red-500'}`}></span>
                          {ag.isActive ? 'Activo' : 'Inactivo'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-agri-slate dark:text-gray-400">
                        {ag.lastLoginAt ? new Date(ag.lastLoginAt).toLocaleString('es-EC') : 'Nunca'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Link 
                          href={`/dashboard/personal/${ag.id}`}
                          className="min-h-[36px] bg-white text-gray-900 border border-gray-200 hover:border-agri-green-main hover:text-agri-green-dark hover:bg-agri-green-main/5 rounded-lg px-4 py-1.5 text-xs font-semibold inline-flex items-center justify-center transition-all dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:border-emerald-500 dark:hover:text-emerald-400 dark:hover:bg-emerald-500/10"
                        >
                          Ver Perfil
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
