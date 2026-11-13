import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, ChevronRight, Flag, PlayCircle, CheckSquare, CalendarDays } from 'lucide-react';
import Badge from '../components/ui/Badge';
import { api } from '../services/api';
import {
  daysUntil, formatDate, parseDate, priorityLabel, priorityVariant, statusLabel, statusVariant,
} from '../lib/projectLabels';
import type { Project, Task } from '../types';

type Kind = 'due' | 'start' | 'task';

interface CalEvent {
  key: string;
  kind: Kind;
  date: string;        // YYYY-MM-DD
  title: string;
  subtitle: string;
  projectId: number;
  done: boolean;
  overdue: boolean;
  project: Project;
  task?: Task;
}

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const kindMeta: Record<Kind, { label: string; icon: typeof Flag; chip: string; dot: string }> = {
  due: { label: 'Entregas', icon: Flag, chip: 'bg-primary/15 text-primary border-primary/30', dot: 'bg-primary' },
  start: { label: 'Inicios', icon: PlayCircle, chip: 'bg-info/10 text-info border-info/30', dot: 'bg-info' },
  task: { label: 'Tareas', icon: CheckSquare, chip: 'bg-warning/10 text-warning border-warning/30', dot: 'bg-warning' },
};

const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 6 semanas (lunes a domingo) que cubren el mes. */
function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // lunes = 0
  const start = new Date(year, month, 1 - offset);
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

