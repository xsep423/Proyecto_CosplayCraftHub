import { useEffect, useState } from 'react';
import { Edit2 } from 'lucide-react';
import Button from '../ui/Button';
import MeasurementsGrid from './MeasurementsGrid';
import MeasurementsModal from './MeasurementsModal';
import { api } from '../../services/api';
import type { Client } from '../../types';

// Medidas del cliente dentro de un proyecto: se leen y editan en la ficha del cliente
export default function ClientMeasurementsPanel({ clientId, canEdit }: { clientId: number; canEdit: boolean }) {
  const [client, setClient] = useState<Client | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Client | null>(null);

  useEffect(() => {
    let cancel = false;
    api<Client>(`/clientes/${clientId}/`)
      .then(c => { if (!cancel) setClient(c); })
      .catch(() => { if (!cancel) setError('No se pudieron cargar las medidas del cliente.'); });
    return () => { cancel = true; };
  }, [clientId]);

  if (error) return <p className="p-5 text-sm text-danger">{error}</p>;
  if (!client) return <p className="p-5 text-sm text-muted">Cargando medidas...</p>;

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-text">Medidas de {client.name}</h3>
          <p className="text-xs text-muted mt-0.5">
            {client.measurementsUpdatedAt
              ? `Actualizadas el ${new Date(client.measurementsUpdatedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}. Son las mismas en todos sus proyectos.`
              : 'Se guardan en la ficha del cliente y se reutilizan en todos sus proyectos.'}
          </p>
        </div>
        {canEdit && (
          <Button variant="outline" size="sm" icon={<Edit2 size={14} />} onClick={() => setEditing(client)}>
            Editar
          </Button>
        )}
      </div>
      <MeasurementsGrid measurements={client.measurements ?? {}} />
      {client.measurementNotes && (
        <div className="bg-panel rounded-lg p-3">
          <p className="text-xs text-muted mb-1">Notas de ajuste</p>
          <p className="text-sm text-text whitespace-pre-line">{client.measurementNotes}</p>
        </div>
      )}
      <MeasurementsModal client={editing} onClose={() => setEditing(null)} onSaved={setClient} />
    </div>
  );
}
