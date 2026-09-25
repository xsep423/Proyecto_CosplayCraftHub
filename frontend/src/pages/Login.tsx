import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Wand2, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { apiRequest } from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
	  e.preventDefault();

	  setLoading(true);
	  setError('');

	try {
		const data = await apiRequest('/auth/login/', {
		  method: 'POST',
		  body: JSON.stringify({
			email,
			password,
		  }),
		});

		localStorage.setItem('access_token', data.access);
		localStorage.setItem('refresh_token', data.refresh);
		localStorage.setItem('user', JSON.stringify(data.user));

		navigate('/dashboard');

	} catch (error) {
		setError(
		  error instanceof Error
			? error.message
			: 'No se pudo iniciar sesión.'
		);
	} finally {
		setLoading(false);
	}
};

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/3 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 shadow-2xl shadow-primary/30">
            <Wand2 size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-text">CosplayCraft Hub</h1>
          <p className="text-sm text-muted mt-1">Gestión profesional de taller</p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-text mb-6">Iniciar sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ejemplo@correo.com"
              icon={<Mail size={16} />}
              required
            />

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted uppercase tracking-wider">
                Contraseña <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                  <Lock size={16} />
                </span>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-panel border border-border rounded-lg pl-9 pr-10 py-2 text-sm text-text placeholder-muted outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
                <input type="checkbox" className="accent-primary w-4 h-4 rounded" />
                Recordarme
              </label>
              <button type="button" className="text-sm text-primary hover:text-primary-hover transition-colors">
                ¿Olvidaste tu contraseña?
              </button>
            </div>
				
			{error && (
				<p className="text-sm text-danger text-center">
					{error}
				</p>
			)}

            <Button type="submit" className="w-full mt-2" size="lg" loading={loading}>
              Iniciar sesión
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted mt-6">
          © 2025 CosplayCraft Hub · Todos los derechos reservados
        </p>
      </div>
    </div>
  );
}
