import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';

export function Forbidden(): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <EmptyState
        title="Acesso restrito"
        description="Você não tem permissão para acessar esta página."
        action={
          <Link to="/" className="text-sm text-primary underline">
            Voltar para o início
          </Link>
        }
      />
    </div>
  );
}
