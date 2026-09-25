import { useState } from 'react';
import { Plus, Search, Mail, Phone, MapPin, ChevronRight, Edit2 } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Input';
import { clients as initialClients } from '../data/mockData';
import type { Client } from '../types';

const cities = ['CDMX', 'Guadalajara', 'Monterrey', 'Puebla', 'Querétaro'];

export default function Clients() {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [form, setForm] = useState<{ name: string; email: string; phone: string; city: string; status: 'active' | 'inactive'; notes: string }>({ name: '', email: '', phone: '', city: '', status: 'active', notes: '' });

  const filtered = clients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openCreate = () => {
    setEditClient(null);
    setForm({ name: '', email: '', phone: '', city: '', status: 'active', notes: '' });
    setModalOpen(true);
  };

  const openEdit = (c: Client) => {
    setEditClient(c);
    setForm({ name: c.name, email: c.email, phone: c.phone, city: c.city, status: c.status, notes: c.notes ?? '' });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (editClient) {
      setClients(cs => cs.map(c => c.id === editClient.id ? { ...c, ...form } : c));
    } else {
      const newClient: Client = {
        id: `c${Date.now()}`,
        name: form.name,
        email: form.email,
        phone: form.phone,
        city: form.city,
        notes: form.notes,
        status: form.status as 'active' | 'inactive',
        projects: 0,
        totalSpent: 0,
        joinedAt: new Date().toISOString().split('T')[0],
      };
      setClients(cs => ([newClient, ...cs] as Client[]));
    }
    setModalOpen(false);
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }) as typeof f);

  return (
    <div className="space-y-5">
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
          <Button onClick={openCreate} icon={<Plus size={16} />}>Nuevo Cliente</Button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(c => (
          <div key={c.id} className="bg-surface border border-border rounded-xl p-5 hover:border-primary/30 transition-all group">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-text">{c.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-text">{c.name}</p>
                  <Badge variant={c.status === 'active' ? 'success' : 'muted'} dot className="mt-0.5">
                    {c.status === 'active' ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
              </div>
              <button
                onClick={() => openEdit(c)}
                className="p-1.5 rounded-lg hover:bg-panel text-muted hover:text-text transition-colors opacity-0 group-hover:opacity-100"
              >
                <Edit2 size={14} />
              </button>
            </div>

            <div className="space-y-1.5 mb-4">
              <div className="flex items-center gap-2 text-xs text-muted">
                <Mail size={12} className="flex-shrink-0" />
                <span className="truncate">{c.email}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted">
                <Phone size={12} className="flex-shrink-0" />
                <span>{c.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted">
                <MapPin size={12} className="flex-shrink-0" />
                <span>{c.city}</span>
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
        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center text-sm text-muted bg-surface border border-border rounded-xl">
            No se encontraron clientes.
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editClient ? 'Editar Cliente' : 'Nuevo Cliente'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editClient ? 'Guardar cambios' : 'Crear cliente'}</Button>
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
            options={cities.map(c => ({ value: c, label: c }))}
          />
          <Select
            label="Estado"
            value={form.status}
            onChange={set('status')}
            options={[{ value: 'active', label: 'Activo' }, { value: 'inactive', label: 'Inactivo' }]}
          />
          <Input label="Notas" value={form.notes} onChange={set('notes')} placeholder="Notas adicionales..." />
        </div>
      </Modal>
    </div>
  );
}
