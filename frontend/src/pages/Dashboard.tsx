import { useNavigate } from 'react-router';
import {
  FolderKanban, Users, Package, FileText,
  AlertTriangle, Clock, TrendingUp, ArrowRight, CalendarDays,
} from 'lucide-react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { projects, clients, materials, quotes } from '../data/mockData';

const statCards = [
  {
    label: 'Proyectos Activos',
    value: projects.filter(p => p.status === 'in_progress' || p.status === 'review').length,
    icon: FolderKanban,
    color: 'text-primary',
    bg: 'bg-primary/10',
    trend: '+2 este mes',
    trendUp: true,
  },
  {
    label: 'Clientes',
    value: clients.filter(c => c.status === 'active').length,
    icon: Users,
    color: 'text-info',
    bg: 'bg-info/10',
    trend: '+1 esta semana',
    trendUp: true,
  },
  {
    label: 'Materiales con Alerta',
    value: materials.filter(m => m.stock === 'low' || m.stock === 'critical' || m.stock === 'out').length,
    icon: Package,
    color: 'text-warning',
    bg: 'bg-warning/10',
    trend: '3 críticos',
    trendUp: false,
  },
  {
    label: 'Cotizaciones Pendientes',
    value: quotes.filter(q => q.status === 'sent' || q.status === 'draft').length,
    icon: FileText,
    color: 'text-accent',
    bg: 'bg-accent/10',
    trend: `$${quotes.filter(q => q.status === 'sent').reduce((a, q) => {
      const sub = q.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
      return a + sub * (1 - q.discount / 100) * (1 + q.tax / 100);
    }, 0).toLocaleString('es-MX')} MXN`,
    trendUp: true,
  },
];

const statusVariant: Record<string, 'primary' | 'warning' | 'success' | 'muted' | 'danger'> = {
  planning: 'muted',
  in_progress: 'primary',
  review: 'warning',
  completed: 'success',
  on_hold: 'danger',
};

const statusLabel: Record<string, string> = {
  planning: 'Planificación',
  in_progress: 'En Proceso',
  review: 'Revisión',
  completed: 'Completado',
  on_hold: 'En Pausa',
};

const priorityVariant: Record<string, 'danger' | 'warning' | 'info' | 'muted'> = {
  urgent: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'muted',
};

const alerts = [
  { type: 'warning', text: 'Worbla Thermoplastic: stock crítico (2 m²)', icon: AlertTriangle },
  { type: 'warning', text: 'Spray Plateado Metálico: stock crítico (2 latas)', icon: AlertTriangle },
  { type: 'warning', text: 'Tela Velvet Morado: sin existencias', icon: AlertTriangle },
  { type: 'info', text: 'Proyecto Arthas: entrega en 20 días', icon: Clock },
  { type: 'info', text: 'Cotización CCH-2025-045 enviada hace 13 días — sin respuesta', icon: Clock },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const upcomingProjects = projects
    .filter(p => p.status !== 'completed')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  const recentProjects = projects
    .filter(p => p.status === 'in_progress')
    .slice(0, 4);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

  const daysUntil = (d: string) => {
    const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
    return diff;
  };

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <div key={i} className="bg-surface border border-border rounded-xl p-5 hover:border-primary/30 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon size={20} className={s.color} />
              </div>
              <span className={`text-xs flex items-center gap-1 ${s.trendUp ? 'text-success' : 'text-warning'}`}>
                <TrendingUp size={12} />
                {s.trend}
              </span>
            </div>
            <p className="text-3xl font-bold text-text font-mono">{s.value}</p>
            <p className="text-xs text-muted mt-0.5">{s.label}</p>
          </div>
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
          <div className="divide-y divide-border">
            {upcomingProjects.map(p => {
              const days = daysUntil(p.dueDate);
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-panel/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/projects/${p.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate">{p.name}</p>
                    <p className="text-xs text-muted mt-0.5">{p.clientName} · {p.responsible}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Badge variant={statusVariant[p.status]} dot>{statusLabel[p.status]}</Badge>
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-mono text-text">{formatDate(p.dueDate)}</p>
                      <p className={`text-xs font-medium ${days <= 7 ? 'text-danger' : days <= 21 ? 'text-warning' : 'text-muted'}`}>
                        {days > 0 ? `${days}d restantes` : `Vencido hace ${Math.abs(days)}d`}
                      </p>
                    </div>
                  </div>
                  <div className="w-20 hidden md:block">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted">{p.progress}%</span>
                    </div>
                    <div className="h-1.5 bg-panel rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${p.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-text flex items-center gap-2">
              <AlertTriangle size={16} className="text-warning" />
              Alertas
            </h2>
          </div>
          <div className="divide-y divide-border">
            {alerts.map((a, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                <a.icon
                  size={15}
                  className={`mt-0.5 flex-shrink-0 ${a.type === 'warning' ? 'text-warning' : 'text-info'}`}
                />
                <p className="text-xs text-muted leading-relaxed">{a.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active projects grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-text">Proyectos en Proceso</h2>
          <Button variant="ghost" size="sm" icon={<ArrowRight size={14} />} onClick={() => navigate('/projects')}>
            Ver todos
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {recentProjects.map(p => (
            <div
              key={p.id}
              onClick={() => navigate(`/projects/${p.id}`)}
              className="bg-surface border border-border rounded-xl p-4 hover:border-primary/30 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <Badge variant={priorityVariant[p.priority]}>{p.priority}</Badge>
                <Badge variant={statusVariant[p.status]} dot>{statusLabel[p.status]}</Badge>
              </div>
              <h3 className="text-sm font-semibold text-text mb-1 group-hover:text-primary transition-colors leading-snug">
                {p.name}
              </h3>
              <p className="text-xs text-muted mb-4">{p.clientName}</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
