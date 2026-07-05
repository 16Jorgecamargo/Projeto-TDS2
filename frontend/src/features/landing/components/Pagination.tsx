import type { JSX } from 'react';
import { Button } from '../../../components/ui/Button';
import { cn } from '../../../lib/utils';

interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, limit, total, onPageChange }: PaginationProps): JSX.Element | null {
  const totalPages = Math.ceil(total / limit);

  if (totalPages <= 1) {
    return null;
  }

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <nav aria-label="Paginação" className="flex items-center justify-center gap-2">
      <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Anterior
      </Button>
      <div className="hidden items-center gap-1 sm:flex">
        {pages.map((item) => (
          <button
            key={item}
            type="button"
            aria-current={item === page ? 'page' : undefined}
            onClick={() => onPageChange(item)}
            className={cn(
              'h-8 w-8 rounded-sm text-sm font-medium',
              item === page ? 'bg-primary text-bg' : 'text-ink hover:bg-surface',
            )}
          >
            {item}
          </button>
        ))}
      </div>
      <span className="text-sm text-muted sm:hidden">
        Página {page} de {totalPages}
      </span>
      <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        Próxima
      </Button>
    </nav>
  );
}
