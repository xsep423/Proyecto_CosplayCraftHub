import type { Priority, ProjectStatus, TaskStatus } from '../types';

type BadgeVariant = 'primary' | 'warning' | 'success' | 'muted' | 'danger' | 'info';

export const statusLabel: Record<ProjectStatus, string> = {
  planning: 'Planificación',
  in_progress: 'En Proceso',
  review: 'Revisión',
  completed: 'Completado',
  on_hold: 'En Pausa',
};

export const statusVariant: Record<ProjectStatus, BadgeVariant> = {
  planning: 'muted',
  in_progress: 'primary',
  review: 'warning',
  completed: 'success',
  on_hold: 'danger',
};

export const priorityLabel: Record<Priority, string> = {
  urgent: 'Urgente',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

export const priorityVariant: Record<Priority, BadgeVariant> = {
  urgent: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'muted',
};

export const taskStatusLabel: Record<TaskStatus, string> = {
  todo: 'Por Hacer',
  in_progress: 'En Proceso',
  review: 'Revisión',
  done: 'Listo',
};

// Las fechas vienen como 'YYYY-MM-DD'. Se parsean como fecha local para que
// no se recorran un día por la zona horaria.
export function parseDate(d: string): Date {
  const [y, m, day] = d.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, day);
}

export function formatDate(d: string, month: 'short' | 'long' = 'short'): string {
  return parseDate(d).toLocaleDateString('es-MX', { day: '2-digit', month, year: 'numeric' });
}

export function daysUntil(d: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((parseDate(d).getTime() - today.getTime()) / 86400000);
}

export function money(n: number): string {
  return `$${n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/** Convierte el error de DRF ({campo: ['msg']} o {detail}) en un texto legible. */
export function apiErrorMessage(err: unknown, fallback = 'Ocurrió un error.'): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object') {
    const obj = err as Record<string, unknown>;
    if (typeof obj.detail === 'string') return obj.detail;
    const first = Object.values(obj)[0];
    if (Array.isArray(first) && typeof first[0] === 'string') return first[0];
    if (typeof first === 'string') return first;
  }
  return fallback;
}
