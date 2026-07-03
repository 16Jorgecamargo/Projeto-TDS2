import { useEffect, useRef, useState, type JSX } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

export default function VerifyEmailPage(): JSX.Element {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');
  const [status, setStatus] = useState<'idle' | 'pending' | 'done' | 'error'>('idle');
  const [skipping, setSkipping] = useState(false);
  const requestedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }
    if (requestedTokenRef.current === token) {
      return;
    }
    requestedTokenRef.current = token;
    setStatus('pending');
    authApi
      .verifyEmail(token)
      .then(() => setStatus('done'))
      .catch(() => setStatus('error'));
  }, [token]);

  async function handleSkip() {
    setSkipping(true);
    try {
      await authApi.skipEmailVerification();
      navigate('/');
    } finally {
      setSkipping(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm p-6">
      <Card className="text-center">
        <h1 className="text-xl font-semibold text-ink">Verificacao de e-mail</h1>
        {!token ? <p className="mt-4 text-sm text-ink">Abra o link enviado ao seu e-mail.</p> : null}
        {status === 'pending' ? <p className="mt-4 text-sm text-ink">Confirmando...</p> : null}
        {status === 'done' ? <p className="mt-4 text-sm text-primary">E-mail confirmado!</p> : null}
        {status === 'error' ? <p className="mt-4 text-sm text-accent">Token invalido ou expirado.</p> : null}
        <Link to="/login" className="mt-4 inline-block text-sm text-primary underline">Ir para o login</Link>
        {!token ? (
          <Button
            type="button"
            variant="ghost"
            onClick={handleSkip}
            disabled={skipping}
            className="mt-4 w-full"
          >
            {skipping ? 'Ignorando...' : 'Ignorar por enquanto'}
          </Button>
        ) : null}
      </Card>
    </div>
  );
}
