import { useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { Building2, LayoutDashboard, LogOut, Menu, ShieldCheck, X } from 'lucide-react';
import { getUserName, isPlatformAdmin, logout } from '../../lib/auth';

const nav = [
  { to: '/platform', icon: LayoutDashboard, label: 'Resumen', end: true },
  { to: '/platform/workshops', icon: Building2, label: 'Talleres', end: false },
];

function PlatformSidebar({ onClose }: { onClose?: () => void }) {
  const navigate = useNavigate();
  const userName = getUserName();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="flex flex-col h-full w-64 bg-surface border-r border-border">
      <div className="flex items-center justify-between px-5 h-16 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <ShieldCheck size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-text leading-none">CosplayCraft</p>
            <p className="text-xs text-muted leading-none mt-0.5">Consola de plataforma</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-panel text-muted hover:text-text transition-colors lg:hidden">
            <X size={16} />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <p className="text-xs font-semibold text-muted uppercase tracking-widest px-3 py-2">Plataforma</p>
        {nav.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
              transition-all duration-150 group
              ${isActive
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-muted hover:text-text hover:bg-panel border border-transparent'
              }
            `}
          >
            {({ isActive }) => (
              <>
                <Icon size={17} className={isActive ? 'text-primary' : 'text-muted group-hover:text-text transition-colors'} />
                {label}
              </>
            )}
          </NavLink>
        ))}

        <div className="mx-3 mt-6 p-3 rounded-lg bg-panel/60 border border-border">
          <p className="text-xs text-muted leading-relaxed">
            Aquí se administran los talleres. Los clientes, proyectos y cotizaciones de cada taller
            solo los ve ese taller.
          </p>
        </div>
      </nav>

      <div className="px-3 py-4 border-t border-border flex-shrink-0">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={14} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text truncate">{userName}</p>
            <p className="text-xs text-muted truncate">Super administrador</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1 rounded-md hover:bg-border text-muted hover:text-text transition-colors flex-shrink-0"
            title="Cerrar sesión"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function title(pathname: string) {
  if (pathname === '/platform') return 'Resumen de la plataforma';
  if (pathname === '/platform/workshops') return 'Talleres';
  if (pathname.startsWith('/platform/workshops/')) return 'Detalle del taller';
  return 'Consola de plataforma';
}

/** Layout de la consola del super admin. Un usuario de taller que llegue aquí vuelve a su dashboard. */
export default function PlatformLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();

  if (!isPlatformAdmin()) return <Navigate to="/dashboard" replace />;

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <div className="hidden lg:flex flex-shrink-0">
        <PlatformSidebar />
      </div>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-bg/70 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50 flex-shrink-0">
            <PlatformSidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="h-16 bg-surface border-b border-border flex items-center px-4 gap-4 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-panel text-muted hover:text-text transition-colors lg:hidden"
          >
            <Menu size={20} />
          </button>
          <h1 className="text-base font-semibold text-text flex-1">{title(pathname)}</h1>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">
            <ShieldCheck size={12} /> Super admin
          </span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
