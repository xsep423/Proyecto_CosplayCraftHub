import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft, Edit2, Plus, GripVertical, Trash2,
  ClipboardList, ListTodo, Package, DollarSign, FileText, Calendar, User,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Tabs from '../components/ui/Tabs';
import Modal from '../components/ui/Modal';
import { Input, Select, Textarea } from '../components/ui/Input';
import { api } from '../services/api';
import { getRole } from '../lib/auth';
import {
  statusLabel, statusVariant, priorityLabel, priorityVariant, taskStatusLabel,
  formatDate, money, apiErrorMessage,
} from '../lib/projectLabels';
import type {
  Material, Option, Priority, Project, ProjectMaterial, ProjectStatus, Quote, Task, TaskStatus,
} from '../types';

const columns: { id: TaskStatus; color: string }[] = [
  { id: 'todo', color: 'text-muted' },
  { id: 'in_progress', color: 'text-primary' },
  { id: 'review', color: 'text-warning' },
  { id: 'done', color: 'text-success' },
];

const quoteStatusLabel: Record<string, string> = {
  draft: 'Borrador', sent: 'Enviada', approved: 'Aprobada', rejected: 'Rechazada', invoiced: 'Facturada',
};
const quoteStatusVariant: Record<string, 'muted' | 'info' | 'success' | 'danger' | 'primary'> = {
  draft: 'muted', sent: 'info', approved: 'success', rejected: 'danger', invoiced: 'primary',
};

type TaskForm = {
  title: string; description: string; status: TaskStatus;
  priority: Priority | ''; assigneeId: string; dueDate: string;
};

const emptyTask: TaskForm = {
  title: '', description: '', status: 'todo', priority: 'medium', assigneeId: '', dueDate: '',
};

// ---------------------------------------------------------------------------
// Kanban
// ---------------------------------------------------------------------------

