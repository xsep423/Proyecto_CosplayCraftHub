import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Search, ChevronRight } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { api } from '../services/api';
import { getRole } from '../lib/auth';
import {
  statusLabel, statusVariant, priorityLabel, priorityVariant, formatDate, daysUntil,
} from '../lib/projectLabels';
import type { Project, ProjectStatus, Priority } from '../types';

export default function Projects() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<Priority | ''>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const canCreate = getRole() !== 'viewer';

  useEffect(() => {
    api<Project[]>('/projects/')
      .then(setProjects)
      .catch(() => setError('No se pudieron cargar los proyectos.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = projects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.clientName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || p.status === statusFilter;
    const matchPriority = !priorityFilter || p.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar proyectos o clientes..."
            className="w-full bg-surface border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-text placeholder-muted outline-none focus:border-primary transition-colors"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as ProjectStatus | '')}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-primary transition-colors cursor-pointer"
          >
            <option value="">Todos los estados</option>
            {Object.entries(statusLabel).map(([v, l]) => (
              <option key={v} value={v} className="bg-surface">{l}</option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value as Priority | '')}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-primary transition-colors cursor-pointer"
          >
            <option value="">Todas las prioridades</option>
            {Object.entries(priorityLabel).map(([v, l]) => (
              <option key={v} value={v} className="bg-surface">{l}</option>
            ))}
          </select>
          {canCreate && (
            <Button onClick={() => navigate('/projects/new')} icon={<Plus size={16} />}>
              Nuevo
            </Button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* Count */}
      <p className="text-xs text-muted">
        {filtered.length} proyecto{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['Proyecto', 'Cliente', 'Estado', 'Prioridad', 'Progreso', 'Entrega', ''].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(p => (
                <tr
                  key={p.id}
                  className="hover:bg-panel/50 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/projects/${p.id}`)}
                >
                  <td className="px-5 py-4">
                    <div>
                      <p className="text-sm font-medium text-text group-hover:text-primary transition-colors">{p.name}</p>
                      <p className="text-xs text-muted mt-0.5">{p.responsible || 'Sin responsable'}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-muted">{p.clientName}</td>
                  <td className="px-5 py-4">
                    <Badge variant={statusVariant[p.status]} dot>{statusLabel[p.status]}</Badge>
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={priorityVariant[p.priority]}>{priorityLabel[p.priority]}</Badge>
                  </td>
                  <td className="px-5 py-4 w-32">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-panel rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${p.progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-muted w-9 text-right">{p.progress}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-xs font-mono whitespace-nowrap">
                    <span className={
                      p.status !== 'completed' && daysUntil(p.dueDate) < 0 ? 'text-danger' : 'text-muted'
                    }>
                      {formatDate(p.dueDate)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <ChevronRight size={16} className="text-muted group-hover:text-primary transition-colors ml-auto" />
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-muted">
                    {projects.length === 0
                      ? 'Todavía no hay proyectos en este taller.'
                      : 'No se encontraron proyectos con esos filtros.'}
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-muted">Cargando proyectos…</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
