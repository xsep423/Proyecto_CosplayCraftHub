import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft, Edit2, Plus, GripVertical,
  ClipboardList, ListTodo, Package, DollarSign, FileText, Calendar, User,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Tabs from '../components/ui/Tabs';
import { projects, tasks as allTasks, materials } from '../data/mockData';
import type { Task, TaskStatus } from '../types';

const statusVariant: Record<string, 'primary' | 'warning' | 'success' | 'muted' | 'danger'> = {
  planning: 'muted', in_progress: 'primary', review: 'warning', completed: 'success', on_hold: 'danger',
};
const statusLabel: Record<string, string> = {
  planning: 'Planificación', in_progress: 'En Proceso', review: 'Revisión', completed: 'Completado', on_hold: 'En Pausa',
};
const priorityVariant: Record<string, 'danger' | 'warning' | 'info' | 'muted'> = {
  urgent: 'danger', high: 'warning', medium: 'info', low: 'muted',
};

const columns: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'todo', label: 'Por Hacer', color: 'text-muted' },
  { id: 'in_progress', label: 'En Proceso', color: 'text-primary' },
  { id: 'review', label: 'Revisión', color: 'text-warning' },
  { id: 'done', label: 'Listo', color: 'text-success' },
];

function KanbanBoard({ projectId }: { projectId: string }) {
  const [tasks, setTasks] = useState<Task[]>(
    allTasks.filter(t => t.projectId === projectId)
  );
  const [dragging, setDragging] = useState<string | null>(null);

  const moveTask = (taskId: string, newStatus: TaskStatus) => {
    setTasks(ts => ts.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
      {columns.map(col => {
        const colTasks = tasks.filter(t => t.status === col.id);
        return (
          <div
            key={col.id}
            className="flex flex-col min-h-[280px]"
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault();
              if (dragging) { moveTask(dragging, col.id); setDragging(null); }
            }}
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <span className={`text-xs font-semibold uppercase tracking-wider ${col.color}`}>{col.label}</span>
              <span className="text-xs font-mono text-muted bg-panel px-2 py-0.5 rounded-full">{colTasks.length}</span>
            </div>
            <div
              className={`
                flex-1 rounded-xl p-2 space-y-2 min-h-[240px]
                border-2 border-dashed transition-colors duration-150
                ${dragging ? 'border-primary/40 bg-primary/5' : 'border-border bg-panel/30'}
              `}
            >
              {colTasks.map(task => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => setDragging(task.id)}
                  onDragEnd={() => setDragging(null)}
                  className={`
                    bg-surface border border-border rounded-lg p-3 cursor-grab
                    hover:border-primary/40 transition-all group
                    ${dragging === task.id ? 'opacity-50 scale-95' : ''}
                  `}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <GripVertical size={13} className="text-muted mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <p className="text-xs font-medium text-text leading-snug flex-1">{task.title}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant={priorityVariant[task.priority]}>{task.priority}</Badge>
                    {task.assignee && (
                      <span className="text-xs text-muted truncate max-w-[80px]">{task.assignee.split(' ')[0]}</span>
                    )}
                  </div>
                  {task.dueDate && (
                    <p className="text-xs text-muted mt-1.5 font-mono">
                      {new Date(task.dueDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                    </p>
                  )}
                </div>
              ))}
              {colTasks.length === 0 && (
                <div className="h-full flex items-center justify-center">
                  <p className="text-xs text-muted/50">Arrastra tareas aquí</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const project = projects.find(p => p.id === id) ?? projects[0];

  const projectMaterials = materials.slice(0, 5);
  const totalBudget = project.budget;
  const spent = project.spent;
  const remaining = totalBudget - spent;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });

  const tabs = [
    { id: 'summary', label: 'Resumen', icon: <ClipboardList size={14} /> },
    { id: 'tasks', label: 'Tareas', icon: <ListTodo size={14} />, badge: allTasks.filter(t => t.projectId === project.id).length },
    { id: 'materials', label: 'Materiales', icon: <Package size={14} /> },
    { id: 'costs', label: 'Costos', icon: <DollarSign size={14} /> },
    { id: 'quote', label: 'Cotización', icon: <FileText size={14} /> },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-surface border border-transparent hover:border-border text-muted hover:text-text transition-all mt-0.5"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <h2 className="text-xl font-bold text-text">{project.name}</h2>
            <Badge variant={statusVariant[project.status]} dot>{statusLabel[project.status]}</Badge>
            <Badge variant={priorityVariant[project.priority]}>{project.priority}</Badge>
          </div>
          <p className="text-sm text-muted">{project.clientName} · {project.responsible}</p>
        </div>
        <Button variant="secondary" size="sm" icon={<Edit2 size={14} />} className="hidden sm:flex flex-shrink-0">
          Editar
        </Button>
      </div>

      {/* Progress bar */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-text">Progreso general</span>
          <span className="text-sm font-bold font-mono text-primary">{project.progress}%</span>
        </div>
        <div className="h-2 bg-panel rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
            style={{ width: `${project.progress}%` }}
          />
        </div>
        <div className="flex items-center gap-6 mt-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Calendar size={13} />
            <span>Inicio: <span className="text-text font-medium">{formatDate(project.startDate)}</span></span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted">
            <Calendar size={13} />
            <span>Entrega: <span className="text-text font-medium">{formatDate(project.dueDate)}</span></span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted">
            <User size={13} />
            <span>Responsable: <span className="text-text font-medium">{project.responsible}</span></span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <Tabs tabs={tabs}>
          {(active) => {
            if (active === 'summary') return (
              <div className="p-5 space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Descripción</h3>
                  <p className="text-sm text-text leading-relaxed">{project.description}</p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Etiquetas</h3>
                  <div className="flex gap-2 flex-wrap">
                    {project.tags.map(tag => (
                      <Badge key={tag} variant="primary">#{tag}</Badge>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Presupuesto', value: `$${totalBudget.toLocaleString('es-MX')}` },
                    { label: 'Gastado', value: `$${spent.toLocaleString('es-MX')}` },
                    { label: 'Disponible', value: `$${remaining.toLocaleString('es-MX')}` },
                    { label: '% Ejecutado', value: `${Math.round((spent / totalBudget) * 100)}%` },
                  ].map(s => (
                    <div key={s.label} className="bg-panel rounded-lg p-4">
                      <p className="text-xs text-muted mb-1">{s.label}</p>
                      <p className="text-lg font-bold font-mono text-text">{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            );

            if (active === 'tasks') return (
              <div className="p-5">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted">Arrastra las tarjetas entre columnas para actualizar el estado</p>
                  <Button variant="outline" size="sm" icon={<Plus size={14} />}>
                    Nueva tarea
                  </Button>
                </div>
                <KanbanBoard projectId={project.id} />
              </div>
            );

            if (active === 'materials') return (
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-text">Materiales del proyecto</h3>
                  <Button variant="outline" size="sm" icon={<Plus size={14} />}>Agregar</Button>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {['Material', 'Cantidad', 'Unidad', 'Costo unit.', 'Subtotal'].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-muted uppercase tracking-wider pb-3 pr-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {projectMaterials.map(m => (
                      <tr key={m.id} className="hover:bg-panel/30 transition-colors">
                        <td className="py-3 pr-4 text-sm text-text">{m.name}</td>
                        <td className="py-3 pr-4 text-sm font-mono text-muted">{Math.floor(Math.random() * 5) + 1}</td>
                        <td className="py-3 pr-4 text-sm text-muted">{m.unit}</td>
                        <td className="py-3 pr-4 text-sm font-mono text-muted">${m.unitCost.toLocaleString('es-MX')}</td>
                        <td className="py-3 text-sm font-mono text-text">${(m.unitCost * 2).toLocaleString('es-MX')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

            if (active === 'costs') return (
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: 'Materiales', value: spent * 0.6, color: 'bg-primary' },
                    { label: 'Mano de obra', value: spent * 0.35, color: 'bg-accent' },
                    { label: 'Otros', value: spent * 0.05, color: 'bg-info' },
                  ].map(c => (
                    <div key={c.label} className="bg-panel rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`w-2 h-2 rounded-full ${c.color}`} />
                        <span className="text-xs font-medium text-muted">{c.label}</span>
                      </div>
                      <p className="text-2xl font-bold font-mono text-text">${c.value.toLocaleString('es-MX', { maximumFractionDigits: 0 })}</p>
                      <p className="text-xs text-muted mt-1">{Math.round((c.value / spent) * 100)}% del gasto total</p>
                    </div>
                  ))}
                </div>
                <div className="bg-panel rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-text">Ejecución presupuestal</span>
                    <span className="text-sm font-mono text-text">${spent.toLocaleString('es-MX')} / ${totalBudget.toLocaleString('es-MX')}</span>
                  </div>
                  <div className="h-3 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                      style={{ width: `${Math.min((spent / totalBudget) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );

            if (active === 'quote') return (
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-text">Cotización del proyecto</h3>
                    <p className="text-xs text-muted mt-0.5">Vista previa de los costos para el cliente</p>
                  </div>
                  <Button variant="outline" size="sm" icon={<FileText size={14} />}>Ver cotización</Button>
                </div>
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="bg-panel/50 px-5 py-4 flex items-center justify-between border-b border-border">
                    <div>
                      <p className="text-sm font-semibold text-text">{project.name}</p>
                      <p className="text-xs text-muted">{project.clientName}</p>
                    </div>
                    <Badge variant="warning" dot>Borrador</Badge>
                  </div>
                  <div className="p-5 space-y-2">
                    {[
                      { desc: 'Materiales y estructura', qty: 1, price: totalBudget * 0.45 },
                      { desc: 'Confección y acabados', qty: 1, price: totalBudget * 0.35 },
                      { desc: 'Props y accesorios', qty: 1, price: totalBudget * 0.12 },
                      { desc: 'Instalación y prueba', qty: 1, price: totalBudget * 0.08 },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-1">
                        <span className="text-sm text-text">{item.desc}</span>
                        <span className="text-sm font-mono text-muted">${item.price.toLocaleString('es-MX', { maximumFractionDigits: 0 })}</span>
                      </div>
                    ))}
                    <div className="border-t border-border pt-3 flex items-center justify-between">
                      <span className="text-sm font-semibold text-text">Total</span>
                      <span className="text-lg font-bold font-mono text-primary">${totalBudget.toLocaleString('es-MX')}</span>
                    </div>
                  </div>
                </div>
              </div>
            );

            return null;
          }}
        </Tabs>
      </div>
    </div>
  );
}
