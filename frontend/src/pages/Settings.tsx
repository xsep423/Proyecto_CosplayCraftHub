import { useEffect, useState } from 'react';
import { Save, Shield, User as UserIcon, Building2, UserPlus, Globe, Copy, ExternalLink, Check, Wand2 } from 'lucide-react';
import Modal from '../components/ui/Modal';
import { apiErrorMessage } from '../lib/projectLabels';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Tabs from '../components/ui/Tabs';
import { Input, Select, Textarea } from '../components/ui/Input';
import ImagePicker from '../components/media/ImagePicker';
import { getRole, getCurrentUser, updateSessionWorkshop, type Role } from '../lib/auth';
import { api, apiUpload } from '../services/api';
import { imageForm } from '../lib/images';
import type { ImageRef } from '../types';

const allTabs: { id: string; label: string; icon: React.ReactNode; roles: Role[] }[] = [
  { id: 'workshop', label: 'Taller', icon: <Building2 size={14} />, roles: ['admin', 'maker', 'viewer'] },
  { id: 'users', label: 'Usuarios y Roles', icon: <UserIcon size={14} />, roles: ['admin'] },
  { id: 'prefs', label: 'Preferencias', icon: <Shield size={14} />, roles: ['admin', 'maker', 'viewer'] },
];

const roleLabel: Record<string, string> = { admin: 'Administrador', maker: 'Maker', viewer: 'Visualizador' };
const roleVariant: Record<string, 'danger' | 'primary' | 'muted'> = { admin: 'danger', maker: 'primary', viewer: 'muted' };

/* ───────────────────────── Taller ───────────────────────── */

type WorkshopForm = {
  name: string; owner: string; email: string; phone: string; city: string;
  address: string; bio: string; currency: string; taxRate: string;
  portfolioEnabled: boolean; slug: string; logo: ImageRef | null;
};

const emptyWorkshop: WorkshopForm = {
  name: '', owner: '', email: '', phone: '', city: '',
  address: '', bio: '', currency: 'MXN', taxRate: '16',
  portfolioEnabled: false, slug: '', logo: null,
};

function PortfolioLink({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/p/${slug}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* el navegador no permite copiar: el enlace sigue visible */ }
  };
  return (
    <div className="flex items-center gap-2 bg-surface border border-border rounded-lg pl-3 pr-1 py-1">
      <span className="flex-1 text-xs font-mono text-text truncate">{url}</span>
      <button type="button" onClick={copy} title="Copiar enlace" className="p-1.5 rounded-md text-muted hover:text-text hover:bg-panel">
        {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
      </button>
      <a href={url} target="_blank" rel="noopener" title="Abrir" className="p-1.5 rounded-md text-muted hover:text-text hover:bg-panel">
        <ExternalLink size={14} />
      </a>
    </div>
  );
}

