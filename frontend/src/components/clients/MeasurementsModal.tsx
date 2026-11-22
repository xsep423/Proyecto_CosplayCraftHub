import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Textarea } from '../ui/Input';
import { api } from '../../services/api';
import { apiErrorMessage } from '../../lib/projectLabels';
import { measurementGroups } from '../../lib/measurements';
import type { Client, MeasurementKey } from '../../types';

interface Props {
  client: Client | null;
  onClose: () => void;
  onSaved: (client: Client) => void;
}

type Draft = Partial<Record<MeasurementKey, string>>;

export default function MeasurementsModal({ client, onClose, onSaved }: Props) {
  const [draft, setDraft] = useState<Draft>({});
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!client) return;
    const next: Draft = {};
    for (const [k, v] of Object.entries(client.measurements ?? {})) next[k as MeasurementKey] = String(v);
    setDraft(next);
    setNotes(client.measurementNotes ?? '');
    setError('');
  }, [client]);

  const save = async () => {
    if (!client) return;
    const measurements: Record<string, number> = {};
    for (const [k, raw] of Object.entries(draft)) {
      const text = (raw ?? '').trim().replace(',', '.');
      if (!text) continue;
      const n = Number(text);
      if (!Number.isFinite(n) || n <= 0 || n > 300) {
        setError('Cada medida debe ser un número entre 1 y 300.');
        return;
      }
      measurements[k] = n;
    }
    setSaving(true);
    setError('');
    try {
      const updated = await api<Client>(`/clientes/${client.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ measurements, measurementNotes: notes }),
      });
      onSaved(updated);
      onClose();
    } catch (e) {
      setError(apiErrorMessage(e, 'No se pudieron guardar las medidas.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={!!client}
      onClose={onClose}
      title={client ? `Medidas de ${client.name}` : 'Medidas'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar medidas'}</Button>
        </>
      }
    >
      <div className="space-y-5">
        <p className="text-xs text-muted">
          En centímetros, salvo la talla de calzado. Deja vacío lo que no hayas medido.
          Estas medidas se muestran en todos los proyectos del cliente.
        </p>
        {measurementGroups.map(group => (
          <div key={group.title}>
            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">{group.title}</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {group.items.map(m => (
                <label key={m.key} className="flex flex-col gap-1">
                  <span className="text-xs text-muted">{m.label}</span>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={draft[m.key] ?? ''}
                      onChange={e => setDraft(d => ({ ...d, [m.key]: e.target.value }))}
                      placeholder="—"
                      className="w-full bg-panel border border-border rounded-lg pl-3 pr-10 py-2 text-sm text-text font-mono placeholder-muted outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">{m.unit}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}
        <Textarea
          label="Notas de ajuste"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Ej. prefiere el corsé holgado, usa plataformas de 5 cm..."
          rows={2}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    </Modal>
  );
}
