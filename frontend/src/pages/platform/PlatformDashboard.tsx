import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Building2, Users, FolderKanban, FileText, Plus, ArrowRight, ChevronRight } from 'lucide-react';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import NewWorkshopModal from '../../components/platform/NewWorkshopModal';
import { api } from '../../services/api';
import { formatDate } from '../../lib/projectLabels';
import type { PlatformSummary } from '../../types';

export default function PlatformDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<PlatformSummary | null>(null);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const load = () =>
    api<PlatformSummary>('/platform/summary/')
      .then(setData)
      .catch(() => setError('No se pudo cargar el resumen de la plataforma.'));

  useEffect(() => { load(); }, []);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!data) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[0, 1, 2, 3].map(i => <div key={i} className="h-32 bg-surface border border-border rounded-xl" />)}
      </div>
    );
  }

  const cards = [
    { label: 'Talleres activos', value: `${data.activeWorkshops}`, sub: `de ${data.workshops} registrados`, icon: Building2, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Usuarios de talleres', value: `${data.users}`, sub: `${data.clients} clientes en total`, icon: Users, color: 'text-info', bg: 'bg-info/10' },
    { label: 'Proyectos', value: `${data.projects}`, sub: `${data.activeProjects} en proceso o revisión`, icon: FolderKanban, color: 'text-warning', bg: 'bg-warning/10' },
    { label: 'Cotizaciones', value: `${data.quotes}`, sub: 'en todos los talleres', icon: FileText, color: 'text-accent', bg: 'bg-accent/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text">Plataforma CosplayCraft Hub</h2>
          <p className="text-xs text-muted">Cifras de todos los talleres. El detalle de negocio de cada uno solo lo ve ese taller.</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>Nuevo taller</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-surface border border-border rounded-xl p-5">
            <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center mb-3`}>
              <c.icon size={20} className={c.color} />
            </div>
            <p className="text-3xl font-bold text-text font-mono">{c.value}</p>
            <p className="text-xs text-text mt-0.5">{c.label}</p>
            <p className="text-xs text-muted mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-text flex items-center gap-2">
            <Building2 size={16} className="text-primary" />
            Talleres registrados recientemente
          </h3>
          <Button variant="ghost" size="sm" icon={<ArrowRight size={14} />} onClick={() => navigate('/platform/workshops')}>
            Ver todos
          </Button>
        </div>
        <div className="divide-y divide-border">
          {data.recentWorkshops.map(w => (
            <button
              key={w.id}
              onClick={() => navigate(`/platform/workshops/${w.id}`)}
              className="w-full text-left flex items-center gap-4 px-5 py-4 hover:bg-panel/50 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text truncate group-hover:text-primary transition-colors">{w.name}</p>
                <p className="text-xs text-muted mt-0.5 truncate">
                  {[w.owner, w.city].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
                </p>
              </div>
              <span className="hidden md:block text-xs text-muted font-mono whitespace-nowrap">
                {w.users} usuarios · {w.projects} proyectos
              </span>
              <span className="hidden sm:block text-xs text-muted font-mono whitespace-nowrap">{formatDate(w.createdAt)}</span>
              <Badge variant={w.isActive ? 'success' : 'muted'} dot>{w.isActive ? 'Activo' : 'Desactivado'}</Badge>
              <ChevronRight size={16} className="text-muted group-hover:text-primary transition-colors" />
            </button>
          ))}
          {data.recentWorkshops.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-muted">Todavía no hay talleres registrados.</p>
          )}
        </div>
      </div>

      <NewWorkshopModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={w => { setModalOpen(false); navigate(`/platform/workshops/${w.id}`); }}
      />
    </div>
  );
}
