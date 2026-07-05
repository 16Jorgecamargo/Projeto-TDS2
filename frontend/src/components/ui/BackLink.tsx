import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export interface BackLinkProps {
  to?: string;
  label?: string;
}

export function BackLink({ to = '/', label = 'Voltar ao painel' }: BackLinkProps): JSX.Element {
  return (
    <Link to={to} className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
      <ArrowLeftIcon className="h-4 w-4" />
      {label}
    </Link>
  );
}

export default BackLink;
