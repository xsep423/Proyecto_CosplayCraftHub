import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { getTheme, setTheme, type Theme } from '../../lib/theme';

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setCurrent] = useState<Theme>(getTheme);

  useEffect(() => {
    const sync = () => setCurrent(getTheme());
    window.addEventListener('theme-changed', sync);
    return () => window.removeEventListener('theme-changed', sync);
  }, []);

  const next: Theme = theme === 'dark' ? 'light' : 'dark';
  const label = next === 'light' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';

  return (
    <button
      onClick={() => setTheme(next)}
      title={label}
      aria-label={label}
      className={`p-2 rounded-lg hover:bg-panel text-muted hover:text-text transition-colors ${className}`}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
