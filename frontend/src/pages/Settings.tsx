import { useState } from 'react';
import { Save, Shield, User as UserIcon, Building2, Plus, Trash2 } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Tabs from '../components/ui/Tabs';
import { Input, Select, Textarea } from '../components/ui/Input';
import { users as initialUsers } from '../data/mockData';
import type { User } from '../types';

const tabs = [
  { id: 'workshop', label: 'Taller', icon: <Building2 size={14} /> },
  { id: 'users', label: 'Usuarios y Roles', icon: <UserIcon size={14} /> },
  { id: 'prefs', label: 'Preferencias', icon: <Shield size={14} /> },
];

const roleLabel: Record<string, string> = { admin: 'Administrador', maker: 'Maker', viewer: 'Visualizador' };
const roleVariant: Record<string, 'danger' | 'primary' | 'muted'> = { admin: 'danger', maker: 'primary', viewer: 'muted' };

function WorkshopTab() {
  const [form, setForm] = useState({
    name: 'CosplayCraft Studio', owner: 'Valeria Ortega', email: 'contacto@cosplaycrafthub.com',
    phone: '+52 55 9999-0000', city: 'Ciudad de México', address: 'Av. Insurgentes Sur 1234, Col. del Valle',
    bio: 'Taller especializado en cosplay profesional. Más de 5 años creando armaduras, trajes y props para convenciones y coleccionistas.',
    currency: 'MXN', taxRate: '16',
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));
  const [saved, setSaved] = useState(false);
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div className="space-y-6 p-5">
      <div>
        <h3 className="text-sm font-semibold text-text mb-4">Perfil del taller</h3>
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
            options={[{ value: 'MXN', label: 'MXN – Peso Mexicano' }, { value: 'USD', label: 'USD – Dólar' }, { value: 'COP', label: 'COP – Peso Colombiano' }]}
          />
          <Input label="Tasa de IVA (%)" type="number" value={form.taxRate} onChange={set('taxRate')} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={save} icon={<Save size={15} />}>
          {saved ? '¡Guardado!' : 'Guardar cambios'}
        </Button>
      </div>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [modalOpen, setModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'maker' });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setNewUser(u => ({ ...u, [k]: e.target.value }));

  const addUser = () => {
    setUsers(us => [...us, { id: `u${Date.now()}`, ...newUser, role: newUser.role as 'admin' | 'maker' | 'viewer', active: true }]);
    setNewUser({ name: '', email: '', role: 'maker' });
    setModalOpen(false);
  };

  const toggleUser = (id: string) => {
    setUsers(us => us.map(u => u.id === id ? { ...u, active: !u.active } : u));
  };

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text">Equipo del taller</h3>
          <p className="text-xs text-muted mt-0.5">{users.filter(u => u.active).length} usuarios activos</p>
        </div>
        <Button onClick={() => setModalOpen(true)} icon={<Plus size={15} />} size="sm">Invitar usuario</Button>
      </div>

      <div className="space-y-2">
        {users.map(u => (
          <div key={u.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${u.active ? 'bg-panel border-border' : 'bg-panel/30 border-border/50 opacity-60'}`}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-text">{u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-text">{u.name}</p>
                <Badge variant={roleVariant[u.role]}>{roleLabel[u.role]}</Badge>
              </div>
              <p className="text-xs text-muted">{u.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleUser(u.id)}
                className="text-xs px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-primary/40 text-muted hover:text-text transition-all"
              >
                {u.active ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Role guide */}
      <div className="bg-panel rounded-xl p-4 border border-border mt-4">
        <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Descripción de roles</h4>
        <div className="space-y-2">
          {[
            { role: 'admin', desc: 'Acceso completo: gestión de usuarios, configuración y todos los módulos.' },
            { role: 'maker', desc: 'Puede crear y editar proyectos, tareas, inventario y cotizaciones.' },
            { role: 'viewer', desc: 'Solo lectura. No puede crear ni modificar registros.' },
          ].map(r => (
            <div key={r.role} className="flex items-start gap-3">
              <Badge variant={roleVariant[r.role]}>{roleLabel[r.role]}</Badge>
              <p className="text-xs text-muted leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-bg/80 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative z-10 bg-surface border border-border rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-text">Invitar usuario</h2>
            <Input label="Nombre" value={newUser.name} onChange={set('name')} placeholder="Nombre completo" required />
            <Input label="Correo" type="email" value={newUser.email} onChange={set('email')} placeholder="correo@ejemplo.com" required />
            <Select
              label="Rol"
              value={newUser.role}
              onChange={set('role')}
              options={[{ value: 'admin', label: 'Administrador' }, { value: 'maker', label: 'Maker' }, { value: 'viewer', label: 'Visualizador' }]}
            />
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button onClick={addUser}>Invitar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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

export default function Settings() {
  return (
    <div className="max-w-3xl">
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <Tabs tabs={tabs}>
          {(active) => {
            if (active === 'workshop') return <WorkshopTab />;
            if (active === 'users') return <UsersTab />;
            if (active === 'prefs') return <PrefsTab />;
            return null;
          }}
        </Tabs>
      </div>
    </div>
  );
}
