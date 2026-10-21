import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Wand2, Store, MapPin, User, Mail, Lock } from 'lucide-react';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { saveSession, type Session } from '../lib/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

type FieldErrors = Partial<Record<'workshopName' | 'city' | 'ownerName' | 'email' | 'password', string>>;

/** Alta de un nuevo taller (tenant) y su usuario administrador. */
export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ workshopName: '', city: '', ownerName: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setError('');

    if (form.password !== form.confirm) {
      setErrors({ password: 'Las contraseñas no coinciden.' });
      return;
    }

    setLoading(true);
    try {
      const { confirm: _confirm, ...payload } = form;
      const res = await fetch(`${API_URL}/auth/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const fieldErrors: FieldErrors = {};
        for (const [k, v] of Object.entries(data)) {
          if (k in form && Array.isArray(v)) fieldErrors[k as keyof FieldErrors] = String(v[0]);
        }
        setErrors(fieldErrors);
        const general = data.detail || data.non_field_errors?.[0];
        if (general) setError(general);
        else if (!Object.keys(fieldErrors).length) setError('No se pudo registrar el taller.');
        return;
      }

      saveSession(data as Session);
      navigate('/dashboard', { replace: true });
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 shadow-2xl shadow-primary/30">
            <Wand2 size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-text">Registra tu taller</h1>
          <p className="text-sm text-muted mt-1">Tu espacio de trabajo es privado: nadie más ve tus datos</p>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-3">Taller</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Nombre del taller"
                  value={form.workshopName}
                  onChange={set('workshopName')}
                  placeholder="Ej: Forja Cosplay"
                  icon={<Store size={16} />}
                  error={errors.workshopName}
                  required
                />
                <Input
                  label="Ciudad"
                  value={form.city}
                  onChange={set('city')}
                  placeholder="Tijuana"
                  icon={<MapPin size={16} />}
                  error={errors.city}
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-3">Administrador</p>
              <div className="space-y-4">
                <Input
                  label="Tu nombre"
                  value={form.ownerName}
                  onChange={set('ownerName')}
                  placeholder="Nombre y apellido"
                  icon={<User size={16} />}
                  error={errors.ownerName}
                  required
                />
                <Input
                  label="Correo electrónico"
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  placeholder="tu@correo.com"
                  icon={<Mail size={16} />}
                  error={errors.email}
                  required
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Contraseña"
                    type="password"
                    value={form.password}
                    onChange={set('password')}
                    placeholder="Mínimo 8 caracteres"
                    icon={<Lock size={16} />}
                    error={errors.password}
                    required
                  />
                  <Input
                    label="Confirmar"
                    type="password"
                    value={form.confirm}
                    onChange={set('confirm')}
                    placeholder="Repite la contraseña"
                    icon={<Lock size={16} />}
                    required
                  />
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-danger text-center">{error}</p>}

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Crear taller
            </Button>
          </form>

          <p className="text-center text-sm text-muted mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-primary hover:text-primary-hover font-medium">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
