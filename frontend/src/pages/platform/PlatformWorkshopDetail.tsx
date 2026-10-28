import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Power, KeyRound, Mail, MapPin, Phone, CalendarDays } from 'lucide-react';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { api } from '../../services/api';
import { apiErrorMessage, formatDate, money } from '../../lib/projectLabels';
import type { PlatformMember, PlatformWorkshopDetail } from '../../types';

const roleLabel: Record<string, string> = { admin: 'Administrador', maker: 'Maker', viewer: 'Visualizador' };
const roleVariant: Record<string, 'danger' | 'primary' | 'muted'> = { admin: 'danger', maker: 'primary', viewer: 'muted' };

export default function PlatformWorkshopDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [w, setW] = useState<PlatformWorkshopDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

  const [toggleOpen, setToggleOpen] = useState(false);
  const [toggling, setToggling] = useState(false);

  const [resetTarget, setResetTarget] = useState<PlatformMember | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetting, setResetting] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    api<PlatformWorkshopDetail>(`/platform/workshops/${id}/`)
      .then(setW)
      .catch(() => setNotFound(true));
  }, [id]);

  const toggleActive = async () => {
    if (!w) return;
    setToggling(true);
    setError('');
    try {
      setW(await api<PlatformWorkshopDetail>(`/platform/workshops/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !w.isActive }),
      }));
      setToggleOpen(false);
    } catch (err) {
      setError(apiErrorMessage(err, 'No se pudo cambiar el estado del taller.'));
      setToggleOpen(false);
    } finally {
      setToggling(false);
    }
  };

  const resetPassword = async () => {
    if (!resetTarget) return;
    setResetting(true);
    setResetError('');
    try {
      await api(`/platform/workshops/${id}/members/${resetTarget.id}/password/`, {
        method: 'POST',
        body: JSON.stringify({ password: newPassword }),
      });
      setNotice(`Contraseña de ${resetTarget.name} restablecida. Compártela en privado.`);
      setResetTarget(null);
      setNewPassword('');
    } catch (err) {
      setResetError(apiErrorMessage(err, 'No se pudo restablecer la contraseña.'));
    } finally {
      setResetting(false);
    }
  };

  if (notFound) {
    return (
      <div className="bg-surface border border-border rounded-xl p-10 text-center">
        <p className="text-sm text-text font-medium mb-4">Taller no encontrado.</p>
        <Button variant="secondary" size="sm" onClick={() => navigate('/platform/workshops')}>Volver a talleres</Button>
      </div>
    );
  }
  if (!w) return <p className="text-sm text-muted">Cargando taller…</p>;

  const stats = [
    { label: 'Usuarios', value: w.users },
    { label: 'Clientes', value: w.clients },
    { label: 'Proyectos', value: w.projects },
    { label: 'En proceso', value: w.activeProjects },
    { label: 'Cotizaciones', value: w.quotes },
    { label: 'Cotizado ganado', value: `${money(w.wonQuotesTotal)} ${w.currency}` },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate('/platform/workshops')}
          className="p-2 rounded-lg hover:bg-surface border border-transparent hover:border-border text-muted hover:text-text transition-all mt-0.5"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <h2 className="text-xl font-bold text-text">{w.name}</h2>
            <Badge variant={w.isActive ? 'success' : 'muted'} dot>{w.isActive ? 'Activo' : 'Desactivado'}</Badge>
          </div>
          <p className="text-sm text-muted">Folios de cotización: <span className="font-mono">{w.quotePrefix}-…</span> · id {w.id}</p>
        </div>
        <Button
          variant={w.isActive ? 'danger' : 'primary'}
          size="sm"
          icon={<Power size={14} />}
          onClick={() => setToggleOpen(true)}
        >
          {w.isActive ? 'Desactivar' : 'Activar'}
        </Button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {notice && <p className="text-sm text-success">{notice}</p>}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Datos del taller</h3>
          {[
            { icon: Mail, value: w.email },
            { icon: Phone, value: w.phone },
            { icon: MapPin, value: [w.address, w.city].filter(Boolean).join(', ') },
            { icon: CalendarDays, value: `Alta: ${formatDate(w.createdAt, 'long')}` },
          ].map(({ icon: Icon, value }, i) => (
            <div key={i} className="flex items-center gap-2.5 text-sm">
              <Icon size={14} className="text-muted flex-shrink-0" />
              <span className={value ? 'text-text' : 'text-muted'}>{value || 'Sin dato'}</span>
            </div>
          ))}
          <p className="text-xs text-muted pt-2 border-t border-border">Responsable: <span className="text-text">{w.owner || '—'}</span></p>
        </div>

        <div className="xl:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {stats.map(s => (
            <div key={s.label} className="bg-surface border border-border rounded-xl p-4">
              <p className="text-xs text-muted mb-1">{s.label}</p>
              <p className="text-xl font-bold font-mono text-text">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-text">Usuarios del taller</h3>
          <p className="text-xs text-muted mt-0.5">Para dar de alta o cambiar el rol de alguien, lo hace el administrador del taller desde su Configuración.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['Usuario', 'Rol', 'Estado', 'Último acceso', ''].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-5 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {w.members.map(m => (
                <tr key={m.id}>
                  <td className="px-5 py-3.5">
                    <p className="text-sm text-text">{m.name}</p>
                    <p className="text-xs text-muted">{m.email}</p>
                  </td>
                  <td className="px-5 py-3.5"><Badge variant={roleVariant[m.role] ?? 'muted'}>{roleLabel[m.role] ?? m.role}</Badge></td>
                  <td className="px-5 py-3.5 text-sm text-muted">{m.active ? 'Activo' : 'Inactivo'}</td>
                  <td className="px-5 py-3.5 text-xs font-mono text-muted whitespace-nowrap">
                    {m.lastLogin ? formatDate(m.lastLogin) : 'Nunca'}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<KeyRound size={14} />}
                      onClick={() => { setResetTarget(m); setNewPassword(''); setResetError(''); setNotice(''); }}
                    >
                      Restablecer contraseña
                    </Button>
                  </td>
                </tr>
              ))}
              {w.members.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-muted">Este taller no tiene usuarios.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={toggleOpen}
        onClose={() => setToggleOpen(false)}
        title={w.isActive ? 'Desactivar taller' : 'Activar taller'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setToggleOpen(false)}>Cancelar</Button>
            <Button variant={w.isActive ? 'danger' : 'primary'} onClick={toggleActive} loading={toggling}>
              {w.isActive ? 'Desactivar' : 'Activar'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          {w.isActive
            ? <>Los {w.users} usuarios de <span className="text-text font-medium">{w.name}</span> ya no podrán iniciar sesión ni usar la API. Sus datos no se borran y el taller se puede volver a activar.</>
            : <>Los usuarios de <span className="text-text font-medium">{w.name}</span> podrán volver a entrar con sus datos intactos.</>}
        </p>
      </Modal>

      <Modal
        open={Boolean(resetTarget)}
        onClose={() => setResetTarget(null)}
        title="Restablecer contraseña"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetTarget(null)}>Cancelar</Button>
            <Button onClick={resetPassword} loading={resetting} disabled={newPassword.length < 8}>Guardar</Button>
          </>
        }
      >
        <p className="text-sm text-muted mb-4">
          Nueva contraseña para <span className="text-text font-medium">{resetTarget?.name}</span> ({resetTarget?.email}).
        </p>
        <Input
          label="Nueva contraseña"
          type="password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          hint="Mínimo 8 caracteres; no puede ser muy común ni parecida al correo."
        />
        {resetError && <p className="text-sm text-danger mt-3">{resetError}</p>}
      </Modal>
    </div>
  );
}