export default function Calendar() {
  const navigate = useNavigate();
  const today = ymd(new Date());
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selected, setSelected] = useState<string>(today);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [show, setShow] = useState<Record<Kind, boolean>>({ due: true, start: false, task: true });
  const [hideDone, setHideDone] = useState(true);

  useEffect(() => {
    Promise.all([api<Project[]>('/projects/'), api<Task[]>('/projects/tasks/')])
      .then(([p, t]) => { setProjects(p); setTasks(t); })
      .catch(() => setError('No se pudo cargar el calendario.'))
      .finally(() => setLoading(false));
  }, []);

  const events = useMemo(() => {
    const byId = new Map(projects.map(p => [p.id, p]));
    const list: CalEvent[] = [];
    for (const p of projects) {
      const done = p.status === 'completed';
      list.push({
        key: `due-${p.id}`, kind: 'due', date: p.dueDate, title: p.name, subtitle: p.clientName,
        projectId: p.id, done, overdue: !done && daysUntil(p.dueDate) < 0, project: p,
      });
      list.push({
        key: `start-${p.id}`, kind: 'start', date: p.startDate, title: p.name, subtitle: 'Inicio del proyecto',
        projectId: p.id, done, overdue: false, project: p,
      });
    }
    for (const t of tasks) {
      const project = byId.get(t.projectId);
      if (!t.dueDate || !project) continue;
      const done = t.status === 'done';
      list.push({
        key: `task-${t.id}`, kind: 'task', date: t.dueDate, title: t.title, subtitle: project.name,
        projectId: project.id, done, overdue: !done && daysUntil(t.dueDate) < 0, project, task: t,
      });
    }
    return list.filter(e => show[e.kind] && !(hideDone && e.done));
  }, [projects, tasks, show, hideDone]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of events) {
      const k = e.date.slice(0, 10);
      map.set(k, [...(map.get(k) ?? []), e]);
    }
    // Entregas primero, luego tareas, luego inicios
    const order: Record<Kind, number> = { due: 0, task: 1, start: 2 };
    map.forEach(list => list.sort((a, b) => order[a.kind] - order[b.kind]));
    return map;
  }, [events]);

  const days = monthGrid(cursor.year, cursor.month);
  const monthName = capitalize(new Date(cursor.year, cursor.month, 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }));
  const selectedEvents = byDay.get(selected) ?? [];

  const upcoming = events
    .filter(e => e.kind === 'due' && !e.done && daysUntil(e.date) >= 0 && daysUntil(e.date) <= 30)
    .sort((a, b) => a.date.localeCompare(b.date));
  const overdue = events
    .filter(e => e.kind === 'due' && e.overdue)
    .sort((a, b) => a.date.localeCompare(b.date));

  const move = (delta: number) => {
    setCursor(c => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const goToday = () => {
    const d = new Date();
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
    setSelected(today);
  };

  const selectDate = (date: string) => {
    setSelected(date);
    const d = parseDate(date);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  };

  return (
    <div className="space-y-5">
      {error && <p className="text-sm text-danger">{error}</p>}

      {/* Barra superior */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => move(-1)} className="p-2 rounded-lg bg-surface border border-border hover:border-primary/40 text-muted hover:text-text" aria-label="Mes anterior">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => move(1)} className="p-2 rounded-lg bg-surface border border-border hover:border-primary/40 text-muted hover:text-text" aria-label="Mes siguiente">
            <ChevronRight size={16} />
          </button>
          <h2 className="text-lg font-bold text-text ml-1">{monthName}</h2>
          <button onClick={goToday} className="ml-2 text-xs px-3 py-1.5 rounded-lg bg-surface border border-border text-muted hover:text-text">
            Hoy
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(Object.keys(kindMeta) as Kind[]).map(k => {
            const { label, icon: Icon } = kindMeta[k];
            return (
              <button
                key={k}
                onClick={() => setShow(s => ({ ...s, [k]: !s[k] }))}
                aria-pressed={show[k]}
                className={`text-xs px-3 py-1.5 rounded-full border flex items-center gap-1.5 transition-colors ${
                  show[k] ? kindMeta[k].chip : 'bg-surface border-border text-muted'
                }`}
              >
                <Icon size={12} /> {label}
              </button>
            );
          })}
          <label className="text-xs text-muted flex items-center gap-1.5 ml-1 cursor-pointer">
            <input type="checkbox" checked={hideDone} onChange={e => setHideDone(e.target.checked)} className="accent-primary" />
            Ocultar terminados
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
        {/* Mes */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-muted uppercase tracking-wider py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map(d => {
              const key = ymd(d);
              const list = byDay.get(key) ?? [];
              const inMonth = d.getMonth() === cursor.month;
              const isToday = key === today;
              const isSelected = key === selected;
              return (
                <button
                  key={key}
                  onClick={() => setSelected(key)}
                  className={`
                    relative min-h-[64px] sm:min-h-[104px] p-1.5 sm:p-2 text-left border-b border-r border-border
                    flex flex-col gap-1 transition-colors [&:nth-child(7n)]:border-r-0
                    ${inMonth ? '' : 'bg-bg/40'}
                    ${isSelected ? 'bg-primary/10' : 'hover:bg-panel/50'}
                  `}
                >
                  <span className={`
                    text-xs font-mono w-6 h-6 flex items-center justify-center rounded-full
                    ${isToday ? 'bg-primary text-white font-bold' : inMonth ? 'text-text' : 'text-muted/50'}
                  `}>
                    {d.getDate()}
                  </span>
                  {/* Celular: puntos. Escritorio: etiquetas */}
                  <div className="flex gap-1 flex-wrap sm:hidden">
                    {list.slice(0, 4).map(e => (
                      <span key={e.key} className={`w-1.5 h-1.5 rounded-full ${e.overdue ? 'bg-danger' : kindMeta[e.kind].dot}`} />
                    ))}
                  </div>
                  <div className="hidden sm:flex flex-col gap-1 min-w-0">
                    {list.slice(0, 3).map(e => (
                      <span
                        key={e.key}
                        title={`${e.title} · ${e.subtitle}`}
                        className={`text-[11px] leading-tight px-1.5 py-0.5 rounded border truncate ${
                          e.overdue ? 'bg-danger/10 text-danger border-danger/30' : kindMeta[e.kind].chip
                        } ${e.done ? 'line-through opacity-60' : ''}`}
                      >
                        {e.title}
                      </span>
                    ))}
                    {list.length > 3 && <span className="text-[11px] text-muted px-1">+{list.length - 3} más</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Panel lateral */}
        <div className="space-y-5">
          <div className="bg-surface border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-text mb-3">
              {capitalize(parseDate(selected).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }))}
            </h3>
            {loading ? (
              <p className="text-xs text-muted">Cargando…</p>
            ) : selectedEvents.length === 0 ? (
              <p className="text-xs text-muted">Nada programado este día.</p>
            ) : (
              <div className="space-y-2">
                {selectedEvents.map(e => {
                  const Icon = kindMeta[e.kind].icon;
                  return (
                    <button
                      key={e.key}
                      onClick={() => navigate(`/projects/${e.projectId}`)}
                      className="w-full text-left flex items-start gap-3 p-3 rounded-lg bg-panel hover:bg-border/60 transition-colors"
                    >
                      <Icon size={15} className={`mt-0.5 flex-shrink-0 ${e.overdue ? 'text-danger' : ''}`} />
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm text-text truncate ${e.done ? 'line-through opacity-60' : ''}`}>{e.title}</p>
                        <p className="text-xs text-muted truncate">{e.subtitle}</p>
                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                          {e.kind === 'task' && e.task ? (
                            <Badge variant={priorityVariant[e.task.priority]}>{priorityLabel[e.task.priority]}</Badge>
                          ) : (
                            <Badge variant={statusVariant[e.project.status]} dot>{statusLabel[e.project.status]}</Badge>
                          )}
                          {e.overdue && <Badge variant="danger">Atrasado</Badge>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {overdue.length > 0 && (
            <div className="bg-surface border border-danger/30 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-danger mb-3">Entregas atrasadas ({overdue.length})</h3>
              <div className="space-y-1">
                {overdue.map(e => (
                  <button key={e.key} onClick={() => selectDate(e.date)} className="w-full flex items-center justify-between gap-3 px-2 py-1.5 rounded-md hover:bg-panel text-left">
                    <span className="text-sm text-text truncate">{e.title}</span>
                    <span className="text-xs font-mono text-danger whitespace-nowrap">{formatDate(e.date)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="bg-surface border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
              <CalendarDays size={15} className="text-primary" /> Próximos 30 días
            </h3>
            {upcoming.length === 0 ? (
              <p className="text-xs text-muted">Sin entregas en los próximos 30 días.</p>
            ) : (
              <div className="space-y-1">
                {upcoming.map(e => {
                  const n = daysUntil(e.date);
                  return (
                    <button key={e.key} onClick={() => selectDate(e.date)} className="w-full flex items-center justify-between gap-3 px-2 py-1.5 rounded-md hover:bg-panel text-left">
                      <span className="text-sm text-text truncate">{e.title}</span>
                      <span className={`text-xs font-mono whitespace-nowrap ${n <= 3 ? 'text-warning' : 'text-muted'}`}>
                        {n === 0 ? 'Hoy' : n === 1 ? 'Mañana' : `en ${n} días`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