function WorkshopTab() {
  const [form, setForm] = useState<WorkshopForm>(emptyWorkshop);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const canEdit = getRole() === 'admin';

  useEffect(() => {
    api<WorkshopForm>('/auth/workshop/')
      .then(setForm)
      .catch(() => setError('No se pudo cargar la información.'))
      .finally(() => setLoading(false));
  }, []);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const data = await api<WorkshopForm>('/auth/workshop/', {
        method: 'PATCH',
        body: JSON.stringify(form),
      });
      setForm(data);
      updateSessionWorkshop({ name: data.name });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('No se pudieron guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="p-5 text-sm text-muted">Cargando...</p>;

   return (
    <div className="space-y-6 p-5">
      {!canEdit && (
        <p className="text-xs text-muted">
          Solo un administrador puede modificar la información del taller.
        </p>
      )}
      {!canEdit && !form.name && (
        <p className="text-xs text-muted">
          El administrador aún no ha completado la información del taller.
        </p>
      )}

      <fieldset disabled={!canEdit} className="space-y-6 min-w-0 border-0 p-0 m-0 disabled:opacity-80">
        <div>
          <h3 className="text-sm font-semibold text-text mb-4">Perfil del taller</h3>
          <div className="mb-5">
            <ImagePicker
              label="Logo"
              variant="logo"
              hint="Aparece en el menú, en las cotizaciones y en el portafolio. Mejor cuadrado y con fondo transparente (PNG)."
              image={form.logo}
              disabled={!canEdit}
              placeholder={<Wand2 size={22} className="text-muted" />}
              onSelect={async file => {
                const data = await apiUpload<WorkshopForm>('/auth/workshop/logo/', await imageForm(file));
                setForm(f => ({ ...f, logo: data.logo }));
                updateSessionWorkshop({ logo: data.logo });
              }}
              onRemove={async () => {
                const data = await api<WorkshopForm>('/auth/workshop/logo/', { method: 'DELETE' });
                setForm(f => ({ ...f, logo: data.logo }));
                updateSessionWorkshop({ logo: null });
              }}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Nombre del taller" value={form.name} onChange={set('name')} required />
            <Input label="Responsable / Propietario" value={form.owner} onChange={set('owner')} required />
            <Input label="Correo de contacto" type="email" value={form.email} onChange={set('email')} required />
            <Input label="Teléfono" value={form.phone} onChange={set('phone')} />
            <Input label="Ciudad" value={form.city} onChange={set('city')} />
            <Input label="Dirección" value={form.address} onChange={set('address')} />
            <Textarea
              label="Descripción del taller"
              value={form.bio}
              onChange={set('bio')}
              className="sm:col-span-2"
            />
          </div>
        </div>
        <div className="border-t border-border pt-5">
          <h3 className="text-sm font-semibold text-text mb-4">Configuración financiera</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Moneda"
              value={form.currency}
              onChange={set('currency')}
              options={[
                { value: 'MXN', label: 'MXN – Peso Mexicano' },
                { value: 'USD', label: 'USD – Dólar' },
                { value: 'COP', label: 'COP – Peso Colombiano' },
              ]}
            />
            <Input label="Tasa de IVA (%)" type="number" value={form.taxRate} onChange={set('taxRate')} />
          </div>
        </div>
        <div className="border-t border-border pt-5">
          <h3 className="text-sm font-semibold text-text mb-1 flex items-center gap-2">
            <Globe size={15} className="text-accent" /> Portafolio público
          </h3>
          <p className="text-xs text-muted mb-4">
            Una página sin inicio de sesión para compartir con clientes. Solo muestra los proyectos que marques
            como <span className="text-text">Públicos</span> y nunca muestra clientes, precios ni fotos de referencia.
          </p>
          <label className="flex items-center justify-between gap-4 p-4 bg-panel rounded-xl border border-border cursor-pointer">
            <div>
              <p className="text-sm font-medium text-text">Activar portafolio</p>
              <p className="text-xs text-muted mt-0.5">Se publica al guardar los cambios.</p>
            </div>
            <input
              type="checkbox"
              className="sr-only peer"
              checked={form.portfolioEnabled}
              onChange={e => setForm(f => ({ ...f, portfolioEnabled: e.target.checked }))}
            />
            <span
              aria-hidden
              className="w-10 h-6 rounded-full bg-border peer-checked:bg-primary transition-colors relative flex-shrink-0
                after:content-[''] after:absolute after:top-1 after:left-1 after:w-4 after:h-4 after:rounded-full after:bg-white
                after:transition-transform peer-checked:after:translate-x-4 peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50"
            />
          </label>
          {form.portfolioEnabled && form.slug && (
            <div className="mt-3">
              <PortfolioLink slug={form.slug} />
            </div>
          )}
        </div>
      </fieldset>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving} icon={<Save size={15} />}>
            {saved ? '¡Guardado!' : saving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      )}
    </div>
  );
}

/* ───────────────────── Usuarios y roles ───────────────────── */

type ApiUser = { id: number; name: string; email: string; role: Role; active: boolean };

