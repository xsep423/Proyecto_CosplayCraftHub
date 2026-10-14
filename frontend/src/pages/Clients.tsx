import { useEffect, useState } from 'react';
import { Plus, Search, Mail, Phone, MapPin, Edit2, Trash2 } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Input';
import type { Client } from '../types';
import { api } from '../services/api';
import { getRole } from '../lib/auth';

const cities = ['Tijuana', 'CDMX', 'Guadalajara', 'Monterrey', 'Puebla', 'Querétaro'];

type FormState = {
  name: string;
  email: string;
  phone: string;
  city: string;
  status: 'active' | 'inactive';
  notes: string;
};

const emptyForm: FormState = { name: '', email: '', phone: '', city: '', status: 'active', notes: '' };

function errorMessage(e: unknown, fallback: string): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object') {
    const obj = e as Record<string, unknown>;
    if (typeof obj.detail === 'string') return obj.detail;
    const first = Object.values(obj).flat()[0];
    if (typeof first === 'string') return first;
  }
  return fallback;
}

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const role = getRole();
  const canEdit = role !== 'viewer';
  const canDelete = role === 'admin';

  useEffect(() => {
    api<Client[]>('/clientes/')
      .then(setClients)
      .catch(() => setError('No se pudieron cargar los clientes.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = clients.filter(c => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openCreate = () => {
    setEditClient(null);
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (c: Client) => {
    setEditClient(c);
    setForm({
      name: c.name,
      email: c.email,
      phone: c.phone ?? '',
      city: c.city ?? '',
      status: c.status,
      notes: c.notes ?? '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      setFormError('El nombre y el correo son obligatorios.');
      return;
    }
    setSaving(true);
    setFormError('');
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone,
      city: form.city,
      status: form.status,
      notes: form.notes,
    };
    try {
      if (editClient) {
        const updated = await api<Client>(`/clientes/${editClient.id}/`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        setClients(cs => cs.map(c => (c.id === updated.id ? updated : c)));
      } else {
        const created = await api<Client>('/clientes/', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setClients(cs => [created, ...cs]);
      }
      setModalOpen(false);
    } catch (e) {
      setFormError(errorMessage(e, 'No se pudo guardar el cliente.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await api<void>(`/clientes/${deleteTarget.id}/`, { method: 'DELETE' });
      setClients(cs => cs.filter(c => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      setDeleteError(errorMessage(e, 'No se pudo eliminar el cliente.'));
    } finally {
      setDeleting(false);
    }
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }) as typeof f);

  const cityOptions = Array.from(new Set([...cities, ...(form.city ? [form.city] : [])]));

  return (
    <div className="space-y-5">
      {error && <p className="text-sm text-red-400">{error}</p>}
      {loading && <p className="text-sm text-muted">Cargando clientes...</p>}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o correo..."
            className="w-full bg-surface border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-text placeholder-muted outline-none focus:border-primary transition-colors"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-primary cursor-pointer"
          >
            <option value="">Todos</option>
            <option value="active" className="bg-surface">Activos</option>
            <option value="inactive" className="bg-surface">Inactivos</option>
          </select>
          {canEdit && (
            <Button onClick={openCreate} icon={<Plus size={16} />}>Nuevo Cliente</Button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(c => (
          <div key={c.id} className="bg-surface border border-border rounded-xl p-5 hover:border-primary/30 transition-all group">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-text">{c.name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2)}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-text">{c.name}</p>
                  <Badge variant={c.status === 'active' ? 'success' : 'muted'} dot className="mt-0.5">
                    {c.status === 'active' ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
              </div>
              {canEdit && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(c)}
                    className="p-1.5 rounded-lg hover:bg-panel text-muted hover:text-text transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={14} />
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => { setDeleteTarget(c); setDeleteError(''); }}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-muted hover:text-red-400 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5 mb-4">
              <div className="flex items-center gap-2 text-xs text-muted">
                <Mail size={12} className="flex-shrink-0" />
                <span className="truncate">{c.email}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted">
                <Phone size={12} className="flex-shrink-0" />
                <span>{c.phone || '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted">
                <MapPin size={12} className="flex-shrink-0" />
                <span>{c.city || '—'}</span>
              </div>
            </div>

            <div className="border-t border-border pt-3 flex items-center justify-between">
              <div className="text-center">
                <p className="text-sm font-bold font-mono text-text">{c.projects}</p>
                <p className="text-xs text-muted">proyectos</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold font-mono text-text">${c.totalSpent.toLocaleString('es-MX')}</p>
                <p className="text-xs text-muted">total MXN</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-muted">{new Date(c.joinedAt).getFullYear()}</p>
                <p className="text-xs text-muted">desde</p>
              </div>
            </div>
          </div>
        ))}
        {!loading && filtered.length === 0 && (
          <div className="col-span-full py-16 text-center text-sm text-muted bg-surface border border-border rounded-xl">
            No se encontraron clientes.
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editClient ? 'Editar Cliente' : 'Nuevo Cliente'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : editClient ? 'Guardar cambios' : 'Crear cliente'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Nombre completo" value={form.name} onChange={set('name')} placeholder="Nombre del cliente" required />
          <Input label="Correo electrónico" type="email" value={form.email} onChange={set('email')} placeholder="correo@ejemplo.com" required />
          <Input label="Teléfono" value={form.phone} onChange={set('phone')} placeholder="+52 55 1234-5678" />
          <Select
            label="Ciudad"
            value={form.city}
            onChange={set('city')}
            placeholder="Seleccionar ciudad"
            options={cityOptions.map(c => ({ value: c, label: c }))}
          />
          <Select
            label="Estado"
            value={form.status}
            onChange={set('status')}
            options={[{ value: 'active', label: 'Activo' }, { value: 'inactive', label: 'Inactivo' }]}
          />
          <Input label="Notas" value={form.notes} onChange={set('notes')} placeholder="Notas adicionales..." />
          {formError && <p className="text-xs text-red-400">{formError}</p>}
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar cliente"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-text">
            ¿Seguro que quieres eliminar a <span className="font-semibold">{deleteTarget?.name}</span>?
          </p>
          <p className="text-xs text-muted">Esta acción no se puede deshacer.</p>
          {deleteError && <p className="text-xs text-red-400">{deleteError}</p>}
        </div>
      </Modal>
    </div>
  );
}