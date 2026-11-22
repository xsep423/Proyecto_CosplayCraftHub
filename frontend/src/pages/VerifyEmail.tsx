import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { CheckCircle2, Loader2, Mail, XCircle } from 'lucide-react';
import AuthShell from '../components/auth/AuthShell';
import ResendVerification from '../components/auth/ResendVerification';
import { Input } from '../components/ui/Input';
import { apiRequest } from '../services/api';
import { saveSession, type Session } from '../lib/auth';

type State = 'checking' | 'verified' | 'already' | 'invalid';

/** Abre el enlace del correo de confirmación y deja la sesión iniciada. */
export default function VerifyEmail() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [state, setState] = useState<State>(token ? 'checking' : 'invalid');
  const [message, setMessage] = useState(token ? '' : 'El enlace está incompleto. Ábrelo completo desde tu correo.');
  const [email, setEmail] = useState('');
  const sent = useRef(false);

  useEffect(() => {
    // En desarrollo React monta dos veces; el enlace solo debe usarse una
    if (!token || sent.current) return;
    sent.current = true;
    apiRequest('/auth/verify-email/', { method: 'POST', body: JSON.stringify({ token }) })
      .then(data => {
        if (data.alreadyVerified) {
          setState('already');
          setMessage(data.detail);
          return;
        }
        saveSession(data as Session);
        setState('verified');
        setTimeout(() => navigate('/dashboard', { replace: true }), 2000);
      })
      .catch(e => {
        setState('invalid');
        setMessage(e instanceof Error ? e.message : 'No se pudo confirmar tu correo.');
      });
  }, [token, navigate]);

  return (
    <AuthShell title="Confirmación de correo">
      {state === 'checking' && (
        <div className="text-center py-6">
          <Loader2 size={32} className="mx-auto text-primary animate-spin mb-3" />
          <p className="text-sm text-muted">Confirmando tu correo...</p>
        </div>
      )}

      {state === 'verified' && (
        <div className="text-center py-4">
          <CheckCircle2 size={36} className="mx-auto text-success mb-3" />
          <p className="text-sm text-text font-medium">¡Listo! Tu correo quedó confirmado.</p>
          <p className="text-xs text-muted mt-2">Entrando a tu taller...</p>
        </div>
      )}

      {state === 'already' && (
        <div className="text-center py-4">
          <CheckCircle2 size={36} className="mx-auto text-success mb-3" />
          <p className="text-sm text-text">{message}</p>
          <Link to="/login" className="mt-6 inline-block text-sm text-primary hover:text-primary-hover font-medium">
            Ir a iniciar sesión
          </Link>
        </div>
      )}

      {state === 'invalid' && (
        <div className="space-y-4">
          <div className="text-center py-2">
            <XCircle size={36} className="mx-auto text-danger mb-3" />
            <p className="text-sm text-text">{message}</p>
          </div>
          <p className="text-xs text-muted">Escribe tu correo y te mandamos un enlace nuevo:</p>
          <Input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            icon={<Mail size={16} />}
            autoComplete="email"
          />
          <ResendVerification email={email.trim()} />
          <Link to="/login" className="block text-center text-sm text-primary hover:text-primary-hover">
            Volver a iniciar sesión
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
