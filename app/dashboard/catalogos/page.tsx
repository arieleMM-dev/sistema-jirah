'use client';
import Link from 'next/link';

const MODULES = [
  {
    href: '/dashboard/catalogos/campanias',
    title: 'Campañas',
    desc: 'Ciclos de cosecha: código, funda, tara y comprador asignado.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/catalogos/lotes',
    title: 'Lotes',
    desc: 'Áreas físicas de cultivo con su superficie en hectáreas.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/catalogos/compradores',
    title: 'Compradores',
    desc: 'Directorio de exportadores y mayoristas con perfil de tolerancia.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
];

export default function CatalogosPage() {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-agri-green-dark dark:text-white tracking-tight">Catálogos</h1>
        <p className="text-sm text-agri-slate dark:text-gray-400 mt-1">
          Tablas maestras de control que nutren las operaciones de campo y configuración global.
        </p>
      </div>

      {/* Grid de Módulos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
        {MODULES.map(m => (
          <Link key={m.href} href={m.href} className="group block">
            <div className="flex flex-col h-full p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all duration-300 hover:border-agri-green-main hover:shadow-md hover:-translate-y-1">
              
              {/* Icono con Glow */}
              <div className="w-12 h-12 rounded-xl bg-agri-green-main/10 text-agri-green-main dark:bg-agri-green-main/20 dark:text-emerald-400 flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110 group-hover:bg-agri-green-main group-hover:text-white shadow-sm">
                {m.icon}
              </div>
              
              <div className="flex-1">
                <h2 className="text-lg font-bold text-agri-green-dark dark:text-white mb-2 group-hover:text-agri-green-main dark:group-hover:text-emerald-400 transition-colors">{m.title}</h2>
                <p className="text-sm text-agri-slate dark:text-gray-400 leading-relaxed font-medium">
                  {m.desc}
                </p>
              </div>

              {/* Acción Inferior */}
              <div className="mt-6 flex items-center gap-2 text-sm font-bold text-agri-green-main dark:text-emerald-400 transition-all group-hover:translate-x-1">
                Gestionar Registros
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"></path><path d="M12 5l7 7-7 7"></path>
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
