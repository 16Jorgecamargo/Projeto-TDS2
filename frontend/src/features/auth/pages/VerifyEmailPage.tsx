import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api';

export default function VerifyEmailPage() {
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
    <div className="mx-auto max-w-sm p-6 text-center">
      <h1 className="text-xl font-semibold">Verificacao de e-mail</h1>
      {!token ? <p>Abra o link enviado ao seu e-mail.</p> : null}
      {status === 'pending' ? <p>Confirmando...</p> : null}
      {status === 'done' ? <p className="text-green-600">E-mail confirmado!</p> : null}
      {status === 'error' ? <p className="text-red-600">Token invalido ou expirado.</p> : null}
      <Link to="/login" className="mt-4 inline-block text-slate-600 underline">Ir para o login</Link>
      {!token ? (
        <button
          type="button"
          onClick={handleSkip}
          disabled={skipping}
          className="mt-4 block w-full text-sm text-slate-500 underline disabled:opacity-50"
        >
          {skipping ? 'Ignorando...' : 'Ignorar por enquanto'}
        </button>
      ) : null}
    </div>
  );
}
