import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';

export function NotFound(): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <EmptyState
        title="Página não encontrada"
        description="A página que você procura não existe ou foi movida."
        action={
          <Link to="/" className="text-sm text-primary underline">
            Voltar para o início
          </Link>
        }
      />
    </div>
  );
}
