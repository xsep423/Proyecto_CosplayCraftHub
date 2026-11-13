import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { mediaUrl } from '../../services/api';

export interface LightboxItem {
  url: string;
  caption?: string;
  meta?: string;
}

interface LightboxProps {
  items: LightboxItem[];
  index: number | null;
  onChange: (index: number | null) => void;
}

/** Visor a pantalla completa. Flechas del teclado para navegar, Esc para cerrar. */
export default function Lightbox({ items, index, onChange }: LightboxProps) {
  const open = index !== null && items[index] !== undefined;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onChange(null);
      if (e.key === 'ArrowRight') onChange((index! + 1) % items.length);
      if (e.key === 'ArrowLeft') onChange((index! - 1 + items.length) % items.length);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, index, items.length, onChange]);

  if (!open) return null;
  const item = items[index!];
  const many = items.length > 1;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/90 flex flex-col"
      role="dialog"
      aria-modal="true"
      onClick={() => onChange(null)}
    >
      <div className="flex items-center justify-between px-4 h-14 text-white/80 flex-shrink-0">
        <span className="text-sm font-mono">{many ? `${index! + 1} / ${items.length}` : ''}</span>
        <button
          onClick={() => onChange(null)}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Cerrar"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-center px-2 sm:px-16 relative">
        {many && (
          <button
            onClick={e => { e.stopPropagation(); onChange((index! - 1 + items.length) % items.length); }}
            className="absolute left-2 sm:left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Anterior"
          >
            <ChevronLeft size={22} />
          </button>
        )}
        <img
          src={mediaUrl(item.url)}
          alt={item.caption || ''}
          className="max-h-full max-w-full object-contain rounded-lg select-none"
          style={{ maxHeight: 'calc(100dvh - 9rem)' }}
          onClick={e => e.stopPropagation()}
        />
        {many && (
          <button
            onClick={e => { e.stopPropagation(); onChange((index! + 1) % items.length); }}
            className="absolute right-2 sm:right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Siguiente"
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      {(item.caption || item.meta) && (
        <div className="px-4 py-4 text-center flex-shrink-0" onClick={e => e.stopPropagation()}>
          {item.caption && <p className="text-sm text-white">{item.caption}</p>}
          {item.meta && <p className="text-xs text-white/60 mt-1">{item.meta}</p>}
        </div>
      )}
    </div>
  );
}
