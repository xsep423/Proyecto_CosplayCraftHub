import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Mail, MailCheck } from 'lucide-react';
import AuthShell from '../components/auth/AuthShell';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { apiRequest } from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentMessage, setSentMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/auth/password-reset/', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setSentMessage(data.detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el correo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="¿Olvidaste tu contraseña?">
      {sentMessage ? (
        <div className="text-center py-4">
          <MailCheck size={36} className="mx-auto text-success mb-3" />
          <p className="text-sm text-text">{sentMessage}</p>
          <p className="text-xs text-muted mt-2">Revisa también la carpeta de spam. El enlace caduca en 1 hora.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted mb-6">
            Escribe el correo de tu cuenta y te enviaremos un enlace para crear una contraseña nueva.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ejemplo@correo.com"
              icon={<Mail size={16} />}
              autoComplete="email"
              autoFocus
              required
            />
            {error && <p className="text-sm text-danger text-center">{error}</p>}
            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Enviar enlace
            </Button>
          </form>
        </>
      )}
      <Link
        to="/login"
        className="mt-6 flex items-center justify-center gap-1.5 text-sm text-primary hover:text-primary-hover transition-colors"
      >
        <ArrowLeft size={14} /> Volver a iniciar sesión
      </Link>
    </AuthShell>
  );
}
