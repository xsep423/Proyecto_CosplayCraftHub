import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { CheckCircle2, Lock } from 'lucide-react';
import AuthShell from '../components/auth/AuthShell';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { API_URL } from '../services/api';

type Errors = { password?: string; confirm?: string; general?: string };

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const uid = params.get('uid') || '';
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setErrors({ password: 'Usa al menos 8 caracteres.' });
    if (password !== confirm) return setErrors({ confirm: 'Las contraseñas no coinciden.' });

    setLoading(true);
    setErrors({});
    try {
      const res = await fetch(`${API_URL}/auth/password-reset/confirm/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors({
          password: data.password?.join(' '),
          general: data.non_field_errors?.[0] || data.detail || (data.password ? undefined : 'No se pudo cambiar la contraseña.'),
        });
        return;
      }
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch {
      setErrors({ general: 'No se pudo conectar con el servidor.' });
    } finally {
      setLoading(false);
    }
  };

  if (!uid || !token) {
    return (
      <AuthShell title="Enlace incompleto">
        <p className="text-sm text-muted">
          Abre el enlace completo que te llegó por correo o solicita uno nuevo.
        </p>
        <Link to="/forgot-password" className="mt-6 block text-center text-sm text-primary hover:text-primary-hover">
          Solicitar un enlace nuevo
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Crea una contraseña nueva">
      {done ? (
        <div className="text-center py-4">
          <CheckCircle2 size={36} className="mx-auto text-success mb-3" />
          <p className="text-sm text-text">Tu contraseña se actualizó.</p>
          <p className="text-xs text-muted mt-2">Te llevamos a iniciar sesión…</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <Input
            label="Contraseña nueva"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            icon={<Lock size={16} />}
            autoComplete="new-password"
            hint="Mínimo 8 caracteres. Evita contraseñas comunes o solo números."
            error={errors.password}
            autoFocus
            required
          />
          <Input
            label="Confirmar contraseña"
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            icon={<Lock size={16} />}
            autoComplete="new-password"
            error={errors.confirm}
            required
          />
          {errors.general && (
            <div className="text-sm text-danger text-center space-y-2">
              <p>{errors.general}</p>
              <Link to="/forgot-password" className="text-primary hover:text-primary-hover">
                Solicitar un enlace nuevo
              </Link>
            </div>
          )}
          <Button type="submit" className="w-full" size="lg" loading={loading}>
            Guardar contraseña
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