function UsersTab() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const myId = String(getCurrentUser().id ?? '');
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'maker' });

  const createUser = async () => {
    setCreating(true);
    setCreateError('');
    try {
      const created = await api<ApiUser>('/auth/users/', { method: 'POST', body: JSON.stringify(newUser) });
      setUsers(us => [...us, created]);
      setCreateOpen(false);
      setNewUser({ name: '', email: '', password: '', role: 'maker' });
    } catch (e) {
      setCreateError(apiErrorMessage(e, 'No se pudo crear el usuario.'));
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    api<ApiUser[]>('/auth/users/')
      .then(setUsers)
      .catch(() => setError('No se pudo cargar la lista de usuarios.'))
      .finally(() => setLoading(false));
  }, []);

  const update = async (id: number, patch: { role?: Role; active?: boolean }) => {
    setError('');
    try {
      const updated = await api<ApiUser>(`/auth/users/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      setUsers(us => us.map(u => (u.id === id ? updated : u)));
    } catch (e) {
      setError((e as { detail?: string }).detail ?? 'No se pudo actualizar el usuario.');
    }
  };

  if (loading) return <p className="p-5 text-sm text-muted">Cargando...</p>;

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-text">Equipo del taller</h3>
          <p className="text-xs text-muted mt-0.5">
            {users.filter(u => u.active).length} activos de {users.length} usuarios
          </p>
        </div>
        <Button size="sm" variant="outline" icon={<UserPlus size={14} />} onClick={() => { setCreateError(''); setCreateOpen(true); }}>
          Nuevo usuario
        </Button>
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nuevo usuario del taller"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={createUser} loading={creating}>Crear</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Nombre" value={newUser.name} onChange={e => setNewUser(u => ({ ...u, name: e.target.value }))} required />
          <Input label="Correo" type="email" value={newUser.email} onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))} required />
          <Input label="Contraseña" type="password" value={newUser.password} hint="Mínimo 8 caracteres" onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))} required />
          <Select
            label="Rol"
            value={newUser.role}
            onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))}
            options={[
              { value: 'admin', label: 'Administrador' },
              { value: 'maker', label: 'Maker' },
              { value: 'viewer', label: 'Visualizador' },
            ]}
          />
        </div>
        {createError && <p className="text-sm text-danger mt-4">{createError}</p>}
      </Modal>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="space-y-2">
        {users.map(u => {
          const isMe = String(u.id) === myId;
          return (
            <div
              key={u.id}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                u.active ? 'bg-panel border-border' : 'bg-panel/30 border-border/50 opacity-60'
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-text">
                  {u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-text truncate">{u.name}</p>
                  {isMe && <Badge variant="muted">Tú</Badge>}
                </div>
                <p className="text-xs text-muted truncate">{u.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={u.role}
                  disabled={isMe}
                  onChange={e => update(u.id, { role: e.target.value as Role })}
                  className="text-xs px-2 py-1.5 rounded-lg bg-surface border border-border text-text disabled:opacity-50"
                >
                  <option value="admin">Administrador</option>
                  <option value="maker">Maker</option>
                  <option value="viewer">Visualizador</option>
                </select>
                <button
                  disabled={isMe}
                  onClick={() => update(u.id, { active: !u.active })}
                  className="text-xs px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-primary/40 text-muted hover:text-text transition-all disabled:opacity-50"
                >
                  {u.active ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Role guide */}
      <div className="bg-panel rounded-xl p-4 border border-border mt-4">
        <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Descripción de roles</h4>
        <div className="space-y-2">
          {[
            { role: 'admin', desc: 'Acceso completo: gestión de usuarios, configuración y todos los módulos.' },
            { role: 'maker', desc: 'Puede crear y editar proyectos, tareas, inventario, cotizaciones y los datos del taller.' },
            { role: 'viewer', desc: 'Solo lectura. No puede crear ni modificar registros.' },
          ].map(r => (
            <div key={r.role} className="flex items-start gap-3">
              <Badge variant={roleVariant[r.role]}>{roleLabel[r.role]}</Badge>
              <p className="text-xs text-muted leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── Preferencias ─────────────────────── */

function PrefsTab() {
  const [prefs, setPrefs] = useState({
    notifications: true, emailAlerts: true, lowStock: true,
    dueDateAlerts: '7', language: 'es', theme: 'dark',
  });

  return (
    <div className="p-5 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-text mb-4">Notificaciones</h3>
        <div className="space-y-3">
          {[
            { key: 'notifications', label: 'Notificaciones en la app', desc: 'Recibir alertas en el panel' },
            { key: 'emailAlerts', label: 'Alertas por correo', desc: 'Recibir resumen diario por email' },
            { key: 'lowStock', label: 'Alertas de stock bajo', desc: 'Notificar cuando los materiales estén por agotarse' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between p-4 bg-panel rounded-xl border border-border">
              <div>
                <p className="text-sm font-medium text-text">{label}</p>
                <p className="text-xs text-muted mt-0.5">{desc}</p>
              </div>
              <button
                onClick={() => setPrefs(p => ({ ...p, [key]: !p[key as keyof typeof p] }))}
                className={`w-10 h-6 rounded-full transition-colors duration-200 ${prefs[key as keyof typeof prefs] ? 'bg-primary' : 'bg-border'}`}
              >
                <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 mx-1 ${prefs[key as keyof typeof prefs] ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-border pt-5">
        <h3 className="text-sm font-semibold text-text mb-4">Idioma y región</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Idioma"
            value={prefs.language}
            onChange={e => setPrefs(p => ({ ...p, language: e.target.value }))}
            options={[{ value: 'es', label: 'Español' }, { value: 'en', label: 'English' }]}
          />
          <Input
            label="Días de alerta antes de entrega"
            type="number"
            value={prefs.dueDateAlerts}
            onChange={e => setPrefs(p => ({ ...p, dueDateAlerts: e.target.value }))}
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button icon={<Save size={15} />}>Guardar preferencias</Button>
      </div>
    </div>
  );
}

/* ───────────────────────── Pantalla ───────────────────────── */

export default function Settings() {
  const role = getRole();
  const tabs = allTabs
    .filter(t => t.roles.includes(role))
    .map(({ roles, ...tab }) => tab);

  return (
    <div className="max-w-3xl">
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <Tabs tabs={tabs}>
          {(active) => {
            if (active === 'workshop') return <WorkshopTab />;
            if (active === 'users' && role === 'admin') return <UsersTab />;
            if (active === 'prefs') return <PrefsTab />;
            return null;
          }}
        </Tabs>
      </div>
    </div>
  );
}
