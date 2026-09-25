import { NavLink, useNavigate } from 'react-router';
import {
  LayoutDashboard, FolderKanban, Users, Package,
  FileText, Settings, Wand2, LogOut, X,
} from 'lucide-react';
import { currentUser } from '../../data/mockData';

const nav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', icon: FolderKanban, label: 'Proyectos' },
  { to: '/clients', icon: Users, label: 'Clientes' },
  { to: '/inventory', icon: Package, label: 'Inventario' },
  { to: '/quotes', icon: FileText, label: 'Cotizaciones' },
];

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const navigate = useNavigate();

  return (
    <aside className="flex flex-col h-full w-64 bg-surface border-r border-border">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Wand2 size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-text leading-none">CosplayCraft</p>
            <p className="text-xs text-muted leading-none mt-0.5">Hub</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-panel text-muted hover:text-text transition-colors lg:hidden">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <p className="text-xs font-semibold text-muted uppercase tracking-widest px-3 py-2">Principal</p>
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
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

        <div className="pt-4">
          <p className="text-xs font-semibold text-muted uppercase tracking-widest px-3 py-2">Sistema</p>
          <NavLink
            to="/settings"
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
                <Settings size={17} className={isActive ? 'text-primary' : 'text-muted group-hover:text-text transition-colors'} />
                Configuración
              </>
            )}
          </NavLink>
        </div>
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-border flex-shrink-0">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-panel transition-colors cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-white">
              {currentUser.name.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text truncate">{currentUser.name}</p>
            <p className="text-xs text-muted truncate">{currentUser.role === 'admin' ? 'Administrador' : 'Maker'}</p>
          </div>
          <button
            onClick={() => navigate('/login')}
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
