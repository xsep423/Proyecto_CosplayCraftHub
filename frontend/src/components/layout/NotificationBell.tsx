import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { AlertTriangle, Bell, CalendarClock, CheckCheck, FileText, Package } from 'lucide-react';
import { api } from '../../services/api';
import { getCurrentUser } from '../../lib/auth';

export type Notification = {
  id: string;
  type: 'danger' | 'warning' | 'info';
  kind: 'stock' | 'project' | 'quote';
  text: string;
  link: string;
};

const POLL_MS = 2 * 60 * 1000;

const kindIcon = { stock: Package, project: CalendarClock, quote: FileText };
const typeColor = {
  danger: 'text-danger bg-danger/10',
  warning: 'text-warning bg-warning/10',
  info: 'text-info bg-info/10',
};

/** Las leídas se recuerdan por usuario en este navegador. */
function storageKey() {
  return `notifications-read:${getCurrentUser().id ?? 'anon'}`;
}

function loadRead(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(storageKey()) || '[]'));
  } catch {
    return new Set();
  }
}

function saveRead(ids: Set<string>) {
  try {
    localStorage.setItem(storageKey(), JSON.stringify([...ids]));
  } catch {
    // Sin almacenamiento disponible: solo dura esta sesión
  }
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Notification[]>([]);
  const [read, setRead] = useState<Set<string>>(loadRead);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<Notification[]>('/dashboard/notifications/');
      setItems(data);
      setError(false);
      // Olvida las leídas que ya no existen para que la lista no crezca sin fin
      setRead(prev => {
        const current = new Set(data.map(n => n.id));
        const kept = new Set([...prev].filter(id => current.has(id)));
        if (kept.size !== prev.size) saveRead(kept);
        return kept;
      });
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

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

  const unread = items.filter(n => !read.has(n.id));

  const markRead = (ids: string[]) => {
    setRead(prev => {
      const next = new Set([...prev, ...ids]);
      saveRead(next);
      return next;
    });
  };

  const openItem = (n: Notification) => {
    markRead([n.id]);
    setOpen(false);
    navigate(n.link);
  };

  const label = unread.length
    ? `Notificaciones: ${unread.length} sin leer`
    : 'Notificaciones';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          setOpen(o => !o);
          if (!open) load();
        }}
        aria-label={label}
        title={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="relative p-2 rounded-lg hover:bg-panel text-muted hover:text-text transition-colors"
      >
        <Bell size={18} />
        {unread.length > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 rounded-full bg-accent text-white text-[10px] font-bold leading-4 text-center">
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notificaciones"
          className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-16 sm:top-auto sm:mt-2 sm:w-96 bg-surface border border-border rounded-xl shadow-2xl z-50 overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-text">Notificaciones</p>
            {unread.length > 0 && (
              <button
                onClick={() => markRead(items.map(n => n.id))}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover transition-colors"
              >
                <CheckCheck size={14} /> Marcar todo como leído
              </button>
            )}
          </div>

          <div className="max-h-[min(24rem,70vh)] overflow-y-auto">
            {error && items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">No se pudieron cargar las notificaciones.</p>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <CheckCheck size={22} className="mx-auto text-success mb-2" />
                <p className="text-sm text-muted">Todo en orden. No hay alertas pendientes.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map(n => {
                  const Icon = kindIcon[n.kind] ?? AlertTriangle;
                  const isUnread = !read.has(n.id);
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => openItem(n)}
                        className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-panel transition-colors ${isUnread ? '' : 'opacity-60'}`}
                      >
                        <span className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${typeColor[n.type]}`}>
                          <Icon size={14} />
                        </span>
                        <span className="flex-1 text-sm text-text leading-snug">{n.text}</span>
                        {isUnread && <span className="mt-1.5 w-2 h-2 rounded-full bg-accent flex-shrink-0" aria-label="Sin leer" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
