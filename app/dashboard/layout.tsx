'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import CampoSessionProvider, { cerrarSesionCampo } from '@/lib/auth/CampoSessionProvider';
import { useEffect, useState } from 'react';
import { useSyncManager } from '@/lib/hooks/useSyncManager';
import OfflineReadiness from '@/app/ui/OfflineReadiness';
import { useTema } from '@/lib/hooks/useTema';
import { 
  LayoutDashboard, Users, LayoutList, Scale, CheckSquare, 
  FileText, LogOut, Sun, Moon, Wifi, WifiOff
} from 'lucide-react';

type SubItem  = { href: string; label: string };
type NavItem  = { href: string; label: string; exact: boolean; icon: React.ReactNode; subItems?: SubItem[] };
type NavGroup = { section: string; adminOnly?: boolean; items: NavItem[] };

// ─── Navigation Structure ───────────────────────────────────────
const NAV: NavGroup[] = [
  {
    section: 'General',
    adminOnly: true,
    items: [
      { href: '/dashboard', label: 'Dashboard', exact: true, icon: <LayoutDashboard size={18} /> },
      { href: '/dashboard/reportes', label: 'Reportes', exact: false, icon: <FileText size={18} /> },
    ],
  },
  {
    section: 'Administración',
    adminOnly: true,
    items: [
      { href: '/dashboard/personal', label: 'Personal', exact: false, icon: <Users size={18} /> },
      { href: '/dashboard/comercial', label: 'Entregas y devoluciones', exact: false, icon: <FileText size={18} /> },
      {
        href: '/dashboard/catalogos', label: 'Catálogos', exact: false,
        icon: <LayoutList size={18} />,
        subItems: [
          { href: '/dashboard/catalogos/campanias', label: 'Campañas' },
          { href: '/dashboard/catalogos/lotes',     label: 'Lotes' },
          { href: '/dashboard/catalogos/compradores', label: 'Compradores' },
        ],
      },
    ],
  },
  {
    section: 'Campo',
    items: [
      { href: '/dashboard/campo/pesaje', label: 'Pesaje Bruto', exact: false, icon: <Scale size={18} /> },
      { href: '/dashboard/campo/pendientes', label: 'Pendientes', exact: false, icon: <FileText size={18} /> },
      { href: '/dashboard/campo/clasificacion', label: 'Clasificación', exact: false, icon: <CheckSquare size={18} /> },
    ],
  },
];

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const user = session?.user;
  const initials = user ? `${user.nombres?.[0] ?? ''}${user.apellidos?.[0] ?? ''}`.toUpperCase() : '?';

  const { isOnline, syncError, retrySync } = useSyncManager();
  const { tema, guardar: guardarTema } = useTema(user?.id);
  const theme = tema === 'OSCURO' ? 'dark' : 'light';
  const [menuOpen, setMenuOpen] = useState(false);
  const [storageBlocked, setStorageBlocked] = useState(false);
  useEffect(() => {
    const blocked = () => setStorageBlocked(true);
    window.addEventListener('jirah-storage-blocked', blocked);
    return () => window.removeEventListener('jirah-storage-blocked', blocked);
  }, []);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
    if (status === 'authenticated' && !user?.id) void cerrarSesionCampo();
  }, [status, user?.id, router]);

  const toggleTheme = () => {
    guardarTema(tema === 'CLARO' ? 'OSCURO' : 'CLARO');
  };

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  const currentLabel = (() => {
    for (const group of NAV) {
      for (const item of group.items) {
        if (item.subItems) {
          for (const sub of item.subItems) {
            if (pathname.startsWith(sub.href)) return sub.label;
          }
        }
        if (isActive(item.href, item.exact)) return item.label;
      }
    }
    if (pathname.startsWith('/dashboard/perfil')) return 'Mi Perfil';
    return 'Jirah';
  })();

  return (
    <div className="flex h-screen w-full bg-agri-bg-light dark:bg-[#09090b] overflow-hidden">
      
      {/* 1. SIDEBAR ESTRICTO (Fijo a la izquierda) */}
      {menuOpen && <button aria-label="Cerrar navegación" className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setMenuOpen(false)} />}
      <aside id="navegacion-principal" onClick={e => { if (e.target instanceof Element && e.target.closest('a')) setMenuOpen(false); }} className={`w-[260px] max-w-[85vw] flex-shrink-0 h-full bg-white dark:bg-[#111113] border-r border-gray-200 dark:border-gray-800 flex-col fixed md:relative z-40 md:z-20 ${menuOpen ? 'flex' : 'hidden md:flex'}`}>
         {/* Logo and Brand */}
         <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200">
           <Link href="/dashboard" className="flex items-center gap-3 group">
             {/* REDUCED LOGO (No giant sizes here) */}
             <Image src="/Logo.jpeg" width={48} height={48} alt="Logo Finca Jirah" className="h-12 w-auto object-contain rounded-lg shadow-sm" />
             <div>
               <div className="text-base font-bold tracking-tight text-agri-green-dark">Finca <span className="text-agri-green-main">Jirah</span></div>
               <div className="text-[0.65rem] text-agri-slate font-semibold uppercase tracking-widest">Sistema Agrícola</div>
             </div>
           </Link>
         </div>

         <button aria-label="Cerrar menú" className="md:hidden min-h-11 border-b" onClick={() => setMenuOpen(false)}>Cerrar menú</button>
         {/* Scrollable Navigation */}
         <div className="flex-1 overflow-y-auto custom-scrollbar">
           <nav className="px-3 py-4 flex flex-col gap-1">
             {NAV.map(group => {
               if (group.adminOnly && user?.rol !== 'ADMIN') return null;
               return (
                 <div key={group.section} className="mb-4">
                   <span className="block px-3 py-2 text-[0.65rem] font-bold uppercase tracking-widest text-agri-slate/60">{group.section}</span>
                   {group.items.map((item: NavItem) => {
                     const active = isActive(item.href, item.exact);
                     const subActive = item.subItems?.some((s: SubItem) => pathname.startsWith(s.href));
                     return (
                       <div key={item.href}>
                          <Link
                           href={item.href}
                           onNavigate={event => { if (!navigator.onLine && item.href.startsWith('/dashboard/campo/')) { event.preventDefault(); window.location.assign(item.href); } }}
                           className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                             active || subActive 
                               ? 'bg-agri-green-main/10 text-agri-green-dark font-semibold' 
                               : 'text-gray-600 hover:bg-gray-100 hover:text-agri-green-dark'
                           }`}
                         >
                           <span className={`${active || subActive ? 'text-agri-green-main' : 'opacity-60'}`}>
                             {item.icon}
                           </span>
                           {item.label}
                         </Link>
                         
                         {item.subItems && (active || subActive) && (
                           <div className="pl-9 pr-2 pt-1 flex flex-col gap-0.5">
                             {item.subItems!.map((sub: SubItem) => (
                               <Link
                                 key={sub.href}
                                 href={sub.href}
                                 className={`px-3 py-2 text-sm rounded-md transition-all duration-200 ${
                                   pathname.startsWith(sub.href) 
                                     ? 'font-semibold text-agri-green-dark bg-agri-green-main/5' 
                                     : 'text-gray-500 hover:text-agri-green-dark hover:bg-gray-50'
                                 }`}
                               >
                                 {sub.label}
                               </Link>
                             ))}
                           </div>
                         )}
                       </div>
                     );
                   })}
                 </div>
               );
             })}
           </nav>
         </div>

         {/* Footer Sidebar */}
         <div className="p-4 border-t border-gray-200">
           <div className="flex items-center justify-between mb-3 px-2">
             <span className="text-xs font-semibold text-agri-slate">Tema</span>
             <button 
               onClick={toggleTheme}
               className="p-1.5 rounded-md hover:bg-gray-100 transition-colors text-agri-slate hover:text-agri-green-dark"
               title="Alternar Tema"
             >
               {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
             </button>
           </div>
           
           <button type="button" aria-label="Cerrar sesión"
             onClick={() => void cerrarSesionCampo()}
             className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-100 transition-all duration-200 group"
           >
             <div className="w-8 h-8 rounded-full bg-agri-green-main text-white flex items-center justify-center text-xs font-bold shadow-sm">
               {initials}
             </div>
             <div className="flex-1 min-w-0">
               <div className="text-sm font-semibold text-gray-800 truncate">{user?.nombres}</div>
               <div className="text-[0.65rem] text-agri-slate uppercase tracking-wider font-medium">{user?.rol}</div>
             </div>
             <LogOut size={16} className="text-gray-400 group-hover:text-red-500 transition-colors" />
           </button>
         </div>
      </aside>

      {/* 2. ÁREA PRINCIPAL */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative z-10">
        
        {/* HEADER SUPERIOR (Opcional, altura fija) */}
        <header className="h-16 flex-shrink-0 bg-white dark:bg-[#111113] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between gap-2 px-3 lg:px-8">
           <button aria-label="Abrir menú" aria-expanded={menuOpen} aria-controls="navegacion-principal" className="md:hidden min-h-11 px-2 border rounded" onClick={() => setMenuOpen(true)}>Menú</button>
           <h2 className="text-sm font-semibold text-agri-green-dark truncate">
             Finca Jirah - {currentLabel}
           </h2>
           <div className="flex items-center gap-2 shrink-0">
             <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
               isOnline 
                 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                 : 'bg-red-50 border-red-200 text-red-600'
             }`}>
               {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
               {isOnline ? 'Online' : 'Offline'}
             </div>
             <div className="h-6 w-px bg-gray-200"></div>
             <Link href="/dashboard/perfil">
               <div className="w-9 h-9 rounded-full bg-agri-green-main text-white flex items-center justify-center text-xs font-bold cursor-pointer hover:ring-2 hover:ring-agri-green-light/40 transition-all shadow-sm">
                 {initials}
               </div>
             </Link>
           </div>
        </header>

        {storageBlocked && <p role="alert" className="p-3 bg-amber-50 text-amber-900">Cierre las otras pestañas de JIRAH y recargue esta página para actualizar el almacenamiento. Sus pendientes se conservan.</p>}
        {syncError && (
          <div role="alert" className="px-6 py-3 bg-amber-50 text-amber-900 border-b border-amber-200 text-sm">
            <p>Hay registros pendientes de sincronización: {syncError}</p>
            <button type="button" onClick={retrySync} disabled={!isOnline} className="mt-1 underline font-semibold disabled:opacity-50">Reintentar sincronización</button>
          </div>
        )}
        {user?.id && <OfflineReadiness key={user.id} userId={user.id} online={isOnline} />}
        {/* CONTENIDO SCROLLEABLE (Aquí va el Dashboard, Pesajes, etc.) */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 md:p-8 w-full">
          <div className="max-w-[1600px] mx-auto w-full">
            {children}
          </div>
        </div>

      </main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <CampoSessionProvider>
      <DashboardContent>{children}</DashboardContent>
    </CampoSessionProvider>
  );
}
