import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Input } from '../ui/Input';
import { api } from '../../services/api';
import type { PlatformWorkshopDetail } from '../../types';

type Field = 'workshopName' | 'city' | 'ownerName' | 'email' | 'password';
const empty: Record<Field, string> = { workshopName: '', city: '', ownerName: '', email: '', password: '' };

/** Alta de un taller y su administrador desde la consola (el super admin no inicia sesión como él). */
export default function NewWorkshopModal({
  open, onClose, onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (w: PlatformWorkshopDetail) => void;
}) {
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (k: Field) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const close = () => {
    setForm(empty);
    setErrors({});
    setError('');
    onClose();
  };

  const save = async () => {
    setSaving(true);
    setErrors({});
    setError('');
    try {
      const created = await api<PlatformWorkshopDetail>('/platform/workshops/', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setForm(empty);
      onCreated(created);
    } catch (err) {
      const data = (err ?? {}) as Record<string, unknown>;
      const fieldErrors: Partial<Record<Field, string>> = {};
      for (const [k, v] of Object.entries(data)) {
        if (k in empty && Array.isArray(v)) fieldErrors[k as Field] = String(v[0]);
      }
      setErrors(fieldErrors);
      const general = typeof data.detail === 'string' ? data.detail : '';
      if (general) setError(general);
      else if (!Object.keys(fieldErrors).length) setError('No se pudo crear el taller.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Nuevo taller"
      footer={
        <>
          <Button variant="secondary" onClick={close}>Cancelar</Button>
          <Button onClick={save} loading={saving}>Crear taller</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Nombre del taller" value={form.workshopName} onChange={set('workshopName')} error={errors.workshopName} required />
        <Input label="Ciudad" value={form.city} onChange={set('city')} error={errors.city} />
        <Input label="Nombre del administrador" value={form.ownerName} onChange={set('ownerName')} error={errors.ownerName} required className="sm:col-span-2" />
        <Input label="Correo del administrador" type="email" value={form.email} onChange={set('email')} error={errors.email} required />
        <Input
          label="Contraseña inicial"
          type="password"
          value={form.password}
          onChange={set('password')}
          error={errors.password}
          hint="Mínimo 8 caracteres. Compártela en privado con el administrador."
          required
        />
      </div>
      {error && <p className="text-sm text-danger mt-4">{error}</p>}
    </Modal>
  );
}
