import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Search, ChevronRight } from 'lucide-react';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import NewWorkshopModal from '../../components/platform/NewWorkshopModal';
import { api } from '../../services/api';
import { formatDate } from '../../lib/projectLabels';
import type { PlatformWorkshop } from '../../types';

export default function PlatformWorkshops() {
  const navigate = useNavigate();
  const [workshops, setWorkshops] = useState<PlatformWorkshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'inactive'>('');
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    api<PlatformWorkshop[]>('/platform/workshops/')
      .then(setWorkshops)
      .catch(() => setError('No se pudieron cargar los talleres.'))
      .finally(() => setLoading(false));
  }, []);

  const q = search.toLowerCase();
  const filtered = workshops.filter(w => {
    const matchSearch = [w.name, w.owner, w.city, w.email].some(v => v.toLowerCase().includes(q));
    const matchStatus = !statusFilter || (statusFilter === 'active') === w.isActive;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por taller, responsable, ciudad o correo..."
            className="w-full bg-surface border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-text placeholder-muted outline-none focus:border-primary transition-colors"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as '' | 'active' | 'inactive')}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-primary cursor-pointer"
          >
            <option value="">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Desactivados</option>
          </select>
          <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>Nuevo taller</Button>
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <p className="text-xs text-muted">
        {filtered.length} taller{filtered.length !== 1 ? 'es' : ''} · cada uno es un tenant con sus datos aislados
      </p>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['Taller', 'Ciudad', 'Usuarios', 'Clientes', 'Proyectos', 'Cotizaciones', 'Alta', 'Estado', ''].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-5 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(w => (
                <tr
                  key={w.id}
                  onClick={() => navigate(`/platform/workshops/${w.id}`)}
                  className="hover:bg-panel/50 transition-colors cursor-pointer group"
                >
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-text group-hover:text-primary transition-colors">{w.name}</p>
                    <p className="text-xs text-muted mt-0.5">{w.owner || '—'}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-muted">{w.city || '—'}</td>
                  <td className="px-5 py-4 text-sm font-mono text-text">{w.users}</td>
                  <td className="px-5 py-4 text-sm font-mono text-text">{w.clients}</td>
                  <td className="px-5 py-4 text-sm font-mono text-text">{w.projects}</td>
                  <td className="px-5 py-4 text-sm font-mono text-text">{w.quotes}</td>
                  <td className="px-5 py-4 text-xs font-mono text-muted whitespace-nowrap">{formatDate(w.createdAt)}</td>
                  <td className="px-5 py-4">
                    <Badge variant={w.isActive ? 'success' : 'muted'} dot>{w.isActive ? 'Activo' : 'Desactivado'}</Badge>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <ChevronRight size={16} className="text-muted group-hover:text-primary transition-colors ml-auto" />
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-sm text-muted">No hay talleres con esos filtros.</td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-sm text-muted">Cargando talleres…</td>
                </tr>
              )}
            </tbody>
          </table>
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
