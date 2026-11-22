import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import Button from '../ui/Button';
import { apiRequest } from '../../services/api';

const COOLDOWN = 30;

/** Botón para volver a mandar el correo de confirmación (con espera entre envíos). */
export default function ResendVerification({ email, className = '' }: { email: string; className?: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(w => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const resend = async () => {
    if (!email) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const data = await apiRequest('/auth/verify-email/resend/', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setMessage(data.detail);
      setWait(COOLDOWN);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo reenviar el correo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        icon={<RefreshCw size={14} />}
        onClick={resend}
        loading={loading}
        disabled={!email || wait > 0}
      >
        {wait > 0 ? `Reenviar correo (${wait} s)` : 'Reenviar correo de confirmación'}
      </Button>
      {message && <p className="text-xs text-success text-center">{message}</p>}
      {error && <p className="text-xs text-danger text-center">{error}</p>}
    </div>
  );
}
