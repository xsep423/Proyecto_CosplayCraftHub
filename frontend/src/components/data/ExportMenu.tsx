import { useEffect, useRef, useState } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import Button from '../ui/Button';
import { apiDownload } from '../../services/api';
import { getWorkshop } from '../../lib/auth';

export type ExportResource = 'clientes' | 'inventario' | 'proyectos' | 'cotizaciones';

const formats = [
  { fmt: 'xlsx', label: 'Excel (.xlsx)', icon: FileSpreadsheet },
  { fmt: 'csv', label: 'CSV (.csv)', icon: FileText },
] as const;

/** Botón "Exportar" con menú para descargar en Excel o CSV. */
export default function ExportMenu({ resource }: { resource: ExportResource }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const download = async (fmt: 'csv' | 'xlsx') => {
    setOpen(false);
    setBusy(true);
    setError('');
    try {
      const slug = getWorkshop()?.slug || 'taller';
      const today = new Date().toLocaleDateString('en-CA'); // AAAA-MM-DD
      await apiDownload(`/export/${resource}/${fmt}/`, `${slug}-${resource}-${today}.${fmt}`);
    } catch {
      setError('No se pudo exportar. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <Button
        variant="secondary"
        onClick={() => setOpen(o => !o)}
        loading={busy}
        icon={<Download size={16} />}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Exportar a Excel o CSV"
      >
        <span className="hidden sm:inline">Exportar</span>
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-lg shadow-xl z-30 py-1"
        >
          {formats.map(({ fmt, label, icon: Icon }) => (
            <button
              key={fmt}
              role="menuitem"
              onClick={() => download(fmt)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-panel transition-colors"
            >
              <Icon size={15} className="text-muted" />
              {label}
            </button>
          ))}
        </div>
      )}
      {error && <p className="absolute right-0 mt-1 text-xs text-danger whitespace-nowrap">{error}</p>}
    </div>
  );
}
