'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useSyncManager } from '@/lib/hooks/useSyncManager';
import { 
  LayoutDashboard, Users, LayoutList, Scale, CheckSquare, 
  Settings, LogOut, Sun, Moon, Wifi, WifiOff 
} from 'lucide-react';

type SubItem  = { href: string; label: string };
type NavItem  = { href: string; label: string; exact: boolean; icon: React.ReactNode; subItems?: SubItem[] };
type NavGroup = { section: string; adminOnly?: boolean; items: NavItem[] };

// ─── Navigation Structure ───────────────────────────────────────
const NAV: NavGroup[] = [
  {
    section: 'General',
    items: [
      { href: '/dashboard', label: 'Dashboard', exact: true, icon: <LayoutDashboard size={18} /> },
    ],
  },
  {
    section: 'Administración',
    adminOnly: true,
    items: [
      { href: '/dashboard/personal', label: 'Personal', exact: false, icon: <Users size={18} /> },
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
      { href: '/dashboard/campo/clasificacion', label: 'Clasificación', exact: false, icon: <CheckSquare size={18} /> },
    ],
  },
];

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const user = session?.user as any;
  const initials = user ? `${user.nombres?.[0] ?? ''}${user.apellidos?.[0] ?? ''}`.toUpperCase() : '?';

  const { isOnline } = useSyncManager();
  const [theme, setTheme] = useState<'light'|'dark'>('light');

  useEffect(() => {
    const saved = localStorage.getItem('jirah-tema');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('jirah-tema', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
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
      <aside className="w-[260px] flex-shrink-0 h-full bg-white dark:bg-[#111113] border-r border-gray-200 dark:border-gray-800 flex flex-col z-20">
         {/* Logo and Brand */}
         <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200">
           <Link href="/dashboard" className="flex items-center gap-3 group">
             {/* REDUCED LOGO (No giant sizes here) */}
             <img src="/Logo.jpeg" alt="Logo Finca Jirah" className="h-12 w-auto object-contain rounded-lg shadow-sm" />
             <div>
               <div className="text-base font-bold tracking-tight text-agri-green-dark">Finca <span className="text-agri-green-main">Jirah</span></div>
               <div className="text-[0.65rem] text-agri-slate font-semibold uppercase tracking-widest">Sistema Agrícola</div>
             </div>
           </Link>
         </div>

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
           
           <div 
             onClick={() => signOut({ callbackUrl: '/login' })}
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
           </div>
         </div>
      </aside>

      {/* 2. ÁREA PRINCIPAL */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative z-10">
        
        {/* HEADER SUPERIOR (Opcional, altura fija) */}
        <header className="h-16 flex-shrink-0 bg-white dark:bg-[#111113] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 lg:px-8">
           <h2 className="text-sm font-semibold text-agri-green-dark">
             Finca Jirah - {currentLabel}
           </h2>
           <div className="flex items-center gap-4">
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

        {/* CONTENIDO SCROLLEABLE (Aquí va el Dashboard, Pesajes, etc.) */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 w-full">
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
    <SessionProvider>
      <DashboardContent>{children}</DashboardContent>
    </SessionProvider>
  );
}
