import { useEffect, useRef, useState, type JSX, type ReactNode } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Loader2, Mail, XCircle } from 'lucide-react';
import { authApi } from '../api';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../../../components/ui/Button';
import { EmptyState, type EmptyStateVariant } from '../../../components/ui/EmptyState';
import { fadeVariants } from '../../../lib/motion';

type Status = 'idle' | 'pending' | 'done' | 'error';

interface StatusContent {
  icon: ReactNode;
  title: string;
  description?: string;
  variant: EmptyStateVariant;
}

const STATUS_CONTENT: Record<Status, StatusContent> = {
  idle: {
    icon: <Mail size={32} />,
    title: 'Verifique seu e-mail',
    description: 'Abra o link enviado ao seu e-mail para confirmar sua conta.',
    variant: 'empty',
  },
  pending: {
    icon: <Loader2 size={32} className="animate-spin" />,
    title: 'Confirmando...',
    variant: 'empty',
  },
  done: {
    icon: <CheckCircle2 size={32} />,
    title: 'E-mail confirmado!',
    variant: 'empty',
  },
  error: {
    icon: <XCircle size={32} />,
    title: 'Token inválido ou expirado.',
    variant: 'error',
  },
};

export default function VerifyEmailPage(): JSX.Element {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');
  const [status, setStatus] = useState<Status>('idle');
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

  const content = STATUS_CONTENT[status];

  return (
    <AuthLayout title="Verifique seu e-mail">
      <AnimatePresence mode="wait">
        <motion.div key={status} initial="hidden" animate="visible" exit="hidden" variants={fadeVariants}>
          <EmptyState variant={content.variant} icon={content.icon} title={content.title} description={content.description} />
        </motion.div>
      </AnimatePresence>
      <Button asChild variant="ghost" className="mt-4 w-full">
        <Link to="/login">Ir para o login</Link>
      </Button>
      {!token ? (
        <Button type="button" variant="ghost" onClick={handleSkip} disabled={skipping} className="mt-4 w-full">
          {skipping ? 'Ignorando...' : 'Ignorar por enquanto'}
        </Button>
      ) : null}
    </AuthLayout>
  );
}
