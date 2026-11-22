import { measurementGroups, formatMeasurement } from '../../lib/measurements';
import type { Measurements } from '../../types';

// Vista de solo lectura; oculta los grupos sin ninguna medida
export default function MeasurementsGrid({ measurements }: { measurements: Measurements }) {
  const groups = measurementGroups
    .map(g => ({ ...g, items: g.items.filter(m => measurements[m.key] !== undefined) }))
    .filter(g => g.items.length > 0);

  if (groups.length === 0) {
    return <p className="text-sm text-muted">Todavía no hay medidas registradas.</p>;
  }

  return (
    <div className="space-y-4">
      {groups.map(group => (
        <div key={group.title}>
          <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">{group.title}</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {group.items.map(m => (
              <div key={m.key} className="bg-panel rounded-lg px-3 py-2">
                <p className="text-xs text-muted">{m.label}</p>
                <p className="text-sm font-bold font-mono text-text">{formatMeasurement(measurements[m.key], m.unit)}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
