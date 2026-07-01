import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../api';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<'idle' | 'pending' | 'done' | 'error'>('idle');
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

  return (
    <div className="mx-auto max-w-sm p-6 text-center">
      <h1 className="text-xl font-semibold">Verificacao de e-mail</h1>
      {!token ? <p>Abra o link enviado ao seu e-mail.</p> : null}
      {status === 'pending' ? <p>Confirmando...</p> : null}
      {status === 'done' ? <p className="text-green-600">E-mail confirmado!</p> : null}
      {status === 'error' ? <p className="text-red-600">Token invalido ou expirado.</p> : null}
      <Link to="/login" className="mt-4 inline-block text-slate-600 underline">Ir para o login</Link>
    </div>
  );
}
