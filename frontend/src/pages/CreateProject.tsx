import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Save } from 'lucide-react';
import Button from '../components/ui/Button';
import { Input, Textarea, Select } from '../components/ui/Input';
import { api } from '../services/api';
import { statusLabel, priorityLabel } from '../lib/projectLabels';
import type { Option, Project } from '../types';

type Form = {
  name: string;
  clientId: string;
  description: string;
  responsibleId: string;
  status: string;
  priority: string;
  startDate: string;
  dueDate: string;
  budget: string;
  laborCost: string;
  otherCost: string;
  tags: string;
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const emptyForm: Form = {
  name: '', clientId: '', description: '', responsibleId: '', status: 'planning',
  priority: '', startDate: today(), dueDate: '', budget: '', laborCost: '', otherCost: '', tags: '',
};

/** Crear proyecto (/projects/new) y editar proyecto (/projects/:id/edit). */
export default function CreateProject() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<Form>(emptyForm);
  const [clients, setClients] = useState<Option[]>([]);
  const [members, setMembers] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    const requests: Promise<unknown>[] = [
      api<Option[]>('/quotes/clients/').then(setClients),
      api<Option[]>('/auth/members/').then(setMembers),
    ];
    if (id) {
      requests.push(
        api<Project>(`/projects/${id}/`).then(p => setForm({
          name: p.name,
          clientId: String(p.clientId),
          description: p.description,
          responsibleId: p.responsibleId ? String(p.responsibleId) : '',
          status: p.status,
          priority: p.priority,
          startDate: p.startDate,
          dueDate: p.dueDate,
          budget: String(p.budget),
          laborCost: String(p.laborCost),
          otherCost: String(p.otherCost),
          tags: p.tags.join(', '),
        })),
      );
    }
    Promise.all(requests)
      .catch(() => setError('No se pudo cargar la información.'))
      .finally(() => setLoadingData(false));
  }, [id]);

  const set = (key: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setError('');

    const payload = {
      name: form.name.trim(),
      clientId: Number(form.clientId),
      description: form.description,
      responsibleId: form.responsibleId ? Number(form.responsibleId) : null,
      status: form.status,
      priority: form.priority,
      startDate: form.startDate,
      dueDate: form.dueDate,
      budget: Number(form.budget || 0),
      laborCost: Number(form.laborCost || 0),
      otherCost: Number(form.otherCost || 0),
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    };

    try {
      const saved = await api<Project>(isEdit ? `/projects/${id}/` : '/projects/', {
        method: isEdit ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });
      navigate(`/projects/${saved.id}`, { replace: true });
    } catch (err) {
      const fieldErrors: Record<string, string> = {};
      if (err && typeof err === 'object') {
        for (const [k, v] of Object.entries(err as Record<string, unknown>)) {
          if (Array.isArray(v)) fieldErrors[k] = String(v[0]);
        }
        const detail = (err as { detail?: string }).detail;
        if (detail) setError(detail);
      }
      setErrors(fieldErrors);
      if (!Object.keys(fieldErrors).length && !(err as { detail?: string })?.detail) {
        setError('No se pudo guardar el proyecto.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return <p className="text-sm text-muted">Cargando…</p>;
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-surface border border-transparent hover:border-border text-muted hover:text-text transition-all"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-text">{isEdit ? 'Editar Proyecto' : 'Nuevo Proyecto'}</h2>
          <p className="text-xs text-muted">Completa la información del proyecto cosplay</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section: Información básica */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-text mb-4 pb-3 border-b border-border">
            Información básica
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nombre del proyecto"
              value={form.name}
              onChange={set('name')}
              placeholder="Ej: Arthas Menethil – Lich King"
              error={errors.name}
              required
              className="sm:col-span-2"
            />
            <Select
              label="Cliente"
              value={form.clientId}
              onChange={set('clientId')}
              placeholder={clients.length ? 'Seleccionar cliente' : 'Primero registra un cliente'}
              error={errors.clientId}
              required
              options={clients.map(c => ({ value: String(c.id), label: c.name }))}
            />
            <Select
              label="Responsable"
              value={form.responsibleId}
              onChange={set('responsibleId')}
              placeholder="Sin asignar"
              error={errors.responsibleId}
              options={members.map(u => ({ value: String(u.id), label: u.name }))}
            />
            <Textarea
              label="Descripción"
              value={form.description}
              onChange={set('description')}
              placeholder="Describe los materiales, técnicas y detalles del cosplay..."
              className="sm:col-span-2"
            />
            <Input
              label="Etiquetas"
              value={form.tags}
              onChange={set('tags')}
              placeholder="anime, armadura, LED (separadas por comas)"
              error={errors.tags}
              className="sm:col-span-2"
            />
          </div>
        </div>

        {/* Section: Planificación */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-text mb-4 pb-3 border-b border-border">
            Planificación y prioridad
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Estado"
              value={form.status}
              onChange={set('status')}
              required
              options={Object.entries(statusLabel).map(([value, label]) => ({ value, label }))}
            />
            <Select
              label="Prioridad"
              value={form.priority}
              onChange={set('priority')}
              placeholder="Seleccionar"
              error={errors.priority}
              required
              options={Object.entries(priorityLabel).map(([value, label]) => ({ value, label }))}
            />
            <Input
              label="Fecha de inicio"
              type="date"
              value={form.startDate}
              onChange={set('startDate')}
              error={errors.startDate}
              required
            />
            <Input
              label="Fecha de entrega"
              type="date"
              value={form.dueDate}
              onChange={set('dueDate')}
              error={errors.dueDate}
              required
            />
          </div>
        </div>

        {/* Section: Presupuesto */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-text mb-4 pb-3 border-b border-border">
            Presupuesto y costos
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Presupuesto (MXN)"
              type="number"
              min="0"
              step="0.01"
              value={form.budget}
              onChange={set('budget')}
              placeholder="0.00"
              error={errors.budget}
              hint="Total aprobado"
            />
            <Input
              label="Mano de obra"
              type="number"
              min="0"
              step="0.01"
              value={form.laborCost}
              onChange={set('laborCost')}
              placeholder="0.00"
              error={errors.laborCost}
            />
            <Input
              label="Otros gastos"
              type="number"
              min="0"
              step="0.01"
              value={form.otherCost}
              onChange={set('otherCost')}
              placeholder="0.00"
              error={errors.otherCost}
            />
          </div>
          <p className="text-xs text-muted mt-3">
            El costo de materiales se calcula solo con lo que asignes desde el inventario.
          </p>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 py-2">
          <Button variant="secondary" type="button" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} icon={<Save size={16} />}>
            {isEdit ? 'Guardar cambios' : 'Crear Proyecto'}
          </Button>
        </div>
      </form>
    </div>
  );
}
