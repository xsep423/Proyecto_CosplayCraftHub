import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  FolderKanban, Users, Package, FileText, AlertTriangle, AlertOctagon,
  Clock, TrendingUp, ArrowRight, CalendarDays, CheckCircle2, Plus,
} from 'lucide-react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { api } from '../services/api';
import { getRole } from '../lib/auth';
import {
  statusLabel, statusVariant, priorityLabel, priorityVariant,
  formatDate, daysUntil, money,
} from '../lib/projectLabels';
import type { DashboardAlert, DashboardSummary, ProjectStatus } from '../types';

const alertStyle: Record<DashboardAlert['type'], { icon: typeof AlertTriangle; color: string }> = {
  danger: { icon: AlertOctagon, color: 'text-danger' },
  warning: { icon: AlertTriangle, color: 'text-warning' },
  info: { icon: Clock, color: 'text-info' },
};

const statusBarColor: Record<ProjectStatus, string> = {
  planning: 'bg-muted',
  in_progress: 'bg-primary',
  review: 'bg-warning',
  completed: 'bg-success',
  on_hold: 'bg-danger',
};

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const canCreate = getRole() !== 'viewer';
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<DashboardSummary>('/dashboard/summary/')
      .then(setData)
      .catch(() => setError('No se pudo cargar el dashboard.'));
  }, []);

  if (error) {
    return <p className="text-sm text-danger">{error}</p>;
  }

  if (!data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-32 bg-surface border border-border rounded-xl" />)}
        </div>
        <div className="h-72 bg-surface border border-border rounded-xl" />
      </div>
    );
  }

  const { stats } = data;
  const currency = data.workshop.currency;

  const statCards = [
    {
      label: 'Proyectos Activos',
      value: stats.activeProjects,
      icon: FolderKanban, color: 'text-primary', bg: 'bg-primary/10',
      trend: `+${stats.newProjectsThisMonth} este mes`, trendUp: true, to: '/projects',
    },
    {
      label: 'Clientes Activos',
      value: stats.activeClients,
      icon: Users, color: 'text-info', bg: 'bg-info/10',
      trend: `+${stats.newClientsThisMonth} este mes`, trendUp: true, to: '/clients',
    },
    {
      label: 'Materiales con Alerta',
      value: stats.stockAlerts,
      icon: Package, color: 'text-warning', bg: 'bg-warning/10',
      trend: plural(stats.criticalStock, 'crítico', 'críticos'), trendUp: stats.criticalStock === 0, to: '/inventory',
    },
    {
      label: 'Cotizaciones Pendientes',
      value: stats.pendingQuotes,
      icon: FileText, color: 'text-accent', bg: 'bg-accent/10',
      trend: `${money(stats.sentQuotesTotal)} ${currency} enviadas`, trendUp: true, to: '/quotes',
    },
  ];

  const totalProjects = Object.values(data.projectsByStatus).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => (
          <button
            key={s.label}
            onClick={() => navigate(s.to)}
            className="text-left bg-surface border border-border rounded-xl p-5 hover:border-primary/30 transition-colors"
          >
            <div className="flex items-start justify-between mb-3 gap-2">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                <s.icon size={20} className={s.color} />
              </div>
              <span className={`text-xs flex items-center gap-1 text-right ${s.trendUp ? 'text-success' : 'text-warning'}`}>
                <TrendingUp size={12} className="flex-shrink-0" />
                {s.trend}
              </span>
            </div>
            <p className="text-3xl font-bold text-text font-mono">{s.value}</p>
            <p className="text-xs text-muted mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Upcoming deliveries */}
        <div className="xl:col-span-2 bg-surface border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-text flex items-center gap-2">
              <CalendarDays size={16} className="text-primary" />
              Próximas Entregas
            </h2>
            <Button variant="ghost" size="sm" icon={<ArrowRight size={14} />} onClick={() => navigate('/projects')}>
              Ver todos
            </Button>
          </div>
          {data.upcoming.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-muted mb-4">No hay proyectos abiertos.</p>
              {canCreate && (
                <Button size="sm" icon={<Plus size={14} />} onClick={() => navigate('/projects/new')}>
                  Crear el primero
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {data.upcoming.map(p => {
                const days = daysUntil(p.dueDate);
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-panel/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/projects/${p.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text truncate">{p.name}</p>
                      <p className="text-xs text-muted mt-0.5 truncate">
                        {p.clientName}{p.responsible && ` · ${p.responsible}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <Badge variant={statusVariant[p.status]} dot>{statusLabel[p.status]}</Badge>
                      <div className="text-right hidden sm:block">
                        <p className="text-xs font-mono text-text">{formatDate(p.dueDate)}</p>
                        <p className={`text-xs font-medium ${days <= 7 ? 'text-danger' : days <= 21 ? 'text-warning' : 'text-muted'}`}>
                          {days > 0 ? `${days}d restantes` : days === 0 ? 'Entrega hoy' : `Vencido hace ${Math.abs(days)}d`}
                        </p>
                      </div>
                    </div>
                    <div className="w-20 hidden md:block">
                      <span className="text-xs text-muted">{p.progress}%</span>
                      <div className="h-1.5 bg-panel rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${p.progress}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Alerts + status breakdown */}
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-text flex items-center gap-2">
                <AlertTriangle size={16} className="text-warning" />
                Alertas
              </h2>
            </div>
            {data.alerts.length === 0 ? (
              <div className="flex items-center gap-3 px-5 py-6">
                <CheckCircle2 size={16} className="text-success" />
                <p className="text-xs text-muted">Todo en orden, sin alertas.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data.alerts.map((a, i) => {
                  const { icon: Icon, color } = alertStyle[a.type];
                  return (
                    <button
                      key={i}
                      onClick={() => navigate(a.link)}
                      className="w-full text-left flex items-start gap-3 px-5 py-3.5 hover:bg-panel/50 transition-colors"
                    >
                      <Icon size={15} className={`mt-0.5 flex-shrink-0 ${color}`} />
                      <p className="text-xs text-muted leading-relaxed">{a.text}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-surface border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-text text-sm">Proyectos por estado</h2>
              <span className="text-xs text-muted font-mono">{totalProjects} total</span>
            </div>
            {totalProjects > 0 && (
              <div className="flex h-2 rounded-full overflow-hidden gap-0.5 mb-4">
                {(Object.keys(statusLabel) as ProjectStatus[]).map(s =>
                  data.projectsByStatus[s] ? (
                    <div
                      key={s}
                      className={statusBarColor[s]}
                      style={{ width: `${(data.projectsByStatus[s] / totalProjects) * 100}%` }}
                    />
                  ) : null,
                )}
              </div>
            )}
            <div className="space-y-2">
              {(Object.keys(statusLabel) as ProjectStatus[]).map(s => (
                <div key={s} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-muted">
                    <span className={`w-2 h-2 rounded-full ${statusBarColor[s]}`} />
                    {statusLabel[s]}
                  </span>
                  <span className="font-mono text-text">{data.projectsByStatus[s]}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-border mt-4 pt-3 flex items-center justify-between text-xs">
              <span className="text-muted">Cotizaciones ganadas</span>
              <span className="font-mono text-success">{money(stats.wonQuotesTotal)} {currency}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active projects grid */}
      {data.inProgress.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-text">Proyectos en Proceso</h2>
            <Button variant="ghost" size="sm" icon={<ArrowRight size={14} />} onClick={() => navigate('/projects')}>
              Ver todos
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {data.inProgress.map(p => (
              <div
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
                className="bg-surface border border-border rounded-xl p-4 hover:border-primary/30 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <Badge variant={priorityVariant[p.priority]}>{priorityLabel[p.priority]}</Badge>
                  <span className="text-xs text-muted font-mono">{p.doneTasks}/{p.taskCount} tareas</span>
                </div>
                <h3 className="text-sm font-semibold text-text mb-1 group-hover:text-primary transition-colors leading-snug">
                  {p.name}
                </h3>
                <p className="text-xs text-muted mb-4">{p.clientName}</p>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted">Progreso</span>
                  <span className="text-xs font-mono text-text">{p.progress}%</span>
                </div>
                <div className="h-1.5 bg-panel rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
                    style={{ width: `${p.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
