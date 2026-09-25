import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Save } from 'lucide-react';
import Button from '../components/ui/Button';
import { Input, Textarea, Select } from '../components/ui/Input';
import { clients, users } from '../data/mockData';

export default function CreateProject() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    clientId: '',
    description: '',
    responsible: '',
    priority: '',
    startDate: '',
    dueDate: '',
    budget: '',
    tags: '',
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => navigate('/projects'), 1000);
  };

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
          <h2 className="text-lg font-semibold text-text">Nuevo Proyecto</h2>
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
              required
              className="sm:col-span-2"
            />
            <Select
              label="Cliente"
              value={form.clientId}
              onChange={set('clientId')}
              placeholder="Seleccionar cliente"
              required
              options={clients.map(c => ({ value: c.id, label: c.name }))}
            />
            <Select
              label="Responsable"
              value={form.responsible}
              onChange={set('responsible')}
              placeholder="Asignar responsable"
              required
              options={users.filter(u => u.active).map(u => ({ value: u.name, label: u.name }))}
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
              placeholder="anime, armor, LED (separadas por comas)"
              className="sm:col-span-2"
            />
          </div>
        </div>

        {/* Section: Planificación */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-text mb-4 pb-3 border-b border-border">
            Planificación y prioridad
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Prioridad"
              value={form.priority}
              onChange={set('priority')}
              placeholder="Seleccionar"
              required
              options={[
                { value: 'low', label: 'Baja' },
                { value: 'medium', label: 'Media' },
                { value: 'high', label: 'Alta' },
                { value: 'urgent', label: 'Urgente' },
              ]}
            />
            <Input
              label="Fecha de inicio"
              type="date"
              value={form.startDate}
              onChange={set('startDate')}
              required
            />
            <Input
              label="Fecha de entrega"
              type="date"
              value={form.dueDate}
              onChange={set('dueDate')}
              required
            />
          </div>
        </div>

        {/* Section: Presupuesto */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-text mb-4 pb-3 border-b border-border">
            Presupuesto
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Presupuesto estimado (MXN)"
              type="number"
              value={form.budget}
              onChange={set('budget')}
              placeholder="0.00"
              hint="Presupuesto total aprobado para el proyecto"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 py-2">
          <Button variant="secondary" type="button" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} icon={<Save size={16} />}>
            Crear Proyecto
          </Button>
        </div>
      </form>
    </div>
  );
}
