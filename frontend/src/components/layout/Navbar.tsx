import { useLocation } from 'react-router';
import { Menu, Bell, Search } from 'lucide-react';

const routeTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/projects': 'Proyectos',
  '/projects/new': 'Nuevo Proyecto',
  '/clients': 'Clientes',
  '/inventory': 'Inventario',
  '/quotes': 'Cotizaciones',
  '/settings': 'Configuración',
};

interface NavbarProps {
  onMenuToggle: () => void;
}

export default function Navbar({ onMenuToggle }: NavbarProps) {
  const { pathname } = useLocation();

  const getTitle = () => {
    if (routeTitles[pathname]) return routeTitles[pathname];
    if (pathname.startsWith('/projects/')) return 'Detalle del Proyecto';
    return 'CosplayCraft Hub';
  };

  return (
    <header className="h-16 bg-surface border-b border-border flex items-center px-4 gap-4 flex-shrink-0">
      <button
        onClick={onMenuToggle}
        className="p-2 rounded-lg hover:bg-panel text-muted hover:text-text transition-colors lg:hidden"
      >
        <Menu size={20} />
      </button>

      <h1 className="text-base font-semibold text-text flex-1">{getTitle()}</h1>

      <div className="flex items-center gap-2">
        <button className="p-2 rounded-lg hover:bg-panel text-muted hover:text-text transition-colors hidden sm:flex">
          <Search size={18} />
        </button>
        <button className="relative p-2 rounded-lg hover:bg-panel text-muted hover:text-text transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full" />
        </button>
      </div>
    </header>
  );
}
