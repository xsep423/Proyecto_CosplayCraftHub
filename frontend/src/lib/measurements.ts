import type { MeasurementKey } from '../types';

export interface MeasurementDef {
  key: MeasurementKey;
  label: string;
  unit: string;
}

// Mismo orden y claves que MEDIDAS en backend/apps/clientes/models.py
export const measurementGroups: { title: string; items: MeasurementDef[] }[] = [
  {
    title: 'General',
    items: [
      { key: 'altura', label: 'Altura', unit: 'cm' },
      { key: 'cabeza', label: 'Contorno de cabeza', unit: 'cm' },
      { key: 'cuello', label: 'Cuello', unit: 'cm' },
      { key: 'calzado', label: 'Talla de calzado', unit: 'MX' },
    ],
  },
  {
    title: 'Torso',
    items: [
      { key: 'hombros', label: 'Ancho de hombros', unit: 'cm' },
      { key: 'busto', label: 'Busto / pecho', unit: 'cm' },
      { key: 'bajo_busto', label: 'Bajo busto', unit: 'cm' },
      { key: 'cintura', label: 'Cintura', unit: 'cm' },
      { key: 'cadera', label: 'Cadera', unit: 'cm' },
      { key: 'largo_espalda', label: 'Largo de espalda', unit: 'cm' },
    ],
  },
  {
    title: 'Brazos',
    items: [
      { key: 'largo_brazo', label: 'Largo de brazo', unit: 'cm' },
      { key: 'biceps', label: 'Contorno de bíceps', unit: 'cm' },
      { key: 'muneca', label: 'Muñeca', unit: 'cm' },
    ],
  },
  {
    title: 'Piernas',
    items: [
      { key: 'entrepierna', label: 'Entrepierna', unit: 'cm' },
      { key: 'muslo', label: 'Muslo', unit: 'cm' },
      { key: 'pantorrilla', label: 'Pantorrilla', unit: 'cm' },
    ],
  },
];

export const measurementCount = measurementGroups.reduce((n, g) => n + g.items.length, 0);

export function formatMeasurement(value: number | undefined, unit: string): string {
  if (value === undefined || value === null) return '—';
  const n = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return unit === 'MX' ? n : `${n} ${unit}`;
}