function KanbanBoard({
  tasks, canEdit, onMove, onOpen,
}: {
  tasks: Task[];
  canEdit: boolean;
  onMove: (task: Task, status: TaskStatus) => void;
  onOpen: (task: Task) => void;
}) {
  const [dragging, setDragging] = useState<number | null>(null);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
      {columns.map(col => {
        const colTasks = tasks.filter(t => t.status === col.id);
        return (
          <div
            key={col.id}
            className="flex flex-col min-h-[280px]"
            onDragOver={e => canEdit && e.preventDefault()}
            onDrop={e => {
              e.preventDefault();
              const task = tasks.find(t => t.id === dragging);
              if (task && task.status !== col.id) onMove(task, col.id);
              setDragging(null);
            }}
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <span className={`text-xs font-semibold uppercase tracking-wider ${col.color}`}>
                {taskStatusLabel[col.id]}
              </span>
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
                  draggable={canEdit}
                  onDragStart={() => setDragging(task.id)}
                  onDragEnd={() => setDragging(null)}
                  onClick={() => onOpen(task)}
                  className={`
                    bg-surface border border-border rounded-lg p-3
                    ${canEdit ? 'cursor-grab' : 'cursor-pointer'}
                    hover:border-primary/40 transition-all group
                    ${dragging === task.id ? 'opacity-50 scale-95' : ''}
                  `}
                >
                  <div className="flex items-start gap-2 mb-2">
                    {canEdit && (
                      <GripVertical size={13} className="text-muted mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                    <p className="text-xs font-medium text-text leading-snug flex-1">{task.title}</p>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={priorityVariant[task.priority]}>{priorityLabel[task.priority]}</Badge>
                    {task.assignee && (
                      <span className="text-xs text-muted truncate max-w-[90px]">{task.assignee.split(' ')[0]}</span>
                    )}
                  </div>
                  {task.dueDate && (
                    <p className="text-xs text-muted mt-1.5 font-mono">{formatDate(task.dueDate)}</p>
                  )}
                </div>
              ))}
              {colTasks.length === 0 && (
                <div className="h-full flex items-center justify-center py-10">
                  <p className="text-xs text-muted/50">{canEdit ? 'Arrastra tareas aquí' : 'Sin tareas'}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const role = getRole();
  const canEdit = role !== 'viewer';
  const canDelete = role === 'admin';

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [usedMaterials, setUsedMaterials] = useState<ProjectMaterial[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [members, setMembers] = useState<Option[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [actionError, setActionError] = useState('');

  // Modal de tarea
  const [taskModal, setTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState<TaskForm>(emptyTask);
  const [taskError, setTaskError] = useState('');
  const [savingTask, setSavingTask] = useState(false);

  // Modal de material
  const [materialModal, setMaterialModal] = useState(false);
  const [inventory, setInventory] = useState<Material[]>([]);
  const [materialForm, setMaterialForm] = useState({ materialId: '', quantity: '' });
  const [materialError, setMaterialError] = useState('');
  const [savingMaterial, setSavingMaterial] = useState(false);

  // Eliminar proyecto
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const reloadProject = useCallback(() => {
    return api<Project>(`/projects/${id}/`).then(setProject);
  }, [id]);

  useEffect(() => {
    Promise.all([
      api<Project>(`/projects/${id}/`),
      api<Task[]>(`/projects/tasks/?project=${id}`),
      api<ProjectMaterial[]>(`/projects/materials/?project=${id}`),
      api<Quote[]>(`/quotes/?project=${id}`),
      api<Option[]>('/auth/members/'),
    ])
      .then(([p, t, m, q, u]) => {
        setProject(p);
        setTasks(t);
        setUsedMaterials(m);
        setQuotes(q);
        setMembers(u);
      })
      // Un proyecto de otro taller responde 404: se ve igual que uno inexistente
      .catch(() => setNotFound(true));
  }, [id]);

  // ---- Tareas ----

  const openNewTask = () => {
    setEditingTask(null);
    setTaskForm(emptyTask);
    setTaskError('');
    setTaskModal(true);
  };

  const openTask = (task: Task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description ?? '',
      status: task.status,
      priority: task.priority,
      assigneeId: task.assigneeId ? String(task.assigneeId) : '',
      dueDate: task.dueDate ?? '',
    });
    setTaskError('');
    setTaskModal(true);
  };

  const saveTask = async () => {
    if (!taskForm.title.trim()) {
      setTaskError('Escribe un título.');
      return;
    }
    setSavingTask(true);
    setTaskError('');
    const payload = {
      projectId: Number(id),
      title: taskForm.title.trim(),
      description: taskForm.description,
      status: taskForm.status,
      priority: taskForm.priority || 'medium',
      assigneeId: taskForm.assigneeId ? Number(taskForm.assigneeId) : null,
      dueDate: taskForm.dueDate || null,
    };
    try {
      if (editingTask) {
        const updated = await api<Task>(`/projects/tasks/${editingTask.id}/`, {
          method: 'PATCH', body: JSON.stringify(payload),
        });
        setTasks(ts => ts.map(t => (t.id === updated.id ? updated : t)));
      } else {
        const created = await api<Task>('/projects/tasks/', {
          method: 'POST', body: JSON.stringify(payload),
        });
        setTasks(ts => [...ts, created]);
      }
      setTaskModal(false);
      reloadProject();
    } catch (err) {
      setTaskError(apiErrorMessage(err, 'No se pudo guardar la tarea.'));
    } finally {
      setSavingTask(false);
    }
  };

  const deleteTask = async () => {
    if (!editingTask) return;
    setSavingTask(true);
    try {
      await api(`/projects/tasks/${editingTask.id}/`, { method: 'DELETE' });
      setTasks(ts => ts.filter(t => t.id !== editingTask.id));
      setTaskModal(false);
      reloadProject();
    } catch (err) {
      setTaskError(apiErrorMessage(err, 'No se pudo eliminar la tarea.'));
    } finally {
      setSavingTask(false);
    }
  };

  const moveTask = async (task: Task, status: TaskStatus) => {
    setActionError('');
    const previous = tasks;
    setTasks(ts => ts.map(t => (t.id === task.id ? { ...t, status } : t))); // optimista
    try {
      await api(`/projects/tasks/${task.id}/`, { method: 'PATCH', body: JSON.stringify({ status }) });
      reloadProject();
    } catch (err) {
      setTasks(previous);
      setActionError(apiErrorMessage(err, 'No se pudo mover la tarea.'));
    }
  };

  // ---- Materiales ----

  const openAddMaterial = async () => {
    setMaterialForm({ materialId: '', quantity: '' });
    setMaterialError('');
    setMaterialModal(true);
    try {
      setInventory(await api<Material[]>('/inventory/materials/'));
    } catch {
      setMaterialError('No se pudo cargar el inventario.');
    }
  };

  const addMaterial = async () => {
    setSavingMaterial(true);
    setMaterialError('');
    try {
      const created = await api<ProjectMaterial>('/projects/materials/', {
        method: 'POST',
        body: JSON.stringify({
          projectId: Number(id),
          materialId: Number(materialForm.materialId),
          quantity: Number(materialForm.quantity),
        }),
      });
      setUsedMaterials(ms => [...ms, created]);
      setMaterialModal(false);
      reloadProject();
    } catch (err) {
      setMaterialError(apiErrorMessage(err, 'No se pudo agregar el material.'));
    } finally {
      setSavingMaterial(false);
    }
  };

  const removeMaterial = async (m: ProjectMaterial) => {
    setActionError('');
    try {
      await api(`/projects/materials/${m.id}/`, { method: 'DELETE' });
      setUsedMaterials(ms => ms.filter(x => x.id !== m.id));
      reloadProject();
    } catch (err) {
      setActionError(apiErrorMessage(err, 'No se pudo quitar el material.'));
    }
  };

  // ---- Proyecto ----

  const changeStatus = async (status: ProjectStatus) => {
    setActionError('');
    try {
      setProject(await api<Project>(`/projects/${id}/`, { method: 'PATCH', body: JSON.stringify({ status }) }));
    } catch (err) {
      setActionError(apiErrorMessage(err, 'No se pudo cambiar el estado.'));
    }
  };

  const deleteProject = async () => {
    setDeleting(true);
    try {
      await api(`/projects/${id}/`, { method: 'DELETE' });
      navigate('/projects', { replace: true });
    } catch (err) {
      setActionError(apiErrorMessage(err, 'No se pudo eliminar el proyecto.'));
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  if (notFound) {
    return (
      <div className="bg-surface border border-border rounded-xl p-10 text-center">
        <p className="text-sm text-text font-medium mb-1">Proyecto no encontrado</p>
        <p className="text-xs text-muted mb-5">No existe o no pertenece a tu taller.</p>
        <Button variant="secondary" size="sm" onClick={() => navigate('/projects')}>Volver a proyectos</Button>
      </div>
    );
  }

  if (!project) {
    return <p className="text-sm text-muted">Cargando proyecto…</p>;
  }

  const remaining = project.budget - project.spent;
  const executed = project.budget > 0 ? Math.round((project.spent / project.budget) * 100) : 0;
  const selectedMaterial = inventory.find(m => String(m.id) === materialForm.materialId);

  const tabs = [
    { id: 'summary', label: 'Resumen', icon: <ClipboardList size={14} /> },
    { id: 'tasks', label: 'Tareas', icon: <ListTodo size={14} />, badge: tasks.length },
    { id: 'materials', label: 'Materiales', icon: <Package size={14} />, badge: usedMaterials.length },
    { id: 'costs', label: 'Costos', icon: <DollarSign size={14} /> },
    { id: 'quote', label: 'Cotizaciones', icon: <FileText size={14} />, badge: quotes.length },
  ];

  const costRows = [
    { label: 'Materiales', value: project.materialsCost, color: 'bg-primary' },
    { label: 'Mano de obra', value: project.laborCost, color: 'bg-accent' },
    { label: 'Otros', value: project.otherCost, color: 'bg-info' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate('/projects')}
          className="p-2 rounded-lg hover:bg-surface border border-transparent hover:border-border text-muted hover:text-text transition-all mt-0.5"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <h2 className="text-xl font-bold text-text">{project.name}</h2>
            <Badge variant={statusVariant[project.status]} dot>{statusLabel[project.status]}</Badge>
            <Badge variant={priorityVariant[project.priority]}>{priorityLabel[project.priority]}</Badge>
          </div>
          <p className="text-sm text-muted">
            {project.clientName}{project.responsible && ` · ${project.responsible}`}
          </p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <select
              value={project.status}
              onChange={e => changeStatus(e.target.value as ProjectStatus)}
              className="hidden md:block bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-text outline-none focus:border-primary cursor-pointer"
            >
              {Object.entries(statusLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <Button variant="secondary" size="sm" icon={<Edit2 size={14} />} onClick={() => navigate(`/projects/${id}/edit`)}>
              Editar
            </Button>
            {canDelete && (
              <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={() => setDeleteOpen(true)}>
                <span className="hidden sm:inline">Eliminar</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {actionError && <p className="text-sm text-danger">{actionError}</p>}

      {/* Progress bar */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-text">
            Progreso general
            <span className="text-xs text-muted font-normal ml-2">{project.doneTasks} de {project.taskCount} tareas listas</span>
          </span>
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
            <span>Inicio: <span className="text-text font-medium">{formatDate(project.startDate, 'long')}</span></span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted">
            <Calendar size={13} />
            <span>Entrega: <span className="text-text font-medium">{formatDate(project.dueDate, 'long')}</span></span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted">
            <User size={13} />
            <span>Responsable: <span className="text-text font-medium">{project.responsible || 'Sin asignar'}</span></span>
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
                  <p className="text-sm text-text leading-relaxed whitespace-pre-line">
                    {project.description || <span className="text-muted">Sin descripción.</span>}
                  </p>
                </div>
                {project.tags.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Etiquetas</h3>
                    <div className="flex gap-2 flex-wrap">
                      {project.tags.map(tag => <Badge key={tag} variant="primary">#{tag}</Badge>)}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Presupuesto', value: money(project.budget) },
                    { label: 'Gastado', value: money(project.spent) },
                    { label: 'Disponible', value: money(remaining), danger: remaining < 0 },
                    { label: '% Ejecutado', value: `${executed}%`, danger: executed > 100 },
                  ].map(s => (
                    <div key={s.label} className="bg-panel rounded-lg p-4">
                      <p className="text-xs text-muted mb-1">{s.label}</p>
                      <p className={`text-lg font-bold font-mono ${s.danger ? 'text-danger' : 'text-text'}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            );

            if (active === 'tasks') return (
              <div className="p-5">
                <div className="flex items-center justify-between mb-1 gap-3">
                  <p className="text-xs text-muted">
                    {canEdit ? 'Arrastra las tarjetas entre columnas para cambiar su estado. Haz clic para editar.' : 'Haz clic en una tarea para ver el detalle.'}
                  </p>
                  {canEdit && (
                    <Button variant="outline" size="sm" icon={<Plus size={14} />} onClick={openNewTask}>
                      Nueva tarea
                    </Button>
                  )}
                </div>
                <KanbanBoard tasks={tasks} canEdit={canEdit} onMove={moveTask} onOpen={openTask} />
              </div>
            );

            if (active === 'materials') return (
              <div className="p-5">
                <div className="flex items-center justify-between mb-4 gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-text">Materiales del proyecto</h3>
                    <p className="text-xs text-muted mt-0.5">Al agregar un material se descuenta del inventario; al quitarlo se regresa.</p>
                  </div>
                  {canEdit && (
                    <Button variant="outline" size="sm" icon={<Plus size={14} />} onClick={openAddMaterial}>Agregar</Button>
                  )}
                </div>
                {usedMaterials.length === 0 ? (
                  <p className="text-sm text-muted py-8 text-center">Este proyecto todavía no usa materiales del inventario.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          {['Material', 'Cantidad', 'Costo unit.', 'Subtotal', ''].map(h => (
                            <th key={h} className="text-left text-xs font-semibold text-muted uppercase tracking-wider pb-3 pr-4">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {usedMaterials.map(m => (
                          <tr key={m.id} className="hover:bg-panel/30 transition-colors">
                            <td className="py-3 pr-4">
                              <p className="text-sm text-text">{m.materialName}</p>
                              <p className="text-xs text-muted">{m.category}</p>
                            </td>
                            <td className="py-3 pr-4 text-sm font-mono text-muted whitespace-nowrap">{m.quantity} {m.unit}</td>
                            <td className="py-3 pr-4 text-sm font-mono text-muted">{money(m.unitCost)}</td>
                            <td className="py-3 pr-4 text-sm font-mono text-text">{money(m.subtotal)}</td>
                            <td className="py-3 text-right">
                              {canEdit && (
                                <button
                                  onClick={() => removeMaterial(m)}
                                  title="Quitar y regresar al inventario"
                                  className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-border">
                          <td colSpan={3} className="pt-3 text-sm font-semibold text-text">Total materiales</td>
                          <td className="pt-3 text-sm font-mono font-bold text-primary">{money(project.materialsCost)}</td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            );

            if (active === 'costs') return (
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {costRows.map(c => (
                    <div key={c.label} className="bg-panel rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`w-2 h-2 rounded-full ${c.color}`} />
                        <span className="text-xs font-medium text-muted">{c.label}</span>
                      </div>
                      <p className="text-2xl font-bold font-mono text-text">{money(c.value)}</p>
                      <p className="text-xs text-muted mt-1">
                        {project.spent > 0 ? Math.round((c.value / project.spent) * 100) : 0}% del gasto total
                      </p>
                    </div>
                  ))}
                </div>
                <div className="bg-panel rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-text">Ejecución presupuestal</span>
                    <span className="text-sm font-mono text-text">{money(project.spent)} / {money(project.budget)}</span>
                  </div>
                  <div className="h-3 bg-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${executed > 100 ? 'bg-danger' : 'bg-gradient-to-r from-primary to-accent'}`}
                      style={{ width: `${Math.min(executed, 100)}%` }}
                    />
                  </div>
                  {executed > 100 && (
                    <p className="text-xs text-danger mt-2">El gasto supera el presupuesto por {money(-remaining)}.</p>
                  )}
                </div>
                {canEdit && (
                  <p className="text-xs text-muted">
                    Mano de obra y otros gastos se editan en <button className="text-primary hover:underline" onClick={() => navigate(`/projects/${id}/edit`)}>Editar proyecto</button>.
                  </p>
                )}
              </div>
            );

            if (active === 'quote') return (
              <div className="p-5">
                <div className="flex items-center justify-between mb-4 gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-text">Cotizaciones del proyecto</h3>
                    <p className="text-xs text-muted mt-0.5">Cotizaciones ligadas a este proyecto</p>
                  </div>
                  {canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Plus size={14} />}
                      onClick={() => navigate(
                        `/quotes?project=${project.id}&client=${project.clientId}&projectName=${encodeURIComponent(project.name)}`,
                      )}
                    >
                      Nueva cotización
                    </Button>
                  )}
                </div>
                {quotes.length === 0 ? (
                  <p className="text-sm text-muted py-8 text-center">No hay cotizaciones para este proyecto.</p>
                ) : (
                  <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
                    {quotes.map(q => (
                      <button
                        key={q.id}
                        onClick={() => navigate('/quotes')}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-panel/50 transition-colors text-left"
                      >
                        <div>
                          <p className="text-sm font-mono font-semibold text-text">{q.number}</p>
                          <p className="text-xs text-muted">{formatDate(q.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant={quoteStatusVariant[q.status]} dot>{quoteStatusLabel[q.status]}</Badge>
                          <span className="text-sm font-mono font-bold text-primary">{money(q.total)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );

            return null;
          }}
        </Tabs>
      </div>

      {/* Modal: tarea */}
      <Modal
        open={taskModal}
        onClose={() => setTaskModal(false)}
        title={editingTask ? (canEdit ? 'Editar tarea' : 'Tarea') : 'Nueva tarea'}
        footer={canEdit ? (
          <>
            {editingTask && (
              <Button variant="danger" onClick={deleteTask} disabled={savingTask} className="mr-auto" icon={<Trash2 size={14} />}>
                Eliminar
              </Button>
            )}
            <Button variant="secondary" onClick={() => setTaskModal(false)}>Cancelar</Button>
            <Button onClick={saveTask} loading={savingTask}>Guardar</Button>
          </>
        ) : undefined}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Título"
            value={taskForm.title}
            onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
            className="sm:col-span-2"
            disabled={!canEdit}
            required
          />
          <Textarea
            label="Descripción"
            value={taskForm.description}
            onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))}
            className="sm:col-span-2"
            disabled={!canEdit}
          />
          <Select
            label="Estado"
            value={taskForm.status}
            onChange={e => setTaskForm(f => ({ ...f, status: e.target.value as TaskStatus }))}
            options={Object.entries(taskStatusLabel).map(([value, label]) => ({ value, label }))}
            disabled={!canEdit}
          />
          <Select
            label="Prioridad"
            value={taskForm.priority}
            onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value as Priority }))}
            options={Object.entries(priorityLabel).map(([value, label]) => ({ value, label }))}
            disabled={!canEdit}
          />
          <Select
            label="Asignada a"
            value={taskForm.assigneeId}
            onChange={e => setTaskForm(f => ({ ...f, assigneeId: e.target.value }))}
            placeholder="Sin asignar"
            options={members.map(u => ({ value: String(u.id), label: u.name }))}
            disabled={!canEdit}
          />
          <Input
            label="Fecha límite"
            type="date"
            value={taskForm.dueDate}
            onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))}
            disabled={!canEdit}
          />
        </div>
        {taskError && <p className="text-sm text-danger mt-4">{taskError}</p>}
      </Modal>

      {/* Modal: agregar material */}
      <Modal
        open={materialModal}
        onClose={() => setMaterialModal(false)}
        title="Agregar material del inventario"
        footer={
          <>
            <Button variant="secondary" onClick={() => setMaterialModal(false)}>Cancelar</Button>
            <Button
              onClick={addMaterial}
              loading={savingMaterial}
              disabled={!materialForm.materialId || !(Number(materialForm.quantity) > 0)}
            >
              Agregar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Material"
            value={materialForm.materialId}
            onChange={e => setMaterialForm(f => ({ ...f, materialId: e.target.value }))}
            placeholder="Seleccionar material"
            options={inventory
              .filter(m => m.quantity > 0)
              .map(m => ({ value: String(m.id), label: `${m.name} — ${m.quantity} ${m.unit} disponibles` }))}
          />
          <Input
            label="Cantidad a usar"
            type="number"
            min="0.01"
            step="0.01"
            max={selectedMaterial?.quantity}
            value={materialForm.quantity}
            onChange={e => setMaterialForm(f => ({ ...f, quantity: e.target.value }))}
            hint={selectedMaterial
              ? `Costo: ${money(selectedMaterial.unitCost)} por ${selectedMaterial.unit} · Subtotal ${money(selectedMaterial.unitCost * Number(materialForm.quantity || 0))}`
              : undefined}
          />
          {materialError && <p className="text-sm text-danger">{materialError}</p>}
        </div>
      </Modal>

      {/* Modal: eliminar proyecto */}
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Eliminar proyecto"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="danger" onClick={deleteProject} loading={deleting}>Eliminar</Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          Se eliminará <span className="text-text font-medium">{project.name}</span> con sus tareas.
          Los materiales ya usados no regresan al inventario. Esta acción no se puede deshacer.
        </p>
      </Modal>
    </div>
  );
}
