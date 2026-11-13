import { useRef, useState, type ReactNode } from 'react';
import { ImagePlus, RefreshCw, Trash2 } from 'lucide-react';
import { mediaUrl } from '../../services/api';
import { IMAGE_ACCEPT } from '../../lib/images';
import { apiErrorMessage } from '../../lib/projectLabels';
import type { ImageRef } from '../../types';

interface ImagePickerProps {
  image: ImageRef | null;
  /** Recibe el archivo elegido; debe subirlo y lanzar error si falla. */
  onSelect: (file: File) => Promise<void>;
  onRemove?: () => Promise<void>;
  disabled?: boolean;
  label?: string;
  hint?: string;
  /** 'square' para fotos de material, 'logo' para el logo (contain, fondo neutro). */
  variant?: 'square' | 'logo';
  placeholder?: ReactNode;
}

/** Una sola imagen con botones para subir, cambiar y quitar. */
export default function ImagePicker({
  image, onSelect, onRemove, disabled, label, hint, variant = 'square', placeholder,
}: ImagePickerProps) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(apiErrorMessage(err, 'No se pudo guardar la imagen.'));
    } finally {
      setBusy(false);
    }
  };

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) run(() => onSelect(file));
  };

  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-xs font-medium text-muted uppercase tracking-wider">{label}</span>}
      <div className="flex items-center gap-4">
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => input.current?.click()}
          className={`
            relative w-24 h-24 rounded-xl border border-border overflow-hidden flex-shrink-0
            flex items-center justify-center bg-panel transition-colors
            enabled:hover:border-primary/50 disabled:cursor-default
          `}
          aria-label={image ? 'Cambiar imagen' : 'Subir imagen'}
        >
          {image ? (
            <img
              src={mediaUrl(image.thumbUrl)}
              alt=""
              className={`w-full h-full ${variant === 'logo' ? 'object-contain p-2' : 'object-cover'}`}
            />
          ) : (
            placeholder ?? <ImagePlus size={22} className="text-muted" />
          )}
          {busy && (
            <span className="absolute inset-0 bg-bg/70 flex items-center justify-center">
              <span className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </span>
          )}
        </button>

        {!disabled && (
          <div className="flex flex-col gap-2 items-start">
            <button
              type="button"
              disabled={busy}
              onClick={() => input.current?.click()}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-panel border border-border hover:border-primary/40 text-text transition-colors disabled:opacity-50"
            >
              {image ? <RefreshCw size={13} /> : <ImagePlus size={13} />}
              {image ? 'Cambiar' : 'Subir imagen'}
            </button>
            {image && onRemove && (
              <button
                type="button"
                disabled={busy}
                onClick={() => run(onRemove)}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
              >
                <Trash2 size={13} /> Quitar
              </button>
            )}
          </div>
        )}
        <input ref={input} type="file" accept={IMAGE_ACCEPT} className="hidden" onChange={pick} />
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
